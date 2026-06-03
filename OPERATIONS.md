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

## 4. Potential investors / strategic partners 💎🧭
**Idea:** Raise from / partner with a major Swiss automotive group — **Emil Frey Group** (Switzerland's largest car retailer & importer) or other large dealership groups — as strategic investors.

**Feedback — strong strategic fit (capital + supply + credibility), but guard marketplace neutrality.**
- **Why it fits:** dealership groups bring **capital**, **vehicle supply** (idle premium inventory + fleets), an existing **dealer network** to onboard as partners, and **brand credibility** in the Swiss market — they'd both fund *and* feed the marketplace.
- **⚠️ Watch-outs:** a single dealer-group investor can **deter competing dealerships** from listing (neutrality concern); they may push for **exclusivity or board control** — align on AIRLUXO staying an open marketplace first. Clarify whether they enter as **investor**, **anchor supply partner**, or both.
- **How to start:** seek a warm intro to Emil Frey corporate/ventures; pitch as a **supply + distribution partnership** first, investment second; keep a shortlist of other large groups (e.g. **AMAG**, regional luxury dealers) for optionality and leverage.

## 5. Luxury stays — acquire Switzerland's top-5% Airbnbs to host (car + housing trips) 💎🧭⚠️
**Idea:** Recruit the **top ~5% luxury short-stay properties** in Switzerland (chalets, villas, design apartments) to list/host on AIRLUXO, so we can sell **complete luxury trips — car + accommodation (+ more)** in one booking. Positions AIRLUXO as a luxury *travel* platform, not only car rental.

**Feedback — big, on-brand expansion; it's effectively a second marketplace, so scope it as a deliberate platform move.**
- **Why it's powerful:** same HNW traveller; bundling the car with a place to stay raises basket size, differentiates hard from pure car rental, and deepens the concierge positioning. Natural cross-sell with the hotel-concierge (MARKETING #1) and luxury-Airbnb-host (MARKETING #2) channels — some of those hosts become supply here.
- **🧭 Strategic:** this is a **new supply side + inventory type** (properties, nights, occupancy) — a second marketplace bolted onto the car one. Decide it as such: shared accounts / checkout / loyalty / concierge, but its own listing model, availability calendar, pricing, and trust/insurance rules.
- **PMS integrations are the key dependency.** Luxury hosts/managers already run a **property management system**; sync availability + reservations via their PMS API rather than double-entry. Target the big ones: **Guesty**, **Smoobu**, **Hostaway / Hostfully** (likely also Lodgify, Beds24). Build a channel-manager-style integration (rates / availability / reservations) — mirrors the OTA-feed pattern (#3) but **inbound**. Start with the one PMS that covers the most target properties.
- **⚠️ Watch-outs:** hospitality is **more regulated + operationally heavier** than car rental (cleaning, check-in / keys, damage, local lodging tax / Kurtaxe, cancellation policies, stay liability + insurance); curation is everything for a "top 5%" promise (hand-pick, no self-serve); recruit via **property managers directly** (don't scrape Airbnb / breach ToS); two-sided cold-start on the new supply.
- **How to start:** hand-curate a shortlist of marquee properties in **St. Moritz / Gstaad / Verbier / Zermatt / Geneva–Zürich**, pilot **one PMS integration** (or manual onboarding for the first few), and sell a single **"car + chalet" bundle** to validate demand before building the full stays marketplace.

---

## Cross-cutting enablers
- **Insurance partner relationship** (AXA / Die Mobiliar / Allianz) — unlocks true zero-deposit (#2) and underpins chauffeur passenger-transport cover (#1).
- **Deposit / pre-auth hold in the booking flow** — extend the existing Stripe authorize→capture to place + release a separate hold; product work → candidate for BACKLOG.
- **New add-on fields + partner compliance/KYC** — driver add-on (#1) and protection add-on (#2) reuse the add-on pattern; both need partner attestations (licensing, insurance certificates) collected at onboarding.
- **Channel inventory sync** — an availability/rates feed for OTAs (#3) can build on the existing availability API + per-partner webhooks; channel commission must be baked into on-channel rates. → candidate for BACKLOG if we pursue distribution.

_Last updated: 2026-06-03._
