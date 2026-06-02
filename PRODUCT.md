# Product

## Register

brand

> Primary surface is the customer-facing luxury marketplace (browse + booking), where the
> look and feel *is* part of the product. The **partner dashboard** (`PartnerDashboard.jsx`)
> and **founder/admin** surfaces are a secondary **product** register — design serves the
> workflow there. Override the register per task when working on the dashboard.

## Users

- **Renters (guests).** Affluent individuals and visitors in Switzerland booking a luxury,
  sport, exotic, or GT car for a trip or occasion. Context: browsing on phone or laptop,
  often deciding emotionally on the car, then needing a fast, trustworthy checkout. Job to
  be done: find the right car for specific dates near them, understand the real total
  (incl. add-ons like delivery, cross-border, damage protection), and book with confidence
  — no account required up front, licence verified in-flow.
- **Partners (fleet operators).** Owners/managers listing one to many cars. Context: working
  in the dashboard to manage fleet, availability, pricing/add-ons, bookings, payouts, and
  their subscription tier. Job to be done: list cars quickly, control logistics (locations,
  opening hours, delivery), and get paid out reliably with a transparent commission.
- **Founder/admin (internal, planned).** Platform back office for KPIs, partner approval,
  promo/affiliate admin, finance.

## Product Purpose

AIRLUXO is a Swiss marketplace that connects partners' luxury cars with renters and runs the
full booking lifecycle: search by city/dates → car detail → add-ons → licence KYC → Stripe
manual-capture payment (authorize, capture on partner confirm) as a Connect destination
charge. It positions on a **concierge, zero-deposit** experience: guests reduce their damage
excess to CHF 0 via a per-listing protection add-on (the partner keeps 100%) instead of a
cash deposit. Success = renters book without friction and trust the experience; partners get
supply onboarded and paid out; the marketplace feels unmistakably premium, not transactional.

## Brand Personality

Three words: **quiet luxury · cinematic · concierge.**

- **Quiet luxury / understated.** Restraint and whitespace over ornament. Confidence without
  shouting; the cars are the spectacle, the UI is the gallery wall.
- **Cinematic.** Big, beautiful car imagery and a few dramatic hero moments (the detail hero,
  muted autoplay video). Drama is earned and sparing, never busy.
- **Warm & concierge.** Hospitality-grade tone: human, attentive, reassuring at money and
  licence moments ("You won't be charged yet", "charged only when the host confirms").

Voice: specific and calm. Never hypey, never discount-driven.

## Anti-references

This must explicitly NOT look like:

- **Budget rental energy** — Sixt/Europcar discount loudness, orange "deal" CTAs, price-slash
  urgency, countdown banners. AIRLUXO is the opposite of a comparison-deal site.
- **Generic SaaS template** — cream/sand body background, a tiny uppercase tracked eyebrow
  above every section, identical icon+heading+text card grids, the hero-metric template.
- **Crypto / tech-bro neon** — dark neon gradients, glassmorphism everywhere, gradient text,
  hype aesthetic.
- **Cluttered marketplace** — eBay/Craigslist density where everything competes for
  attention. Generous spacing and a clear single focus per view instead.

## Design Principles

1. **The car is the hero; the UI recedes.** Photography and space carry the luxury; chrome
   stays minimal. When in doubt, remove an element rather than add one.
2. **Trust at every money and identity moment.** Pricing is fully itemized and honest (base,
   add-ons, service fee, protection, discounts, total); reassurance copy sits exactly where
   anxiety peaks (payment authorize, licence sharing). No surprises, ever.
3. **Concierge, not transaction.** The flow feels guided and human — book without a login
   wall, licence scanned for you, account offered after. Friction removed, not added.
4. **Restraint is the differentiator.** In a category of loud rental sites, quiet confidence
   is the brand moat. Resist decoration that doesn't serve the booking decision.
5. **One brand, two registers.** The marketplace is expressive and cinematic; the partner
   dashboard is calm, dense, and efficient. Both share the palette and type, but the
   dashboard optimizes for workflow speed over drama.

## Accessibility & Inclusion

- Target **WCAG 2.1 AA.** Body text ≥4.5:1 contrast (incl. placeholders), large/bold text
  ≥3:1 — watch muted text on tinted near-white surfaces.
- Full keyboard operability; visible focus (the existing `ring-lux` utility).
- **Reduced motion is honored** (`prefers-reduced-motion`): the detail hero already gates its
  autoplay video on it; every future animation needs a crossfade/instant fallback.
- Time/date pickers, the licence flow, and forms must be operable without a mouse and legible
  on small mobile screens (16px input floor already enforced to stop iOS zoom).
