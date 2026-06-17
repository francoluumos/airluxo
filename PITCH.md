# AIRLUXO — Partner Pitch (spec)

What the per-partner pitch contains and how it should feel. The pitch is the artifact
the founder shares with a prospective rental partner to win them onto AIRLUXO. It is
**brand-themed in the partner's own colours/fonts/logo** (from the website-ingest brand
kit — see `docs/plans/2026-06-17-001-feat-partner-ingest-brandkit-plan.md`) and opened
via the existing token link (`?embed=<id>&preview=<token>`), so the prospect sees *their*
brand on *our* engine.

## Purpose & audience
- **Audience:** the owner / decision-maker of an existing luxury-car rental company.
- **Goal:** make the offer tangible — "we build your website + booking tool, connect it to
  the tools you already use, on simple terms, and we bring you customers" — and get to a
  *go-live* / *book-a-call*.
- **Form:** a single-scroll, brand-themed site of distinct full-height sections (slides),
  AIRLUXO UI/UX with only the partner's colours/fonts/logo swapped. Mobile-first, fast,
  shareable by link. Each section below is one "site/slide".

## Through-line
Emotion + credibility, never a hard sell. Their brand front and centre; AIRLUXO as the
quiet engine behind it. One clear CTA at the end.

---

## Slide 1 — "Your new website & booking"
- **Goal:** the wow — they see their own storefront, live, in their brand.
- **Content:** the **branded storefront preview** — their real cars (hero "whole car"
  shot → click → interior/detail gallery), their colours/fonts/logo, the real booking
  flow. A short line: "This is your site and booking tool — your brand, live in days."
- **Source:** the ingest brand kit + their real car images (the partner-ingest plan).
- **Motion/feel:** minimal; let the real preview speak. Subtle entrance; a "See it live ↗"
  that opens the actual token preview.

## Slide 2 — "One hub, every tool"
- **Goal:** show AIRLUXO connects to the systems they already run — no rip-and-replace.
- **Content:** an **integration constellation**. The **AIRLUXO logo sits in the centre**;
  the partner's business tools orbit around it — e.g. **bexio** (accounting), **Odoo**
  (ERP), **Google Workspace** (Gmail/Calendar/Drive), **WhatsApp** (guest comms),
  **Stripe** (payments), **calendar/iCal**, social (Instagram). One line: "AIRLUXO plugs
  into your stack — bookings, invoicing, calendar, payments, comms, all in sync."
- **Motion/interaction (the centerpiece):** on entering the slide (or on tap), the app
  icons **splash outward** from the centre into their orbit positions; then the **AIRLUXO
  logo fades in at the middle** and **connection lines animate** drawing from AIRLUXO out
  to each app (pulse along the line), settling into a hub-and-spoke graph. Icons gently
  float; hovering/tapping an app highlights its connection + a one-line "what it syncs".
- **Note:** integrations are aspirational/roadmap — frame as "connects with" without
  over-promising live status; keep the list editable per pitch.

## Slide 3 — "Simple terms"
- **Goal:** remove pricing friction — show it's fair, transparent, no lock-in.
- **Content:** the **subscriptions (abonnements)** we offer, from the real plan model
  (`src/lib/plans.js`): **Free** (CHF 0/mo · 15% commission · up to 3 cars), **Pro**
  (CHF 49/mo · 9% · up to 25), **Max** (CHF 199/mo · 3% · unlimited). Plus: guests pay a
  12% service fee (not them), **no listing fees, no lock-in**, payouts to their IBAN after
  each trip. A plan-comparison card row; "Pro" highlighted as most popular.
- **Motion/feel:** clean comparison cards; the recommended tier subtly lifts.

## Slide 4 — "We bring you customers"
- **Goal:** prove AIRLUXO is demand, not just software.
- **Content:** the **marketing engine** — AIRLUXO **ads + content** (the emotional
  reels/carousels from the content pipeline), marketplace exposure on airluxo.ch, and
  lifecycle email flows. Show example AIRLUXO content (reels/carousels) + "your cars,
  featured to vetted Swiss drivers." One line: "We don't just build your site — we drive
  the bookings."
- **Source:** real AIRLUXO content drafts/posts + marketplace stats once available.
- **Motion/feel:** a tasteful carousel/reel showcase; social-proof numbers when we have them.

## Closing — CTA
- One decisive action: **Go live** (claim → real partner account) or **Book a call**.
- Reassure: "Your preview stays private until you say go." (matches the prospect-preview model.)

---

## Build notes
- Brand theming = the partner's `brand_kit` (colours + fonts + logo) over AIRLUXO
  components via CSS variables (same mechanism as the storefront preview). UI/UX stays ours.
- Slide 1 reuses the branded preview directly; slides 2–4 are AIRLUXO-authored, brand-tinted.
- Slide 2's animation is the signature moment — invest in it (SVG/Canvas or a motion lib;
  `motion/react` is already in the stack). Respect `prefers-reduced-motion`.
- Keep an editable per-pitch config: which integrations to show, which plan to highlight,
  which content examples to feature.
- Lives behind the founder/admin + token link; not public.

## Deferred
- Live integration status (vs "connects with"), real marketplace/booking stats on slide 4,
  per-prospect custom copy generation, multi-language pitch.
