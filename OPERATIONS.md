# AIRLUXO — Operations ideas

A living list of operational / product-ops ideas captured during build sessions, each with quick feedback.
Tag loosely: 💎 high impact · ⚠️ watch-outs · 🧭 regulatory/strategic decision.

> Assets we already have that these can build on: **Stripe authorize→capture** payments (a pre-auth *hold* can act as a deposit), **driver's-licence KYC** at booking, the **add-on pattern** (cross-border, delivery, after-hours) which new add-ons can copy, and per-car **delivery**.

---

## 1. "With driver" / chauffeur add-on (executive cars, limousines) 💎🧭
**Idea:** Offer cars *with a driver* — executive/limousine service for airport transfers, events, weddings, business days — as an add-on or a dedicated category.

**Feedback — strong upsell, but it's a regulated service, not just a toggle.**
- **Why it's attractive:** much higher ticket and recurring **corporate/event demand**; differentiates from pure self-drive; pairs naturally with the luxury positioning.
- **Product shape:** mirror the existing add-on pattern — a per-listing **"available with driver"** option with an **hourly + daily driver rate**, surfaced as a "With driver" filter and a line in the price breakdown. Or a separate **"Chauffeur / Executive"** category.
- **🧭 Regulatory watch-outs (Switzerland):** professional **passenger transport is licensed** — depending on canton it can need a limousine/taxi concession, the driver needs the right licence category (and possibly a professional permit), plus **passenger-transport liability insurance** and labour-law compliance for drivers. The rental company (partner) supplies the driver, so AIRLUXO stays the marketplace — but we must **verify partners are licensed** (collect attestations/certificates at onboarding) to avoid liability.
- **How to start:** add it as a partner-set add-on gated behind a **licensing attestation**; launch first with partners who already run chauffeur services; measure demand before building a full category.

## 2. Zero security deposit (like editionrent.ch) 💎🧭
**Idea:** Remove the cash security deposit — let guests book luxury cars with **CHF 0 deposit**, backed by fleet insurance (AXA, Die Mobiliar, etc.).

**Feedback — one of the biggest conversion levers; primarily an insurance decision, partly product.**
- **Why it matters:** deposits on luxury cars are often several thousand CHF — a huge drop-off point. "Zero deposit" is both a conversion win and a marketing headline. (We already tease *"reduce your excess to CHF 0 at checkout"* in the booking copy — this would make it real.)
- **Two paths:**
  1. **Partner-backed (faster):** each rental company already carries fleet insurance with a damage waiver; we sell a **damage-protection / zero-excess add-on** (daily fee) that waives the deposit, and/or place a **Stripe pre-authorization hold** (no cash blocked, just a hold that's released after return) instead of a captured deposit. *We already authorize-at-booking, so a separate hold amount is a natural extension.*
  2. **Marketplace-backed (bigger, slower):** negotiate a **master fleet/marketplace insurance** with AXA / Mobiliar / Allianz covering all bookings; charge a per-booking **protection fee**; offer true zero-deposit across the whole platform.
- **⚠️ Watch-outs:** insurance partnerships take legal + time; price the waiver correctly; define the **damage-claims flow** and who carries the excess; **fraud risk** rises without a deposit → lean on the **licence KYC** we have, plus an optional pre-auth hold; clarify VAT on the protection fee.
- **How to start:** ship a **refundable pre-auth hold** as the "deposit" (released automatically, no cash tied up) + a **damage-protection add-on** backed by partner insurance; in parallel, open conversations with AXA / Mobiliar about a master policy for true marketplace-wide zero-deposit.

## 3. Distribute listings on OTAs / aggregators (Booking.com, DiscoverCars) 💎⚠️🧭
**Idea:** Syndicate AIRLUXO inventory onto third-party car-rental marketplaces — **Booking.com** (car-rental vertical) and **DiscoverCars** (rental comparison/aggregator) — to pull in extra demand and fill idle midweek fleet.

**Feedback — real distribution upside, but a deliberate channel decision, not a quick integration.**
- **Why it's attractive:** instant access to huge **international traveller demand** (airport pickups, tourists) without paying for that acquisition; a way to **fill idle luxury cars** midweek; complements direct bookings.
- **⚠️ Margin:** these channels take **~15–25% commission** on top of our own take-rate — stacked fees can make a booking unprofitable unless rates are set with the channel cut baked in. Guard the partner payout + our margin before enabling.
- **⚠️ Brand & fit:** both are **mass-market / economy-led** (DiscoverCars has a "luxury/premium" filter; Booking.com is mostly commodity). Listing CHF-1000/day cars next to €25/day Fiats risks **diluting the luxury positioning** — curate which cars/segments go on-channel, if any.
- **🧭 Who lists, and how:** these platforms onboard **rental suppliers**, not marketplaces. Either AIRLUXO joins as an aggregating **supplier** (one feed for all partners — cleaner, but we own SLA/fulfilment) or individual partners list themselves (no AIRLUXO benefit). Integration is a **rates/availability/inventory feed** (XML/API channel-manager pattern) — we already have the **availability API + per-partner webhooks** to build sync on. Watch **rate-parity clauses** (they may forbid cheaper direct prices) and the fact that **they own the customer** (no repeat/direct relationship, no licence-KYC-on-file benefit).
- **How to start:** pick **one** channel and a **narrow segment** (e.g. premium-but-not-exotic cars near airports), pilot with a handful of partners, set channel rates with commission baked in, measure incremental (not cannibalised) bookings + true margin before scaling. Treat it as a **fill channel**, not the core funnel.

---

## Cross-cutting enablers
- **Insurance partner relationship** (AXA / Die Mobiliar / Allianz) — unlocks true zero-deposit (#2) and underpins chauffeur passenger-transport cover (#1).
- **Deposit / pre-auth hold in the booking flow** — extend the existing Stripe authorize→capture to place + release a separate hold; product work → candidate for BACKLOG.
- **New add-on fields + partner compliance/KYC** — driver add-on (#1) and protection add-on (#2) reuse the add-on pattern; both need partner attestations (licensing, insurance certificates) collected at onboarding.
- **Channel inventory sync** — an availability/rates feed for OTAs (#3) can build on the existing availability API + per-partner webhooks; channel commission must be baked into on-channel rates. → candidate for BACKLOG if we pursue distribution.

_Last updated: 2026-06-01._
