// AIRLUXO — authoritative booking pricing.
// Single source of truth for what a booking costs, used by BOTH stripe-create-payment
// (to size the PaymentIntent) and create-booking (to write the row). The client only
// chooses rate/quantity/add-ons/dates — never an amount — so prices, the AIRLUXO app
// fee, and the partner payout are computed here from the listing's own data and can't
// be tampered with. Keeping this in one place means the two callers can never drift.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

// Must mirror src/lib/data.js FEES
export const GUEST_SERVICE = 0.12;
// Per-plan host commission — must mirror src/lib/plans.js
export const COMMISSION: Record<string, number> = { free: 0.15, pro: 0.09, max: 0.03 };
// Loyalty points → CHF redemption rate — must mirror src/lib/loyalty.js POINTS_PER_CHF_REDEEMED
export const POINTS_REDEEM_RATE = 10;

// Loyalty "Keys" tier perks by completed-trip count. MUST mirror src/lib/loyalty.js TIERS.
export function tierPerks(trips: number) {
  if (trips >= 10) return { key: "noir", serviceWaived: true, freeProtection: true, freeDelivery: true };
  if (trips >= 5) return { key: "platinum", serviceWaived: false, freeProtection: true, freeDelivery: true };
  if (trips >= 2) return { key: "gold", serviceWaived: false, freeProtection: false, freeDelivery: true };
  return { key: "silver", serviceWaived: false, freeProtection: false, freeDelivery: false };
}

export type QuoteInput = {
  listing_id: string;
  rate_id?: string;
  quantity?: number;
  cross_border?: boolean;
  delivery?: boolean;
  protection?: boolean;
  start_date?: string;
  end_date?: string;
  pickup_time?: string;
  return_time?: string;
  promo_code?: string;
  redeem_points?: number;
};

export type QuoteResult =
  | { error: string; status: number }
  | { unavailable: true; error: string }
  | {
      ok: true;
      connected: boolean;
      listing: Record<string, any>;
      partner: Record<string, any> | null;
      finalTotal: number;
      appFee: number;
      partnerNet: number;
      breakdown: {
        base_amount: number; addons_amount: number; service_fee: number; total_amount: number;
        discount_amount: number; promo_code: string | null; affiliate_commission: number;
        protection_fee: number; deposit_amount: number;
        loyalty_credit: number; points_redeemed: number;
        tier: string | null; tier_comp: number;
      };
    };

// Recompute a booking quote from the listing's authoritative data. `authUser` (when
// signed in) unlocks tier comps + points redemption; pass null for guests.
export async function computeQuote(
  admin: SupabaseClient,
  input: QuoteInput,
  authUser: { id: string; email: string } | null,
): Promise<QuoteResult> {
  const { listing_id, rate_id, quantity, cross_border, delivery, protection,
    start_date, end_date, pickup_time, return_time, promo_code, redeem_points } = input;
  if (!listing_id) return { error: "listing_id required", status: 400 };

  const { data: listing } = await admin
    .from("listings")
    .select("partner_id, make, model, price_per_day, rate_tiers, cross_border_allowed, cross_border_fee, delivery_available, delivery_fee, protection_available, protection_fee, deposit_amount, location_id, status")
    .eq("id", listing_id).maybeSingle();
  if (!listing || listing.status === "Draft") return { error: "Listing not available", status: 404 };

  const { data: partner } = await admin
    .from("partners").select("stripe_account_id, stripe_charges_enabled, plan").eq("id", listing.partner_id).maybeSingle();
  // A booking can still be recorded without payment (partner not connected to Stripe,
  // or no platform Stripe key). We always compute the authoritative amounts; `connected`
  // tells the caller whether a charge is possible.
  const connected = !!(partner?.stripe_account_id && partner?.stripe_charges_enabled);

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
      const outside = (dateStr?: string | null, t?: string | null) => {
        if (!dateStr || !t) return false;
        const d = loc.opening_hours[DOW[new Date(`${dateStr}T00:00:00Z`).getUTCDay()]];
        if (!d) return false;
        if (d.closed) return true;
        return (d.open && t < d.open) || (d.close && t > d.close);
      };
      if (outside(start_date, pickup_time) || outside(end_date || start_date, return_time)) ahFee = Number(loc.after_hours_fee);
    }
  }

  // Damage protection — a partner-keeps pass-through, kept OUT of the subtotal so it
  // carries no guest service fee and no host commission: the partner receives 100%.
  const protFee = protection && listing.protection_available ? Number(listing.protection_fee || 0) : 0;

  const addons = cbFee + delFee + ahFee;
  const subtotal = base + addons;
  if (subtotal <= 0) return { error: "Invalid price", status: 400 };

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
    if (conflict) return { unavailable: true, error: "Those dates are no longer available." };
  }

  const service = Math.round(subtotal * GUEST_SERVICE);
  const total = subtotal + service + protFee;
  const hostRate = COMMISSION[partner?.plan as string] ?? COMMISSION.free;
  let partnerNet = (subtotal - Math.round(subtotal * hostRate)) + protFee;

  // ---- promo / referral code (authoritative): discount + affiliate commission ----
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

  // ---- member benefits (tier comps + points), all AIRLUXO-funded ----
  let tierComp = 0, tierKey: string | null = null, loyaltyCredit = 0, pointsRedeemed = 0;
  const aluxoMargin = Math.max(0, (total - discount) - partnerNet); // app fee before benefits
  if (authUser) {
    const { count } = await admin.from("bookings").select("id", { count: "exact", head: true })
      .eq("status", "Completed").or(`user_id.eq.${authUser.id},guest_email.ilike.${authUser.email}`);
    const perks = tierPerks(count ?? 0);
    tierKey = perks.key;
    let comp = 0;
    if (perks.serviceWaived) comp += service;
    if (perks.freeProtection) comp += protFee;
    if (perks.freeDelivery) comp += delFee;
    tierComp = Math.min(comp, aluxoMargin);

    const reqPoints = Math.max(0, Math.floor(Number(redeem_points) || 0));
    if (reqPoints > 0) {
      const { data: cust } = await admin.from("customers").select("loyalty_points").eq("id", authUser.id).maybeSingle();
      const bal = Math.max(0, Math.floor(Number(cust?.loyalty_points) || 0));
      const usable = Math.min(reqPoints, bal);
      const remaining = Math.max(0, aluxoMargin - tierComp); // points draw from what's left of the margin
      const credit = Math.min(Math.floor(usable / POINTS_REDEEM_RATE), remaining);
      if (credit > 0) { loyaltyCredit = credit; pointsRedeemed = credit * POINTS_REDEEM_RATE; }
    }
  }

  const finalTotal = total - discount - tierComp - loyaltyCredit;
  const appFee = finalTotal - partnerNet;

  return {
    ok: true,
    connected, listing, partner, finalTotal, appFee, partnerNet,
    breakdown: {
      base_amount: base, addons_amount: addons, service_fee: service, total_amount: finalTotal,
      discount_amount: discount, promo_code: appliedCode, affiliate_commission: commission,
      protection_fee: protFee, deposit_amount: protFee > 0 ? Number(listing.deposit_amount || 0) : 0,
      loyalty_credit: loyaltyCredit, points_redeemed: pointsRedeemed,
      tier: tierKey, tier_comp: tierComp,
    },
  };
}
