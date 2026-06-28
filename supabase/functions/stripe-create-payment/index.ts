// AIRLUXO — stripe-create-payment
// Manual-capture PaymentIntent (authorize now, capture on confirm) as a Connect
// destination charge. Prices are recomputed SERVER-SIDE from the listing's own
// data — the client only chooses rate/quantity/add-ons, never the amount — so the
// charge and AIRLUXO's application fee can't be tampered with. verify_jwt OFF.
//
// Secret: STRIPE_SECRET_KEY
// Body: { listing_id, rate_id, quantity, cross_border, delivery, protection }
//   rate_id: "day" | "t<index>" (index into the listing's rate_tiers)
// Returns: { skip:true } | { clientSecret, paymentIntentId, breakdown }

import { createClient } from "jsr:@supabase/supabase-js@2";
import { computeQuote } from "../_shared/pricing.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function stripe(path: string, params: Record<string, string>) {
  const sk = Deno.env.get("STRIPE_SECRET_KEY");
  if (!sk) throw new Error("STRIPE_SECRET_KEY not configured");
  const r = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${sk}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || `Stripe ${r.status}`);
  return data;
}

// Resolve the signed-in customer from the request's Authorization header.
// verify_jwt is OFF (guests call this), so we read it ourselves; guests send the
// anon key as bearer → getUser returns no user → null.
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json();
    if (!body?.listing_id) return json({ error: "listing_id required" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const authUser = await getAuthUser(req);

    // Authoritative price — recomputed from the listing in the shared pricing module.
    const q = await computeQuote(admin, body, authUser);
    if ("unavailable" in q) return json({ error: q.error, unavailable: true });
    if ("error" in q) return json({ error: q.error }, q.status);
    // Partner not connected to Stripe → no charge possible; client books without payment.
    if (!q.connected || !q.partner) return json({ skip: true, reason: "partner_not_connected" });

    const pi = await stripe("payment_intents", {
      amount: String(Math.round(q.finalTotal * 100)),
      currency: "chf",
      capture_method: "manual",
      "automatic_payment_methods[enabled]": "true",
      application_fee_amount: String(Math.round(q.appFee * 100)),
      "transfer_data[destination]": q.partner.stripe_account_id,
      "metadata[listing_id]": String(body.listing_id),
      // Authoritative total, in cents — capture/create-booking reconcile against this.
      "metadata[total_cents]": String(Math.round(q.finalTotal * 100)),
      description: `AIRLUXO — ${q.listing.make} ${q.listing.model}`,
    });

    return json({
      clientSecret: pi.client_secret,
      paymentIntentId: pi.id,
      breakdown: q.breakdown,
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
