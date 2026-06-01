// AIRLUXO — stripe-create-payment
// Manual-capture PaymentIntent (authorize now, capture on confirm) as a Connect
// destination charge. Prices are recomputed SERVER-SIDE from the listing's own
// data — the client only chooses rate/quantity/add-ons, never the amount — so the
// charge and AIRLUXO's application fee can't be tampered with. verify_jwt OFF.
//
// Secret: STRIPE_SECRET_KEY
// Body: { listing_id, rate_id, quantity, cross_border, delivery }
//   rate_id: "day" | "t<index>" (index into the listing's rate_tiers)
// Returns: { skip:true } | { clientSecret, paymentIntentId, breakdown }

import { createClient } from "jsr:@supabase/supabase-js@2";

// Must mirror src/lib/data.js FEES
const GUEST_SERVICE = 0.12;
// Per-plan host commission — must mirror src/lib/plans.js
const COMMISSION: Record<string, number> = { free: 0.15, pro: 0.09, max: 0.03 };

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { listing_id, rate_id, quantity, cross_border, delivery, start_date, end_date, pickup_time, return_time, promo_code } = await req.json();
    if (!listing_id) return json({ error: "listing_id required" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: listing } = await admin
      .from("listings")
      .select("partner_id, make, model, price_per_day, rate_tiers, cross_border_allowed, cross_border_fee, delivery_available, delivery_fee, location_id, status")
      .eq("id", listing_id).maybeSingle();
    if (!listing || listing.status === "Draft") return json({ error: "Listing not available" }, 404);

    const { data: partner } = await admin
      .from("partners").select("stripe_account_id, stripe_charges_enabled, plan").eq("id", listing.partner_id).maybeSingle();
    if (!partner?.stripe_account_id || !partner.stripe_charges_enabled) {
      return json({ skip: true, reason: "partner_not_connected" });
    }

    // ---- authoritative price, from the listing ----
    const qty = Math.min(30, Math.max(1, Math.floor(Number(quantity) || 1)));
    let unit = Number(listing.price_per_day) || 0;
    if (rate_id && rate_id !== "day") {
      const idx = parseInt(String(rate_id).slice(1), 10);
      const tiers = Array.isArray(listing.rate_tiers) ? listing.rate_tiers : [];
      if (Number.isInteger(idx) && tiers[idx] && Number(tiers[idx].price) > 0) unit = Number(tiers[idx].price);
    }
    const base = unit * qty;
    const cbFee = cross_border && listing.cross_border_allowed ? Number(listing.cross_border_fee || 0) : 0;
    const delFee = delivery && listing.delivery_available ? Number(listing.delivery_fee || 0) : 0;

    // after-hours surcharge — authoritative, from the car's pick-up location
    let ahFee = 0;
    if (listing.location_id && (pickup_time || return_time)) {
      const { data: loc } = await admin
        .from("partner_locations").select("opening_hours, allow_after_hours, after_hours_fee").eq("id", listing.location_id).maybeSingle();
      if (loc?.allow_after_hours && loc.opening_hours && Number(loc.after_hours_fee) > 0) {
        const DOW = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
        const outside = (dateStr: string, t: string) => {
          if (!dateStr || !t) return false;
          const d = loc.opening_hours[DOW[new Date(`${dateStr}T00:00:00Z`).getUTCDay()]];
          if (!d) return false;
          if (d.closed) return true;
          return (d.open && t < d.open) || (d.close && t > d.close);
        };
        if (outside(start_date, pickup_time) || outside(end_date || start_date, return_time)) ahFee = Number(loc.after_hours_fee);
      }
    }

    const addons = cbFee + delFee + ahFee;
    const subtotal = base + addons;
    if (subtotal <= 0) return json({ error: "Invalid price" }, 400);

    // availability guard — refuse to take payment for taken dates
    if (start_date) {
      const nend = end_date || start_date;
      const overlaps = (s: string, e: string) => !(nend < s || start_date > (e || s));
      const [{ data: bk }, { data: bl }] = await Promise.all([
        admin.from("bookings").select("start_date, end_date, status").eq("listing_id", listing_id),
        admin.from("car_blocks").select("start_date, end_date").eq("listing_id", listing_id),
      ]);
      const conflict = (bk || []).some((b) => b.status !== "Declined" && b.status !== "Cancelled" && overlaps(b.start_date, b.end_date))
        || (bl || []).some((b) => overlaps(b.start_date, b.end_date));
      if (conflict) return json({ error: "Those dates are no longer available.", unavailable: true });
    }

    const service = Math.round(subtotal * GUEST_SERVICE);
    const total = subtotal + service;
    const hostRate = COMMISSION[partner.plan as string] ?? COMMISSION.free;
    let partnerNet = subtotal - Math.round(subtotal * hostRate);

    // ---- promo / referral code (authoritative): discount + affiliate commission ----
    // Discount validity (incl. max-uses) is computed by the validate_promo RPC; we
    // read the code row for funding + commission. Funding decides who absorbs it:
    //   platform → discount comes out of AIRLUXO's app fee (clamped to it)
    //   partner  → discount comes out of the partner payout (clamped to it)
    // Commission is recorded only (paid to the affiliate out of band).
    let discount = 0, commission = 0, appliedCode: string | null = null;
    const codeRaw = typeof promo_code === "string" ? promo_code.trim().toUpperCase() : "";
    if (codeRaw) {
      const { data: vp } = await admin.rpc("validate_promo", { p_code: codeRaw, p_subtotal: subtotal });
      const v = Array.isArray(vp) ? vp[0] : vp;
      if (v?.valid) {
        const { data: pc } = await admin
          .from("promo_codes").select("funded_by, commission_type, commission_value, commission_base").eq("code", codeRaw).maybeSingle();
        discount = Math.max(0, Math.round(Number(v.discount) || 0));
        appliedCode = codeRaw;
        if (pc && pc.commission_type !== "none") {
          const cbase = pc.commission_base === "total" ? total : subtotal;
          commission = pc.commission_type === "percent"
            ? Math.round(cbase * Number(pc.commission_value) / 100)
            : Math.round(Number(pc.commission_value));
        }
        if (pc?.funded_by === "partner") {
          discount = Math.min(discount, partnerNet);   // never push payout below 0
          partnerNet = partnerNet - discount;
        } else {
          discount = Math.min(discount, total - partnerNet); // never push app fee below 0
        }
      }
    }

    const finalTotal = total - discount;
    const appFee = finalTotal - partnerNet;

    const pi = await stripe("payment_intents", {
      amount: String(Math.round(finalTotal * 100)),
      currency: "chf",
      capture_method: "manual",
      "automatic_payment_methods[enabled]": "true",
      application_fee_amount: String(Math.round(appFee * 100)),
      "transfer_data[destination]": partner.stripe_account_id,
      "metadata[listing_id]": String(listing_id),
      description: `AIRLUXO — ${listing.make} ${listing.model}`,
    });

    return json({
      clientSecret: pi.client_secret,
      paymentIntentId: pi.id,
      breakdown: {
        base_amount: base, addons_amount: addons, service_fee: service, total_amount: finalTotal,
        discount_amount: discount, promo_code: appliedCode, affiliate_commission: commission,
      },
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
