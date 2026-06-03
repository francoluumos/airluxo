// AIRLUXO documentation + changelogs — three audiences:
//   partner  → the partner dashboard (linked from Settings, ?docs or ?docs=partner)
//   customer → the guest booking experience / public frontend (?docs=customer)
//   admin    → the founder/admin dashboard (?docs=admin)
//
// KEEP UPDATED WITH EVERY CHANGE: when a feature ships, extend the relevant doc's
// `sections` and PREPEND a `changelog` entry (absolute dates, YYYY-MM-DD). The
// admin doc also carries a `status` (live / beta / planned) — keep it current.

export const DOCS = {
  // ── Partner dashboard ────────────────────────────────────────────────────
  partner: {
    key: 'partner',
    label: 'Partner dashboard',
    eyebrow: 'Documentation',
    h1: 'Using your partner dashboard',
    intro: 'Everything you can do in the AIRLUXO partner dashboard, section by section. Kept up to date as features ship — see the changelog at the end.',
    sections: [
      {
        id: 'getting-started', title: 'Getting started',
        intro: 'AIRLUXO is a marketplace for luxury car rental companies in Switzerland. You list your cars, set your prices and rules; AIRLUXO brings vetted drivers, handles checkout and payouts, and takes a commission only when a car is booked.',
        items: [
          { h: 'Create a partner account', p: 'Sign up with your company name and city. Email confirmation is off, so you can start immediately.' },
          { h: 'Connect payouts (Stripe)', p: 'In Earnings, connect your Stripe account so guest payments can settle to your IBAN. Until connected, bookings still work but payment is skipped.' },
          { h: 'Add a pick-up location', p: 'Before listing cars, add at least one pick-up site under Location — you’ll assign each car to one.' },
        ],
      },
      {
        id: 'fleet', title: 'My fleet',
        intro: 'Where you list and manage your cars.',
        items: [
          { h: 'List a car (4 steps)', p: 'Photo → Identity → Specs → Pricing. Upload one photo first: AIRLUXO auto-generates a clean studio thumbnail and pre-fills make, model and colour from the image.' },
          { h: 'Pricing & terms', p: 'Daily rate, mileage/day, custom time slots, cross-border add-on, delivery & collection add-on, damage-protection (zero-excess) add-on, and the pick-up location for that car.' },
          { h: 'Edit & manage', p: 'The gear icon opens the editor. Change status, delete, or block the car for specific dates (maintenance, owner use) — blocked dates are unbookable and show in the calendar.' },
          { h: 'Import / export', p: 'Bulk-add cars from CSV/Excel with a template and validation preview. Export your fleet; re-importing with ids updates rather than duplicates.' },
        ],
      },
      {
        id: 'location', title: 'Location',
        intro: 'Manage the sites where guests collect and return cars — each with its own hours.',
        items: [
          { h: 'Multiple pick-up sites', p: 'Add as many locations as you operate, with Swiss address autocomplete plus per-site phone and email.' },
          { h: 'Opening hours (per site)', p: 'Set hours per weekday, or leave them off. Optionally allow after-hours handover with a surcharge.' },
        ],
      },
      {
        id: 'bookings', title: 'Bookings',
        intro: 'Every reservation, with its status and payment state.',
        items: [
          { h: 'Statuses', p: 'Pending → Confirmed → On trip → Completed, or Declined / Cancelled. Payment badges show authorized, captured, refunded, etc.' },
          { h: 'Driver verification (KYC)', p: 'Guests verify their licence at booking (phone scan with AI autofill). You see the verified details; licence images aren’t stored.' },
          { h: 'Confirm / decline / cancel', p: 'Confirming captures the authorised payment; declining/cancelling lets you choose a refund (full, partial, restocking fee, or none). Kept fees split proportionally with AIRLUXO.' },
        ],
      },
      {
        id: 'earnings', title: 'Earnings',
        intro: 'Your gross bookings, AIRLUXO commission and net payout, plus the 6-month payout trend.',
        items: [
          { h: 'Fees', p: 'Guests pay a 12% service fee on top of the subtotal. AIRLUXO withholds a host commission by plan (Free 15% / Pro 9% / Max 3%) from your payout.' },
          { h: 'Payouts', p: 'Settled to your connected Stripe account after the trip.' },
        ],
      },
      {
        id: 'settings', title: 'Settings',
        intro: 'Your profile and the integrations that connect AIRLUXO to your own tools.',
        items: [
          { h: 'Profile', p: 'Company details, login email, support & billing contacts, invoice email, VAT, structured company & billing addresses, and live Stripe payout status.' },
          { h: 'Webhook', p: 'POST every new/updated booking as signed JSON to a URL you control (with a test button).' },
          { h: 'Calendar subscription', p: 'A private ICS feed to subscribe to in Google / Apple / Outlook.' },
          { h: 'Embed', p: 'A copy-paste snippet to show your fleet and take bookings on your own site; bookings still settle through AIRLUXO.' },
          { h: 'Guide & changelog', p: 'This page — opens in a new tab.' },
        ],
      },
    ],
    changelog: [
      { date: '2026-06-01', version: 'Build 0.6', items: ['Booking no longer requires signing in first — guests book straight through, then are offered a one-tap account on the confirmation.'] },
      { date: '2026-06-01', version: 'Build 0.5', items: ['Subscription tiers wired to real mechanics: commission by plan (Free 15% / Pro 9% / Max 3%) + per-plan car limits enforced on new listings.'] },
      { date: '2026-06-01', version: 'Build 0.4', items: ['Promo & referral codes in the booking flow, attributed to a referrer with a commission; amounts recomputed server-side.'] },
      { date: '2026-05-30', version: 'Build 0.1', items: ['Stripe Connect payments (authorize → capture), licence KYC, availability calendar + blocking, AI studio thumbnails, locations with opening hours, CSV import/export, embeddable widget, partner guide.'] },
    ],
  },

  // ── Customer & frontend ──────────────────────────────────────────────────
  customer: {
    key: 'customer',
    label: 'Customer',
    eyebrow: 'Documentation',
    h1: 'The AIRLUXO booking experience',
    intro: 'How the public marketplace and guest booking flow work — browsing, booking, accounts and rewards. Kept up to date as features ship.',
    sections: [
      {
        id: 'marketplace', title: 'Marketplace',
        intro: 'The public homepage where guests discover cars.',
        items: [
          { h: 'Search & location', p: 'A free-text Swiss place search (“Where”) sorts the collection by proximity — nearest cars first.' },
          { h: 'Dates', p: 'A hero date picker with Exact (cars free for the whole stay) and Flexible (this weekend / next 7 / 30 / 90 days) modes.' },
          { h: 'Filters', p: 'Brand, colour, transmission, fuel, seats, power, max price, cross-border and delivery toggles.' },
          { h: 'Map', p: 'A map pins cars at their real pick-up coordinates.' },
        ],
      },
      {
        id: 'car-detail', title: 'Car detail',
        intro: 'The full page for a single car.',
        items: [
          { h: 'Media & specs', p: 'Studio photography (and a muted autoplay video when available), power / 0–100 / seats / gearbox, host info and rating.' },
          { h: 'Transparent pricing', p: 'An itemised breakdown — base × days, add-ons, the 12% service fee, any discount or member credit, and the total. You’re only charged when the host confirms.' },
        ],
      },
      {
        id: 'booking', title: 'Booking flow',
        intro: 'From choosing dates to a confirmed reservation.',
        items: [
          { h: 'Dates, times & add-ons', p: 'Pick dates/times (limited to the location’s opening hours), then optional add-ons: delivery & collection, cross-border, and damage protection (drops your excess to CHF 0 — no security deposit).' },
          { h: 'Licence verification (KYC)', p: 'Scan your driver’s licence with your phone (AI autofill) or hand off via QR; you review the details.' },
          { h: 'Payment', p: 'Your card is authorised at booking and only charged when the host confirms (Stripe). Test mode for now.' },
          { h: 'Book then account', p: 'No login required to book. After confirming, you’re offered a one-tap account (Google or email link) — the booking auto-links to it by email.' },
        ],
      },
      {
        id: 'account', title: 'Your account',
        intro: 'The customer profile (account menu, top-right).',
        items: [
          { h: 'My trips & Saved', p: 'Upcoming and past bookings, plus a wishlist of cars you hearted.' },
          { h: 'Licence on file', p: 'Add/replace your licence once; it prefills future bookings (and back-fills from a booking you made as a guest).' },
          { h: 'Membership (loyalty)', p: 'Earn points on completed trips, see your Key tier (Silver → Gold → Platinum → Noir) and progress, redeem points as credit at checkout, and invite friends with your referral code (you both earn points).' },
          { h: 'Settings & privacy', p: 'Personal info + saved address, newsletter toggle, cookie controls, and GDPR account deletion.' },
        ],
      },
      {
        id: 'embed', title: 'Partner embed',
        intro: 'Some partners show AIRLUXO on their own site — a chrome-less fleet + the full booking flow (light or dark). Bookings settle through AIRLUXO either way.',
        items: [],
      },
    ],
    changelog: [
      { date: '2026-06-02', version: 'Loyalty & referral', items: ['Membership tab: points on completed trips, Key tiers, redeem points as member credit at checkout, and a double-sided referral code.'] },
      { date: '2026-06-01', version: 'Zero-deposit protection', items: ['Damage-protection add-on at checkout — pay a per-trip fee to drop your excess to CHF 0 instead of a security deposit.'] },
      { date: '2026-06-01', version: 'Book-then-account', items: ['Book without signing in; create an account on the confirmation (Google or email link). Mobile input zoom fixed.'] },
      { date: '2026-06-01', version: 'Customer accounts', items: ['Accounts (Google or email magic-link), My trips, Saved cars, licence on file, profile, privacy controls.'] },
      { date: '2026-05-30', version: 'Marketplace', items: ['Swiss place search + proximity sort, exact/flexible date picker, advanced filters, real-coordinate map, per-listing video.'] },
    ],
  },

  // ── Admin / founder dashboard ────────────────────────────────────────────
  admin: {
    key: 'admin',
    label: 'Admin dashboard',
    eyebrow: 'Internal — founders only',
    h1: 'Running AIRLUXO (founder dashboard)',
    intro: 'The company-internal back office at admin.airluxo.ch. Access is gated server-side (app_admins + is_admin); the subdomain is not the security boundary.',
    status: [
      { label: 'Marketplace, car detail & booking', state: 'live' },
      { label: 'Stripe Connect payments (authorize → capture, refunds)', state: 'live' },
      { label: 'Customer accounts & profiles', state: 'live' },
      { label: 'Damage-protection add-on (zero excess)', state: 'live' },
      { label: 'Loyalty & referral (points, tiers, redemption)', state: 'live', note: 'on staging; awaiting test pass' },
      { label: 'Founder dashboard — Pipeline (prospect CRM)', state: 'live' },
      { label: 'Founder dashboard — Partners cockpit', state: 'live' },
      { label: 'Founder dashboard — Overview / Finance / Marketing', state: 'planned' },
      { label: 'admin.airluxo.ch subdomain', state: 'live' },
      { label: 'Exact per-booking commission/app-fee accounting', state: 'planned', note: 'financials are est. from the current plan rate for now' },
      { label: 'Separate staging Supabase project', state: 'deferred', note: 'no real prod data yet' },
      { label: 'Deposit pre-auth hold (Stage B)', state: 'deferred', note: 'shelved — 7-day Stripe hold expiry; protection add-on is the path' },
    ],
    sections: [
      {
        id: 'access', title: 'Access',
        intro: 'How to get in, and how it’s secured.',
        items: [
          { h: 'Where', p: 'admin.airluxo.ch (or ?admin on any host for testing). First the staging Basic-auth gate, then the Founder login (email + password).' },
          { h: 'Who', p: 'Admins are listed in the app_admins table and checked by is_admin() in every admin RPC / edge function. Add an admin by inserting their auth user id.' },
        ],
      },
      {
        id: 'pipeline', title: 'Pipeline (prospect CRM)',
        intro: 'Create a sales preview for a potential partner, build their fleet, share it, then claim it live.',
        items: [
          { h: 'New prospect', p: 'Creates a private preview workspace — no partner email needed (a placeholder partner account behind the scenes).' },
          { h: 'Build fleet', p: 'Opens the prospect’s real partner dashboard (magic link) so you upload their cars with the normal tooling. Their cars stay hidden from the public marketplace.' },
          { h: 'Preview', p: 'A token-gated storefront (?embed=<id>&preview=<token>) showing their fleet + the real booking flow, with a “Sales preview” banner.' },
          { h: 'Stages', p: 'Lead → Preview built → Shared → Negotiating → Won → Lost. Drag cards between columns (or via the card).' },
          { h: 'Go live', p: 'Claims the prospect into a real partner account — set their real email, their cars go live in the marketplace, and you get a password-setup link to send them.' },
        ],
      },
      {
        id: 'partners', title: 'Partners',
        intro: 'Every partner and prospect, with status and a full info sheet.',
        items: [
          { h: 'List, search & filter', p: 'Search by company / contact / email / phone; filter by status (Prospecting / Won / Lost / Archived).' },
          { h: 'Info sheet (click a row)', p: 'Plan, Stripe connection, joined + go-live dates, source; GMV, est. our earnings / partner net, discounts; bookings by status; top cars; pick-up locations; and a changelog-style timeline of stage moves + go-live.' },
          { h: 'Edit', p: 'Update company / contact / phone / email — the email maps to the contact (prospect) or the actual login email (live partner).' },
          { h: 'Archive & delete', p: 'Archive (reversible) hides a partner and their cars; delete is permanent and blocked if they have bookings (archive instead). Financial figures marked “est.” use the current plan rate until exact per-booking accounting lands.' },
        ],
      },
      {
        id: 'coming', title: 'Coming next',
        intro: 'Overview (platform KPIs), Customers, Finance (payouts / app-fee revenue / exports) and Marketing ops are planned sections of the founder dashboard.',
        items: [],
      },
    ],
    changelog: [
      { date: '2026-06-03', version: 'Partners cockpit', items: ['Partners section: searchable, status-filtered list (incl. Archived); expandable info sheet (Stripe, go-live, plan, est. financials, bookings by status, top cars, locations, timeline); edit; archive (reversible, hides cars); delete (guarded — archive instead when bookings exist).'] },
      { date: '2026-06-03', version: 'Prospect pipeline', items: ['Founder dashboard Phases 1–4: prospect create (no email), build-fleet via impersonation, prospects hidden from the marketplace, token-gated storefront preview, drag-and-drop stages, and claim-to-live. Three docs/changelogs (this hub).'] },
      { date: '2026-06-03', version: 'Admin foundation', items: ['admin.airluxo.ch founder dashboard with app_admins + is_admin() server-side gating and the admin shell.'] },
      { date: '2026-06-02', version: 'Studio-shot Pro', items: ['Car thumbnails moved to Gemini 3 Pro Image (Nano Banana Pro) for cleaner background replacement.'] },
    ],
  },
};
