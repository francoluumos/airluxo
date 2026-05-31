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

async function stripe(path: string, params?: Record<string, string>) {
  const sk = Deno.env.get("STRIPE_SECRET_KEY");
  if (!sk) throw new Error("STRIPE_SECRET_KEY not configured");
  const r = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${sk}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params ? new URLSearchParams(params).toString() : undefined,
  });
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

    if (pi && status === "Confirmed" && b.payment_status === "authorized") {
      await stripe(`payment_intents/${pi}/capture`);
      payment_status = "captured";
    } else if (pi && (status === "Declined" || status === "Cancelled")) {
      if (b.payment_status === "authorized") {
        await stripe(`payment_intents/${pi}/cancel`);
        payment_status = "canceled";
      } else if (b.payment_status === "captured" || b.payment_status === "partially_refunded") {
        const totalCents = Math.round(Number(b.total_amount) * 100);
        const amt = refund_cents == null
          ? totalCents
          : Math.max(0, Math.min(totalCents, Math.round(Number(refund_cents))));
        if (amt > 0) {
          await stripe("refunds", {
            payment_intent: pi,
            amount: String(amt),
            reverse_transfer: "true",
            refund_application_fee: "true",
          });
          payment_status = amt >= totalCents ? "refunded" : "partially_refunded";
          refunded_amount = amt / 100;
        }
      }
    }

    const patch: Record<string, unknown> = { status, payment_status };
    if (refunded_amount != null) patch.refunded_amount = refunded_amount;
    await admin.from("bookings").update(patch).eq("id", booking_id);

    return json({ ok: true, status, payment_status, refunded_amount });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
