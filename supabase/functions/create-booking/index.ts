// AIRLUXO — create-booking
// The ONLY way a booking row is written. Runs under the service role and computes
// every money field server-side (shared pricing module), so the client can never set
// the price, the payment status, the partner, or the PaymentIntent link. When a charge
// ran, the supplied PaymentIntent is verified against Stripe (amount + listing + status)
// before the row is trusted. The client only supplies listing-facing + guest details.
// verify_jwt OFF — guests book without an account; we read the JWT ourselves if present.
//
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, STRIPE_SECRET_KEY
// Body: pricing inputs (listing_id, rate_id, quantity, cross_border, delivery, protection,
//        start_date, end_date, pickup_time, return_time, promo_code, redeem_points),
//       optional payment_intent_id, plus descriptive fields (guest_*, rate_label,
//       delivery_address, licence, licence_verified).
// Returns: { id } | { error }

import { createClient } from "jsr:@supabase/supabase-js@2";
import { computeQuote } from "../_shared/pricing.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function getAuthUser(req: Request): Promise<{ id: string; email: string } | null> {
  const authz = req.headers.get("Authorization") || "";
  if (!authz.toLowerCase().startsWith("bearer ")) return null;
  try {
    const c = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authz } },
    });
    const { data } = await c.auth.getUser();
    return data?.user ? { id: data.user.id, email: data.user.email || "" } : null;
  } catch {
    return null;
  }
}

async function retrievePI(id: string): Promise<any | null> {
  const sk = Deno.env.get("STRIPE_SECRET_KEY");
  if (!sk) return null;
  const r = await fetch(`https://api.stripe.com/v1/payment_intents/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${sk}` },
  });
  if (!r.ok) return null;
  return await r.json();
}

// Fire a server-to-server edge function with the service role (so booking-webhook etc.
// see a trusted caller). Best-effort — never blocks or fails the booking.
function fireInternal(fn: string, body: unknown) {
  const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/${fn}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: srk, Authorization: `Bearer ${srk}` },
    body: JSON.stringify(body),
  }).catch(() => {});
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const body = await req.json();
    if (!body?.listing_id) return json({ error: "listing_id required" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const authUser = await getAuthUser(req);

    // Authoritative amounts — same module that sized the PaymentIntent.
    const q = await computeQuote(admin, body, authUser);
    if ("unavailable" in q) return json({ error: q.error, unavailable: true }, 409);
    if ("error" in q) return json({ error: q.error }, q.status);

    // ---- payment linkage: trust the PaymentIntent only after verifying it ----
    let payment_status = "none";
    let stripe_payment_intent_id: string | null = null;
    const piId = typeof body.payment_intent_id === "string" ? body.payment_intent_id : null;
    if (piId) {
      if (!q.connected) return json({ error: "Payment not expected for this listing" }, 400);
      const pi = await retrievePI(piId);
      if (!pi || pi.error) return json({ error: "PaymentIntent not found" }, 400);
      const expectedCents = Math.round(q.finalTotal * 100);
      if (String(pi.metadata?.listing_id) !== String(body.listing_id)) return json({ error: "PaymentIntent does not match listing" }, 400);
      if (Number(pi.amount) !== expectedCents) return json({ error: "PaymentIntent amount mismatch" }, 400);
      if (pi.status !== "requires_capture") return json({ error: `PaymentIntent not authorized (${pi.status})` }, 400);
      // One PI → one booking. Reject reuse.
      const { data: dup } = await admin.from("bookings").select("id").eq("stripe_payment_intent_id", piId).maybeSingle();
      if (dup) return json({ error: "PaymentIntent already used" }, 409);
      payment_status = "authorized";
      stripe_payment_intent_id = piId;
    }

    // ---- build the row: server-computed money + whitelisted descriptive fields ----
    const str = (v: unknown) => (typeof v === "string" ? v.trim() : null);
    const bd = q.breakdown;
    const id = crypto.randomUUID();
    const row: Record<string, unknown> = {
      id,
      listing_id: body.listing_id,
      user_id: authUser?.id ?? null,            // from the JWT, never the client body
      guest_name: str(body.guest_name),
      guest_email: str(body.guest_email),
      guest_phone: str(body.guest_phone),
      start_date: str(body.start_date),
      end_date: str(body.end_date),
      pickup_time: str(body.pickup_time),
      return_time: str(body.return_time),
      rate_label: str(body.rate_label),
      quantity: Math.min(30, Math.max(1, Math.floor(Number(body.quantity) || 1))),
      cross_border: !!body.cross_border,
      delivery: !!body.delivery,
      delivery_address: body.delivery ? str(body.delivery_address) : null,
      protection: !!body.protection,
      licence_verified: !!body.licence_verified,
      licence: body.licence ?? null,
      // ---- authoritative money fields (server-computed) ----
      base_amount: bd.base_amount,
      addons_amount: bd.addons_amount,
      service_fee: bd.service_fee,
      total_amount: bd.total_amount,
      protection_fee: bd.protection_fee,
      deposit_amount: bd.deposit_amount,
      promo_code: bd.promo_code,
      discount_amount: bd.discount_amount,
      affiliate_commission: bd.affiliate_commission,
      points_redeemed: bd.points_redeemed,
      loyalty_credit: bd.loyalty_credit,
      stripe_payment_intent_id,
      payment_status,
      status: "Pending",
    };

    const { error } = await admin.from("bookings").insert(row);
    if (error) return json({ error: error.message }, 500);

    // Notifications, server-side (booking-webhook now requires a trusted caller).
    const sends = [
      fireInternal("booking-notify", { booking_id: id }),
      fireInternal("booking-confirm", { booking_id: id }),
      fireInternal("booking-webhook", { booking_id: id, event: "booking.created" }),
    ];
    // @ts-ignore — EdgeRuntime is provided by the Supabase runtime
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) EdgeRuntime.waitUntil(Promise.all(sends));

    return json({ id });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
