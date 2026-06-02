// AIRLUXO — loyalty + referral: single source of truth.
//
// All earn/burn/tier rules live here. SERVER-SIDE COPIES MUST MIRROR THIS FILE:
//   - the `award_loyalty_on_completion` DB trigger mirrors POINTS_PER_CHF
//   - any checkout redemption in `stripe-create-payment` mirrors the burn values
// (same pattern as src/lib/plans.js ↔ stripe-create-payment commission rates).
//
// Brand rule: present as membership / credits / access / upgrades — never "% off".

// Points earned per CHF of rental value (base + commissionable add-ons) on a
// COMPLETED trip. Service fee and the partner-keeps protection fee don't earn.
export const POINTS_PER_CHF = 5;

// Double-sided referral, in points. Referee credited on their first completed
// trip; referrer rewarded once that trip completes.
export const REFERRAL = {
  refereeCredit: 500,   // ~CHF 100-equiv at 5 pts/CHF — tune
  referrerReward: 1000,
};

// Roughly how many points equal CHF 1 of redemption value (for "credit" burns).
// Keep burn value ≤ earn value so the programme stays sustainable.
export const POINTS_PER_CHF_REDEEMED = 10; // 10 pts = CHF 1 off — tune

// Tiers — "Keys". Earned by number of COMPLETED trips (a trailing-12-month spend
// model can replace `minTrips` later). Ordered ascending; the active tier is the
// highest whose `minTrips` is met. Perks are data so the UI + future redemption
// read them from one place.
export const TIERS = [
  {
    id: 'silver', label: 'Silver Key', minTrips: 0,
    perks: ['Member rate on credits', 'Earn points on every trip'],
    freeProtection: false, freeDelivery: false, serviceFeeWaived: false, freeUpgrade: false, priorityAccess: false,
  },
  {
    id: 'gold', label: 'Gold Key', minTrips: 2,
    perks: ['Complimentary home delivery', 'Priority access to new cars'],
    freeProtection: false, freeDelivery: true, serviceFeeWaived: false, freeUpgrade: false, priorityAccess: true,
  },
  {
    id: 'platinum', label: 'Platinum Key', minTrips: 5,
    perks: ['Complimentary damage protection', 'Free delivery', 'Category upgrade when available'],
    freeProtection: true, freeDelivery: true, serviceFeeWaived: false, freeUpgrade: true, priorityAccess: true,
  },
  {
    id: 'noir', label: 'Noir Key', minTrips: 10,
    perks: ['Everything in Platinum', 'AIRLUXO service fee waived', 'Concierge experiences & partner perks'],
    freeProtection: true, freeDelivery: true, serviceFeeWaived: true, freeUpgrade: true, priorityAccess: true,
  },
];

// Points earned for a given rental value (CHF). Mirror in the DB trigger.
export function pointsForAmount(chf) {
  return Math.max(0, Math.round((Number(chf) || 0) * POINTS_PER_CHF));
}

// The active tier object for a number of completed trips.
export function tierForTrips(trips = 0) {
  const n = Number(trips) || 0;
  let active = TIERS[0];
  for (const t of TIERS) if (n >= t.minTrips) active = t;
  return active;
}

// The next tier up (or null at the top) + how many more trips to reach it.
export function nextTier(trips = 0) {
  const n = Number(trips) || 0;
  const next = TIERS.find((t) => t.minTrips > n);
  return next ? { tier: next, tripsAway: next.minTrips - n } : null;
}

// CHF value of a points balance, for showing "worth ~CHF X" in the UI.
export function pointsToChf(points) {
  return Math.floor((Number(points) || 0) / POINTS_PER_CHF_REDEEMED);
}
