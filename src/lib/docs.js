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
      { date: '2026-06-17', version: 'Design — your brand', items: ['New Design tab: set your brand colour, accent, font and logo — they style your AIRLUXO storefront & booking page (the layout stays AIRLUXO; only the brand changes), with a live preview.'] },
      { date: '2026-06-05', version: 'Setup guide', items: ['A step-by-step setup guide now greets new partners — a guided tour of the dashboard with a spotlight on each area. Leave anytime, and replay it from Settings → Guide & changelog.'] },
      { date: '2026-06-04', version: 'AI car descriptions', items: ['List a car now has a Description field with a “Generate with AI” button (luxury, evocative tone). The description appears on the booking page. Delivery address now autocompletes Swiss addresses.'] },
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
          { h: 'Settings & privacy', p: 'Personal info + saved address, newsletter toggle (opt-in, unsubscribe anytime), cookie controls, and GDPR account deletion.' },
        ],
      },
      {
        id: 'embed', title: 'Partner embed',
        intro: 'Some partners show AIRLUXO on their own site — a chrome-less fleet + the full booking flow (light or dark). Bookings settle through AIRLUXO either way.',
        items: [],
      },
    ],
    changelog: [
      { date: '2026-06-03', version: 'Newsletter opt-in', items: ['Optional newsletter opt-in at checkout (unchecked by default). Unsubscribe anytime from your account or any email.'] },
      { date: '2026-06-03', version: 'Tier benefits', items: ['Membership tiers now comp perks at checkout — free damage protection & delivery (Platinum), service-fee waiver (Noir) — applied automatically, funded by AIRLUXO.'] },
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
      { label: 'Founder dashboard — Customers', state: 'live' },
      { label: 'Founder dashboard — Marketing (subscribers, CSV, lifecycle flows)', state: 'live' },
      { label: 'Lifecycle email flows (birthday, post-trip, win-back, wishlist, new-models, abandoned-booking)', state: 'live', note: 'in-house on Supabase + Resend; needs the service-role key in Vault to send' },
      { label: 'Localization — i18n foundation + Translations section (EN source, DE/FR/IT via AI)', state: 'beta', note: 'Phase 1: infra + admin editor live; string extraction across the app is ongoing' },
      { label: 'Newsletter consent — single source of truth in Supabase', state: 'live', note: 'Resend mirrors it' },
      { label: 'Founder dashboard — Overview (daily KPIs + period compare)', state: 'live' },
      { label: 'Founder dashboard — Finance (revenue/spend est. + Excel export)', state: 'live' },
      { label: 'Founder dashboard — Content automation (mine → generate → approve → Postiz)', state: 'beta', note: 'Phase 1 live: watchlist, inspiration scan + manual links, approval queue; generation agent + Postiz publishing being wired' },
      { label: 'Developer — Security audit (RLS/policy/definer checks, daily)', state: 'live' },
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
          { h: 'Lead details (gear) & delete', p: 'The gear on a card opens a double-width sheet: edit contact / source / notes, a structured Swiss address (autocomplete) + VAT/UID, web & social links, and a website AI-enrich that reads the site and fills the blanks; plus a timestamped activity-note log. A hover ✕ on a card hard-deletes a lead (no bookings).' },
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
        id: 'overview', title: 'Overview',
        intro: 'The landing dashboard — what we’re adding each day, vs the previous period.',
        items: [
          { h: 'Daily adds', p: 'New leads, partners, customers, bookings and GMV with a 7 / 30 / 90-day toggle, each a KPI card with a sparkline.' },
          { h: 'Period compare', p: 'Every card shows the % change vs the previous equal-length period. Day buckets in Europe/Zurich; GMV excludes declined & cancelled.' },
        ],
      },
      {
        id: 'finance', title: 'Finance',
        intro: 'What we earn and spend. Figures marked est. use each partner’s current plan rate (per-booking accounting not persisted yet).',
        items: [
          { h: 'Revenue', p: 'Net (est.), subscription MRR run-rate (Pro/Max/Free counts), service fees, and est. host commission — for the selected window (7 / 30 / 90 / All).' },
          { h: 'Spend', p: 'Discounts given, loyalty credits, and affiliate commission.' },
          { h: 'Booking history + Excel', p: 'Paginated booking table; one-click Excel exports for bookings, partners and customers with all relevant columns.' },
        ],
      },
      {
        id: 'content', title: 'Content (automation)',
        intro: 'Mine emotional inspiration, generate AIRLUXO reels & carousels, approve, and schedule. Emotion-first, real cars, subtle tag — never a sales pitch.',
        items: [
          { h: 'Settings — watchlist', p: 'Add/pause/remove Instagram creators. “Scan now” mines their public reels via Apify; a daily cron does it automatically (needs the Vault service-role key).' },
          { h: 'Inspiration', p: 'Ranked reels (a “what works” score) with a ▶ Watch link and manual remove. “Add by link” hand-picks a specific reel as a reference; put the desired vibe in the note.' },
          { h: 'Drafts — approval queue', p: 'Generated reels/carousels with a 9:16 preview, virality + hook scores, an editable caption, channel chips and a datetime — Approve & schedule or Reject. Nothing posts without approval.' },
          { h: 'Schedule', p: 'Scheduled and posted history. Approved posts publish via self-hosted Postiz (being wired).' },
        ],
      },
      {
        id: 'developer', title: 'Developer',
        intro: 'Internal tooling — testing + security.',
        items: [
          { h: 'Testing — Playwright', p: 'Opens the latest E2E report (local server + CI runs).' },
          { h: 'Security', p: 'Automated audit (public-table RLS, RLS-without-policy, SECURITY DEFINER search_path, extensions-in-public) + manual config checks (leaked-password protection, MFA, admin-function JWT). Pass/warn/fail/manual summary + a remediation task list; re-runs daily and on “Run check now”.' },
        ],
      },
    ],
    changelog: [
      { date: '2026-06-17', version: 'Partner website — own domain', items: ['A partner&apos;s published site can now run on their own domain: add the hostname in Brand & pitch → Own domain, point a CNAME at cname.vercel-dns.com (+ add it in Vercel), mark verified — the app resolves the partner by hostname (multi-tenant, one deploy). A dedicated Vercel project per partner is documented as an isolation option. Backend: partner_domains + public_partner_site_by_host + admin domain RPCs; runbook docs/partner-site/own-domain-deploy.md.'] },
      { date: '2026-06-17', version: 'Brand kit — AI audit + Drive export', items: ['An agent pass refines the raw Firecrawl kit against the site screenshot — fixing wrong defaults (e.g. an unstyled link-blue read as the brand colour, or a light strip read as the background) and recovering the real palette/logo — and exports the car images to a per-partner luumos.io Google Drive folder. The refined kit + Drive link show in Brand & pitch for review before applying. Backend: partner-ingest-update contract fn + docs/partner-site/ingest-agent.md.'] },
      { date: '2026-06-17', version: 'Partner website — Swiss legal pages', items: ['The Brand & pitch review gets a Legal panel: enter the partner’s legal-entity data (company, legal form, address, UID/CHE, VAT, contact, represented-by) → generate Swiss Impressum · Datenschutz · AGB (German/CH templates, fully editable, flagged for legal review). The published partner site shows them via footer links. Backend: partners.legal/legal_pages + admin_set_partner_legal / partner_update_legal RPCs.'] },
      { date: '2026-06-17', version: 'Partner website — publish (white-label site)', items: ['From the Brand & pitch review you can now Publish a full white-label site: a themed home (hero/USP, about, benefits, contact) + the partner’s fleet + AIRLUXO booking, served at a public address airluxo.ch/p/&lt;slug&gt;. Content seeds from the extracted copy; the brand kit themes it (colours/fonts/logo over AIRLUXO’s UX). Publish is founder-gated (Draft/Live); Swiss legal pages (Impressum) and own-domain deploy come next.'] },
      { date: '2026-06-17', version: 'Brand & pitch — review & apply', items: ['After analysing a prospect’s site, “Review & apply” opens a brand review: edit the extracted colours (primary/accent/background/text), fonts and logo with a live themed preview, see the USP + tech-stack intel and the original-site screenshot, then Apply to set the live brand kit (themes the preview/storefront instantly). Scraped car images can be selected, assigned to a car and tagged hero/interior/detail → attached as that car’s photo gallery (the hero becomes the card image). The kit is reviewable the moment the homepage scrape lands; the fleet crawl keeps adding images in the background.'] },
      { date: '2026-06-17', version: 'Website analysis (Firecrawl ingest)', items: ['Pipeline lead sheet gets “Analyze website”: paste a prospect’s site → Firecrawl extracts their brand kit (colours, fonts, logo), USP + page copy, a tech-stack read (CMS · payments · booking tool) and a full-page screenshot, then crawls their fleet for car images (async, finalized by a 2-min cron). Status shows live (Reading homepage → Finding car images → Ready to review). Results land as a proposal on the prospect; the impeccable audit + Google-Drive export and the review/apply flow come next. Backend: partner-ingest / partner-ingest-poll edge fns, brand-assets bucket, partner_ingest_jobs.'] },
      { date: '2026-06-17', version: 'Partner website builder — foundation', items: ['Groundwork for turning a partner’s existing site into a branded storefront on AIRLUXO: brand-kit theming (the storefront/preview can render a partner’s colours, fonts and logo over our UI via CSS variables) and multi-image car galleries (a hero “whole car” shot opens an interior/detail gallery). Website analysis (Firecrawl ingest), the admin review/apply flow and the partner Design tab come next.'] },
      { date: '2026-06-16', version: 'Draft preview — enlarge + carousel', items: ['Draft media now opens in a full-screen lightbox (click to enlarge); multi-frame carousels get frame navigation (arrows + dots) in the card and the lightbox.'] },
      { date: '2026-06-16', version: 'Content automation — Phase 1', items: ['New Content section: watchlist + “Scan now” (Apify Instagram mining) + daily cron; inspiration board with a “what works” score, ▶ Watch links, manual add-by-link and remove; draft approval queue (9:16 preview, virality/hook scores, editable caption, channel + datetime → approve & schedule / reject). Backend: content_* tables, content-scrape / content-ingest / content-inspiration-ingest edge fns, content-media bucket. Generation agent (Higgsfield) + Postiz publishing being wired.'] },
      { date: '2026-06-16', version: 'Lead sheet enrichment + AI enrich', items: ['Pipeline cards get a gear → double-width lead sheet: Swiss address autocomplete + VAT/UID + web/social links + a website AI-enrich (reads the site, fills blanks), and a timestamped activity-note log. Hover ✕ deletes a lead. Cold-outreach Resend templates (full + short) for sharing a preview.'] },
      { date: '2026-06-13', version: 'Overview & Finance dashboards', items: ['Overview (new landing): daily new leads/partners/customers/bookings/GMV with a 7/30/90-day toggle, period-over-period deltas and sparklines. Finance: subscription run-rate + booking-fee revenue − discounts/credits (all est.), a booking-history table and Excel exports (bookings/partners/customers). Long tables now paginate (25/page).'] },
      { date: '2026-06-13', version: 'Security audit', items: ['Developer → Security: an automated audit (public-table RLS, RLS-without-policy, SECURITY DEFINER search_path, extensions-in-public) plus manual config checks (leaked-password protection, MFA, admin-function JWT), with a pass/warn/fail/manual summary and a remediation task list. Re-runs daily and on demand.'] },
      { date: '2026-06-13', version: 'Brand favicons', items: ['AIRLUXO app-icon favicons — black on the customer site, cream on the admin back office (swapped by host).'] },
      { date: '2026-06-05', version: 'Localization — Phase 1', items: ['i18n foundation (English source in code; DE/FR/IT in Supabase, merged live), browser language detection + a language switcher, locale saved per profile. New Translations section: coverage table with stale detection + per-key/bulk AI translation. First strings wired (partner nav, customer account).'] },
      { date: '2026-06-04', version: 'Abandoned-booking recovery', items: ['Captures the lead when a guest enters their email at checkout; one same-car reminder 1–48h later (soft opt-in, suppressed on conversion/opt-out, one-click unsubscribe). Built to the legal guardrails.'] },
      { date: '2026-06-04', version: 'Marketing flows expanded', items: ['Four more lifecycle flows via a generic runner: post-trip (2 days after a trip), win-back (no booking in 6 months), wishlist (saved cars, no recent booking), new-models (weekly digest of new arrivals). Each consent-gated + re-send throttled; managed from the Flows panel.'] },
      { date: '2026-06-04', version: 'Marketing lifecycle flows', items: ['Lean in-house marketing email: triggered flows on Supabase + Resend (consent-gated, idempotent send log, one-click unsubscribe). First flow live — birthday. New Marketing → Flows panel: per-flow status, send stats, recent-sends history, pause/resume. Branded shared email shell across all email.'] },
      { date: '2026-06-03', version: 'Newsletter SSOT + Marketing', items: ['Newsletter consent centralised in Supabase (newsletter_subscribers) as the single source of truth — Resend is now a downstream mirror. New Marketing section: searchable subscriber list (customers + footer leads), manual unsubscribe/resubscribe, and CSV export (incl. id for bulk updates).'] },
      { date: '2026-06-03', version: 'Newsletter consent trail', items: ['Affirmative opt-in checkbox at checkout (unchecked by default, revDSG/GDPR-safe). Consent records when + how (source) it was given and when withdrawn — surfaced in the customer sheet.'] },
      { date: '2026-06-03', version: 'Customers cockpit', items: ['Customers section: searchable list with bookings, revenue, loyalty tier and newsletter opt-in; expandable sheet (tier, points, referrals, birthday from licence, bookings by status, top cars rented, contact + address). Read-only for now.'] },
      { date: '2026-06-03', version: 'Loyalty tier comps (4b)', items: ['Tier perks applied authoritatively at checkout (stripe-create-payment): free protection/delivery + Noir service-fee waiver, AIRLUXO-funded and clamped to its margin so the partner payout is never reduced.'] },
      { date: '2026-06-03', version: 'Partners cockpit', items: ['Partners section: searchable, status-filtered list (incl. Archived); expandable info sheet (Stripe, go-live, plan, est. financials, bookings by status, top cars, locations, timeline); edit; archive (reversible, hides cars); delete (guarded — archive instead when bookings exist).'] },
      { date: '2026-06-03', version: 'Prospect pipeline', items: ['Founder dashboard Phases 1–4: prospect create (no email), build-fleet via impersonation, prospects hidden from the marketplace, token-gated storefront preview, drag-and-drop stages, and claim-to-live. Three docs/changelogs (this hub).'] },
      { date: '2026-06-03', version: 'Admin foundation', items: ['admin.airluxo.ch founder dashboard with app_admins + is_admin() server-side gating and the admin shell.'] },
      { date: '2026-06-02', version: 'Studio-shot Pro', items: ['Car thumbnails moved to Gemini 3 Pro Image (Nano Banana Pro) for cleaner background replacement.'] },
    ],
  },
};
