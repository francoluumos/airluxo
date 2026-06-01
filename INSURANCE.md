# Master-policy / zero-deposit — insurer conversation foundation

A starting brief for talking to insurers/brokers (AXA, Die Mobiliar, Allianz, or a specialist motor-fleet broker) about underwriting **zero cash deposit** + a **damage-protection** product for AIRLUXO. Goal: let guests book luxury cars with **CHF 0 deposit** and a defined excess, sold as a per-booking fee. See OPERATIONS.md #2.

## 1. The model (one-paragraph pitch)
AIRLUXO is a Swiss marketplace connecting **professional luxury/exotic car rental companies** (our partners) with vetted drivers. Partners own and operate the cars and carry their own fleet insurance today; AIRLUXO handles discovery, booking, payments (Stripe Connect), and driver verification. We want an insurance/protection layer so we can remove the cash deposit and offer a clear damage-protection option at checkout.

## 2. What we're asking for (two phases)
- **Phase 1 — partner-backed (fast):** partners' fleet policies stay **primary**; we add a **damage-protection / zero-excess buy-down** sold per booking, plus a Stripe **pre-authorisation hold** as the fallback "deposit" (no cash captured). Ask the insurer/broker for a per-booking buy-down product that sits on top.
- **Phase 2 — marketplace master policy:** a single umbrella policy covering all bookings platform-wide, with a per-booking **protection fee**, for true zero-deposit regardless of partner.

## 3. What the insurer will want to know (prepare answers)
- **Coverage scope:** collision, theft, fire, vandalism, glass/tyres, third-party liability; **territory** (CH + cross-border EU — we have a cross-border add-on).
- **Excess levels** + the zero-excess buy-down option and its price.
- **Per-vehicle sum insured ceiling** — exotics can be **CHF 200k–500k+**; agreed-value vs market-value.
- **Driver eligibility / underwriting:** min age, licence tenure, permit categories.
- **Interaction with partners' fleet policies:** primary vs excess layer, named insured, subrogation/recourse.
- **Claims:** FNOL process, who adjusts, approved repair network, settlement SLA.
- **Pricing basis:** by car-value band × rental duration × driver-risk.
- **Volume / data:** expected bookings, average duration, fleet values, historical claims (limited — early stage).

## 4. What AIRLUXO brings (de-risks the underwriting)
- **Verified driver licence KYC at booking** — we hold (with consent) name, DOB, issue date, permit categories, document number; shareable for underwriting.
- **Stripe authorize→capture + a refundable pre-auth hold** — deposit fallback and a clean mechanism to capture damage costs.
- **Curated supply** — professional rental companies, not random peer-to-peer.
- **Structured data** — fleet values, utilisation, booking durations, locations.

## 5. Regulatory flag (Switzerland) — get advice early
Distributing insurance in CH likely requires **FINMA registration as an insurance intermediary**, and the "damage protection" must be structured deliberately — a genuine **insurance product** vs a contractual **damage waiver** have different legal/regulatory treatment (and different **VAT** treatment on the fee). Engage a **specialist broker** to intermediate and a **lawyer** to structure the product and our role (introducer vs coverholder/MGA vs group-policyholder).

## 6. The ask, in one line
"We want a per-booking damage-protection / zero-excess product (Phase 1 on top of partners' fleet cover, Phase 2 as a marketplace master policy) that lets us offer CHF 0 deposit — priced by car value and duration, with our licence-KYC + payment-hold data to support underwriting."

## Product/tech we already have to support it
- Stripe authorize→capture (`stripe-create-payment` / `stripe-capture`) — extend to place + release a separate **pre-auth hold**.
- Licence KYC (`verify-licence`, licence on file in `customers.licence`).
- The **add-on pattern** (cross-border, delivery, after-hours) — a "damage protection" add-on reuses it (per-booking fee + price-breakdown line). See BACKLOG "zero security deposit + pre-auth hold".
