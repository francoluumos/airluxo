// AIRLUXO — stripe-capture
// Partner money moves on a booking, then update status. verify_jwt ON.
//   authorized  + Confirmed            -> capture (charge)
//   authorized  + Declined/Cancelled   -> cancel PI (release hold, no charge)
//   captured     + Declined/Cancelled   -> refund (full or partial, proportional
//                                          via reverse_transfer + refund_application_fee)
// Secret: STRIPE_SECRET_KEY
// Body: { booking_id, status, refund_cents? }  (refund_cents: amount to refund;
//        omit = full; 0 = keep everything / no refund)

import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function stripe(path: string, params?: Record<string, string>, idempotencyKey?: string) {
  const sk = Deno.env.get("STRIPE_SECRET_KEY");
  if (!sk) throw new Error("STRIPE_SECRET_KEY not configured");
  const headers: Record<string, string> = {
    Authorization: `Bearer ${sk}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  const r = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers,
    body: params ? new URLSearchParams(params).toString() : undefined,
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || `Stripe ${r.status}`);
  return data;
}

async function stripeGet(path: string) {
  const sk = Deno.env.get("STRIPE_SECRET_KEY");
  if (!sk) throw new Error("STRIPE_SECRET_KEY not configured");
  const r = await fetch(`https://api.stripe.com/v1/${path}`, { headers: { Authorization: `Bearer ${sk}` } });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || `Stripe ${r.status}`);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Not signed in" }, 401);

    const { booking_id, status, refund_cents } = await req.json();
    if (!booking_id || !status) return json({ error: "booking_id and status required" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: b } = await admin.from("bookings").select("*").eq("id", booking_id).maybeSingle();
    if (!b) return json({ error: "Booking not found" }, 404);
    if (b.partner_id !== user.id) return json({ error: "Not your booking" }, 403);

    let payment_status = b.payment_status;
    let refunded_amount = b.refunded_amount ?? null;
    const pi = b.stripe_payment_intent_id;

    // Reconcile against Stripe before moving money — never trust the DB row's
    // amount/status alone. The PI is the source of truth for what was authorized
    // and what was actually captured.
    const realPI = pi ? await stripeGet(`payment_intents/${pi}`) : null;

    if (pi && status === "Confirmed" && b.payment_status === "authorized") {
      if (realPI?.status !== "requires_capture") {
        return json({ error: `Cannot capture — PaymentIntent is ${realPI?.status}` }, 409);
      }
      await stripe(`payment_intents/${pi}/capture`, undefined, `capture:${booking_id}`);
      payment_status = "captured";
    } else if (pi && (status === "Declined" || status === "Cancelled")) {
      if (b.payment_status === "authorized") {
        if (realPI?.status === "requires_capture") {
          await stripe(`payment_intents/${pi}/cancel`, undefined, `cancel:${booking_id}`);
        }
        payment_status = "canceled";
      } else if (b.payment_status === "captured" || b.payment_status === "partially_refunded") {
        // Cap the refund at what Stripe actually captured, not the (untrusted) row total.
        const capturedCents = Number(realPI?.amount_received ?? 0) || Math.round(Number(b.total_amount) * 100);
        const alreadyRefunded = Math.round(Number(b.refunded_amount ?? 0) * 100);
        const refundable = Math.max(0, capturedCents - alreadyRefunded);
        const amt = refund_cents == null
          ? refundable
          : Math.max(0, Math.min(refundable, Math.round(Number(refund_cents))));
        if (amt > 0) {
          await stripe("refunds", {
            payment_intent: pi,
            amount: String(amt),
            reverse_transfer: "true",
            refund_application_fee: "true",
          }, `refund:${booking_id}:${alreadyRefunded + amt}`);
          const totalRefunded = alreadyRefunded + amt;
          payment_status = totalRefunded >= capturedCents ? "refunded" : "partially_refunded";
          refunded_amount = totalRefunded / 100;
        }
      }
    }

    const patch: Record<string, unknown> = { status, payment_status };
    if (refunded_amount != null) patch.refunded_amount = refunded_amount;
    await admin.from("bookings").update(patch).eq("id", booking_id);

    // On a successful capture (card actually charged), email the guest their
    // branded invoice/receipt. Fire-and-forget — never blocks or fails the capture.
    if (status === "Confirmed" && payment_status === "captured") {
      const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const send = fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/booking-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: srk, Authorization: `Bearer ${srk}` },
        body: JSON.stringify({ booking_id }),
      }).catch(() => {});
      // @ts-ignore — EdgeRuntime is provided by the Supabase runtime
      if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) EdgeRuntime.waitUntil(send);
      else await send;
    }

    return json({ ok: true, status, payment_status, refunded_amount });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
