// Partner subscription tiers — the single source of truth for pricing, car
// limits, and commission rates. The commission rate is ALSO mirrored server-side
// in supabase/functions/stripe-create-payment (keep them in sync).
export const PLANS = {
  free: {
    id: 'free', name: 'Free', price: 0, commission: 15, carLimit: 3, tagline: 'Get started',
    features: ['List up to 3 cars', 'AI studio thumbnails', 'Calendar sync (ICS)', 'Standard placement'],
  },
  pro: {
    id: 'pro', name: 'Pro', price: 49, commission: 9, carLimit: 25, tagline: 'For growing fleets', popular: true,
    features: ['List up to 25 cars', '9% commission', 'Priority placement', 'Performance analytics', 'Faster payouts'],
  },
  max: {
    id: 'max', name: 'Max', price: 199, commission: 3, carLimit: null, tagline: 'For large operators',
    features: ['Unlimited cars', '3% commission', 'Featured placement', 'Team members', 'API access', 'Dedicated support'],
  },
};

export const PLAN_ORDER = ['free', 'pro', 'max'];
export const PLAN_LIST = PLAN_ORDER.map((id) => PLANS[id]);

export const planOf = (plan) => PLANS[plan] || PLANS.free;
export const commissionRate = (plan) => planOf(plan).commission / 100; // 0.15 / 0.09 / 0.03
export const carLimit = (plan) => planOf(plan).carLimit;                // null = unlimited
