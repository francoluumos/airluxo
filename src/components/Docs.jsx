// AIRLUXO — Partner dashboard guide + changelog.
// Opened in a new tab via ?docs (linked from Settings). Keep this file updated
// with every new feature: add/extend the relevant SECTION and prepend a
// CHANGELOG entry. Dates are absolute (YYYY-MM-DD).

const SECTIONS = [
  {
    id: 'getting-started',
    title: 'Getting started',
    intro: 'AIRLUXO is a marketplace for luxury car rental companies in Switzerland. You list your cars, set your prices and rules; AIRLUXO brings vetted drivers, handles checkout and payouts, and takes a commission only when a car is booked.',
    items: [
      { h: 'Create a partner account', p: 'Sign up with your company name and city. Email confirmation is off, so you can start immediately.' },
      { h: 'Connect payouts (Stripe)', p: 'In Earnings, connect your Stripe account so guest payments can settle to your IBAN. Until connected, bookings still work but payment is skipped.' },
      { h: 'Add a pick-up location', p: 'Before listing cars, add at least one pick-up site under Location — you’ll assign each car to one.' },
    ],
  },
  {
    id: 'overview',
    title: 'Overview',
    intro: 'Your dashboard home — a live snapshot of the business.',
    items: [
      { h: 'KPIs', p: 'Active listings, total bookings (with how many await your reply), net earnings for the current month (with % vs the previous month), and fleet utilisation (booked car-days ÷ cars × days this month). All figures are real, computed from your bookings.' },
      { h: 'Net payouts · 6 months', p: 'A bar chart of your monthly net payouts over the last six months.' },
      { h: 'My fleet & Recent bookings', p: 'Quick lists with shortcuts into the full Fleet and Bookings views.' },
    ],
  },
  {
    id: 'fleet',
    title: 'My fleet',
    intro: 'Where you list and manage your cars.',
    items: [
      { h: 'List a car (4 steps)', p: 'Photo → Identity → Specs → Pricing. Upload one photo first: AIRLUXO auto-generates a clean studio thumbnail and pre-fills make, model and colour from the image. Specs (power, seats, gearbox, fuel) are pre-filled from a curated library — review and edit anything.' },
      { h: 'Pricing & terms', p: 'Daily rate, mileage/day, custom time slots (e.g. 3 hours, weekend), cross-border add-on, delivery & collection add-on, and the pick-up location for that car.' },
      { h: 'Edit & manage', p: 'The gear icon on each car opens the editor. You can also change status, delete, or block the car for specific dates (maintenance, owner use) with a name + reason — blocked dates are unbookable and show in the calendar.' },
      { h: 'Import / export', p: 'Bulk-add cars from CSV/Excel with a downloadable template and a validation preview. Export your fleet (with a unique id + image URL, timestamped filename) — re-importing with ids updates rather than duplicates.' },
    ],
  },
  {
    id: 'location',
    title: 'Location',
    intro: 'Manage the sites where guests collect and return cars — each with its own hours.',
    items: [
      { h: 'Multiple pick-up sites', p: 'Add as many locations as you operate. Start typing an address and pick from the Swiss address autocomplete — it fills street, number, ZIP, city and country, plus per-site phone and email.' },
      { h: 'Opening hours (per site)', p: 'Set opening hours per weekday, or leave them off (collect any time). Optionally allow after-hours handover with a surcharge.' },
      { h: 'How it reaches guests', p: 'The booking flow shows the car’s pick-up location and limits the time picker to that site’s opening hours; after-hours, the surcharge is added to the guest’s total.' },
    ],
  },
  {
    id: 'bookings',
    title: 'Bookings',
    intro: 'Every reservation, with its status and payment state.',
    items: [
      { h: 'Statuses', p: 'Pending → Confirmed → On trip → Completed, or Declined / Cancelled. Payment badges show authorized, captured, refunded, etc.' },
      { h: 'Driver verification (KYC)', p: 'Guests verify their driver’s licence at booking (phone scan with AI autofill). You see the verified driver details; licence images are not stored.' },
      { h: 'Confirm / decline / cancel', p: 'Every money move asks for confirmation. Confirming captures the authorised payment; declining/cancelling lets you choose a refund: full, partial, a restocking fee, or none. Kept fees split proportionally between you and AIRLUXO.' },
    ],
  },
  {
    id: 'calendar',
    title: 'Calendar',
    intro: 'A month view merging guest bookings and your internal blocks, so you can see fleet availability at a glance.',
    items: [],
  },
  {
    id: 'earnings',
    title: 'Earnings',
    intro: 'Your gross bookings, AIRLUXO commission and net payout, plus the 6-month payout trend.',
    items: [
      { h: 'Fees', p: 'Guests pay a 12% service fee on top of the subtotal. AIRLUXO withholds a host commission (currently 3%) from your payout. No listing or monthly fees on the Free plan.' },
      { h: 'Payouts', p: 'Settled to your connected Stripe account after the trip.' },
    ],
  },
  {
    id: 'plans',
    title: 'Plans',
    intro: 'Subscription tiers (Free / Pro / Max) that trade commission for a monthly fee as you grow. Currently a preview — billing and enforcement are not yet live.',
    items: [],
  },
  {
    id: 'settings',
    title: 'Settings',
    intro: 'Your profile and the integrations that connect AIRLUXO to your own tools.',
    items: [
      { h: 'Profile', p: 'A profile picture (shown in your dashboard), your member-since date and live Stripe payout-connection status, your company details (name, contact person, city, website, phone) and login email, plus separate Support and Billing contacts (name / email / phone), an invoice-only email, VAT/UID number, and a structured company address (Swiss address autocomplete). A separate billing address (also with autocomplete) is used on AIRLUXO’s invoices — or tick “same as company address” to reuse it.' },
      { h: 'Webhook', p: 'POST every new and updated booking as JSON to a URL you control. Each delivery is signed (X-AIRLUXO-Signature) with your secret so you can verify it. Use “Send test event” to check your endpoint.' },
      { h: 'Calendar subscription', p: 'A private ICS feed URL you can subscribe to in Google, Apple or Outlook Calendar — your bookings and blocks appear automatically and stay in sync.' },
      { h: 'Embed', p: 'A copy-paste snippet to show your AIRLUXO fleet and take bookings on your own website (light or dark theme). Bookings still settle through AIRLUXO and land in this dashboard.' },
      { h: 'Change password', p: 'Set a new password from Settings. Forgot it? Use “Forgot password?” on the login screen to get a reset link by email.' },
    ],
  },
];

const CHANGELOG = [
  {
    date: '2026-06-01',
    version: 'Build 0.6',
    items: [
      'Booking no longer requires signing in first — guests can book straight through. After confirming, they’re offered a one-tap account (Google or an email link) to manage the trip and check out faster; the booking links to it automatically. Lower friction, better conversion.',
    ],
  },
  {
    date: '2026-06-01',
    version: 'Build 0.5',
    items: [
      'Subscription tiers are now wired to real mechanics: your AIRLUXO commission depends on your plan — Free 15%, Pro 9%, Max 3% — applied automatically to every booking and reflected in Earnings and the bookings table.',
      'Car limits per plan are enforced when listing a new car (Free 3, Pro 25, Max unlimited). Existing cars are never affected; you’re only blocked from adding beyond your limit. The Plans tab shows your usage and flags when you’re full.',
      'Self-serve billing (Stripe subscriptions) is next — for now we set your plan manually, and your commission/limit update the moment we do.',
    ],
  },
  {
    date: '2026-06-01',
    version: 'Build 0.4',
    items: [
      'Promo & referral codes: guests can apply a discount code in the booking flow (shown as a line in the price breakdown). Codes also attribute the booking to a referrer (e.g. a hotel) with a commission, and each code sets whether AIRLUXO or the partner funds the discount. All amounts are recomputed server-side, so the discount can never reduce a partner payout below zero.',
    ],
  },
  {
    date: '2026-06-01',
    version: 'Build 0.3',
    items: [
      'Customer profile expanded: add or replace your driver’s licence any time (same scan / phone hand-off as booking) — kept on file and used to prefill future bookings.',
      'Email preferences: a newsletter toggle that syncs your subscription with our mailing list. Booking confirmations remain transactional and always sent.',
      'Privacy controls in the profile: manage cookie preferences, open the privacy policy, and a GDPR “delete my account & data” action (past bookings are kept for the partner but unlinked).',
      'Profile photo upload, and a saved address (Swiss autocomplete) to speed up delivery on future bookings.',
    ],
  },
  {
    date: '2026-06-01',
    version: 'Build 0.2',
    items: [
      'Customer accounts: drivers can now create an account and sign in — one tap with Google, or a passwordless email magic-link — from the new account menu in the top-right.',
      'Booking now requires a quick sign-in (on the main marketplace) — every booking is tied to a customer, and their email, phone and verified licence are prefilled on the next trip. The embeddable widget on partner sites stays guest-checkout (no login).',
      'Customer profile: “My trips” (upcoming & past bookings), “Saved” cars, the driver’s licence kept on file, and account settings. Past bookings made before signing up auto-link by email.',
      'Saved cars: a heart on every car card adds it to the customer’s wishlist.',
      'Transactional email now sends from the verified domain (AirLuxo News <noreply@send.airluxo.ch>).',
    ],
  },
  {
    date: '2026-05-30',
    version: 'Build 0.1',
    items: [
      'Marketplace "Where" is now a free-text Swiss place search (geo.admin.ch) — typing suggests cities/places; picking one sorts the collection by proximity (nearest cars first) and is logged so we can see which locations are in demand.',
      'Privacy: an opt-in cookie-consent banner + a draft Privacy & Cookie Policy page (pending legal review). Analytics only run after consent.',
      'Analytics: consent-gated PostHog integration (silent until a key is configured) tracking searches, car views, map-pin clicks and the booking funnel — to see demand by location and where bookings drop off.',
      'Listings can have a short video: upload it in Add/Edit car — it plays muted on hover on the car card (desktop) and autoplays in the booking view. Loads only on hover, so it doesn’t slow the marketplace.',
      'Studio thumbnails are consistent: the generation prompt locks direction (always facing left), camera angle and framing; the generated image is then background-removed and recomposited on a clean white 16:9 canvas at a uniform size, so backgrounds, ratio and car size always match.',
      'Settings: Profile section (profile picture upload, member-since, Stripe payout status, company info, support & billing contacts, invoice-only email, VAT, autocompleted company & billing addresses with “billing same as company”) and a two-column layout.',
      'Password reset: “Forgot password?” on the partner login (emailed reset link + reset page), plus a Change password control in Settings.',
      'Partner guide & changelog added (this page), linked from Settings.',
      'Overview KPIs are now real (net earnings, % vs previous month, fleet utilisation, 6-month chart).',
      'After-hours handover surcharge is now charged and itemised at checkout.',
      'Homepage map: real pick-up coordinates with a refined, on-brand style.',
      'Settings menu added: Webhook (signed, with test), Calendar subscription (ICS), Embed.',
      'Opening hours are now set per pick-up location.',
      'Locations: multiple sites per partner, Swiss address autocomplete, phone & email, structured address.',
      'Marketplace: hero date picker (exact / flexible) and advanced filters (brand, colour, transmission, fuel, seats, power, price, add-ons).',
      'Embeddable booking widget (light/dark) for partner websites.',
      'Fleet CSV/Excel import & export with templates and a validation preview.',
      'Cancellation handling with full / partial / restocking-fee / no refund, proportional fee split.',
      'Stripe Connect payments: authorize at booking, capture on confirm, refunds.',
      'Driver’s-licence KYC with AI autofill and phone hand-off.',
      'Availability calendar with double-booking prevention; manual car blocking.',
      'AI studio thumbnails and photo-first listing with detail prefill.',
    ],
  },
];

function Section({ s }) {
  return (
    <section id={s.id} className="scroll-mt-24 border-t border-mist pt-10">
      <h2 className="font-display text-[1.7rem] leading-tight">{s.title}</h2>
      {s.intro && <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-stone">{s.intro}</p>}
      {s.items.length > 0 && (
        <div className="mt-5 space-y-3">
          {s.items.map((it) => (
            <div key={it.h} className="rounded-2xl border border-mist bg-cloud p-4">
              <div className="text-sm font-semibold">{it.h}</div>
              <p className="mt-1 text-sm leading-relaxed text-stone">{it.p}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function Docs() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* top bar */}
      <header className="sticky top-0 z-10 border-b border-mist bg-paper/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 sm:px-8">
          <a href="/" className="ring-lux wordmark text-xl">AIR<span className="text-gold">LUXO</span></a>
          <span className="text-xs font-semibold uppercase tracking-wider text-stone">Partner guide</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <div className="eyebrow text-gold">Documentation</div>
        <h1 className="font-display mt-2 text-[clamp(2rem,5vw,3rem)] leading-[1.02]">Using your partner dashboard</h1>
        <p className="mt-4 max-w-2xl text-[1.02rem] leading-relaxed text-stone">
          Everything you can do in the AIRLUXO partner dashboard, section by section. This guide is kept up to date as features ship — see the changelog at the end.
        </p>

        {/* contents */}
        <nav className="mt-8 flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="ring-lux rounded-full border border-mist bg-cloud px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-ink">{s.title}</a>
          ))}
          <a href="#changelog" className="ring-lux rounded-full border border-ink bg-ink px-3.5 py-1.5 text-xs font-semibold text-cloud transition-colors hover:bg-void">Changelog</a>
        </nav>

        <div className="mt-10 space-y-10">
          {SECTIONS.map((s) => <Section key={s.id} s={s} />)}

          {/* changelog */}
          <section id="changelog" className="scroll-mt-24 border-t border-mist pt-10">
            <h2 className="font-display text-[1.7rem] leading-tight">Changelog</h2>
            <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-stone">Every change to the partner dashboard, newest first.</p>
            <div className="mt-6 space-y-7">
              {CHANGELOG.map((rel) => (
                <div key={rel.date + rel.version} className="relative border-l-2 border-mist pl-5">
                  <div className="absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-gold bg-paper" />
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-lg">{rel.version}</span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-stone tnum">{rel.date}</span>
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {rel.items.map((it, i) => (
                      <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-stone">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gold" />
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>

        <footer className="mt-16 border-t border-mist pt-6 text-xs text-stone">
          AIRLUXO partner documentation · <a href="/" className="ring-lux font-semibold text-ink hover:text-gold">Back to AIRLUXO</a>
        </footer>
      </main>
    </div>
  );
}
