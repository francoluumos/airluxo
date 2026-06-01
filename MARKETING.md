# AIRLUXO — Marketing & Growth ideas

A living list of go-to-market ideas captured during build sessions, each with quick feedback.
Tag loosely: 💎 high fit · ⚠️ watch-outs · 🧭 strategic decision.

> Two assets we've **already built** power several of these: the **white-label embeddable booking widget** (drop AIRLUXO onto any partner/concierge site) and **per-listing home delivery**. A recurring **dependency** across ideas 1–2 is a **referral / promo-code / affiliate-tracking system** (unique codes, attributed commissions) — not built yet; worth adding to BACKLOG when we pursue these.

---

## 1. Luxury hotels as a concierge channel 💎
**Idea:** Identify Switzerland's luxury hotels and pitch AIRLUXO as their "car organizer" for high-profile guests — concierge books the car, we deliver it to the hotel.

**Feedback — strong fit, probably the best of the three.**
- Hotel guests are almost exactly our ICP: high-net-worth, short-term, want something special, low price-sensitivity. High intent, high margin.
- **Home delivery to the hotel + the embeddable widget** make this turn-key: a co-branded booking link / in-room QR / a tablet at the concierge desk. Concierge gets a referral commission per booking.
- **Watch-outs ⚠️:** don't scrape contacts in a ToS-violating way — start from curated public lists (**Swiss Deluxe Hotels** ≈ 40 members, **Relais & Châteaux**, 5-star register). Personalize outreach. Clarify the concierge commission/kickback up front. Need delivery coverage near the target hotels.
- **Start small:** pitch the ~40 Swiss Deluxe Hotels with a one-pager + a "concierge program" (QR/widget + referral fee). Measure bookings per hotel before scaling.

## 2. Luxury Airbnb / short-stay hosts as affiliates 💎
**Idea:** Partner with hosts of luxury Airbnb objects (chalets, villas) to advertise AIRLUXO in their listing or check-in message, with a guest discount + home delivery.

**Feedback — good fit, similar logic to hotels (guest wants a car on arrival).**
- The **check-in message / house manual is a high-intent touchpoint** — guest has just arrived somewhere remote-ish and wants mobility. Delivery to the property is the hook.
- Give hosts a **unique discount code + referral commission** so it's a win for them; this needs the **promo-code/affiliate system** noted above.
- **Watch-outs ⚠️:** Airbnb's ToS restricts pushing off-platform services *inside Airbnb messaging* — safer to place it in the **physical welcome book / printed guidebook / property manager's own channels** than in the Airbnb chat. Don't scrape Airbnb (ToS + brittle). Better: direct outreach to **luxury property managers** in St. Moritz / Gstaad / Verbier / Zermatt.
- **Start small:** pilot with a handful of luxury property managers in one alpine resort town; trackable code; see conversion.

## 3. Car meets — booth/display to recruit private owners 🧭⚠️
**Idea:** Attend car meets with a display to (a) build brand awareness and (b) recruit **private owners** to list their cars in future / give people a platform to rent.

**Feedback — great for brand & demand, but note a strategic fork.**
- **Brand/awareness:** car meets = enthusiasts who are both potential renters *and* owners. A booth with the booking widget on a tablet + a QR ("Browse / List your car") is cheap, on-brand reach.
- **🧭 Strategic flag:** recruiting **private owners** shifts us from a **B2B model (professional rental companies)** toward a **peer-to-peer model (Turo-style)**. That's a real expansion, not a tweak — it needs an **owner-side insurance product** (private cars used commercially), damage/claims handling, deposits, and heavier trust & verification than onboarding pro fleets. Decide deliberately before committing.
- **De-risked first step:** use the booth purely for **lead capture** — a "List your car / join the owner waitlist" signup + email collection. Gauge owner demand with zero P2P ops built. Build the P2P side only if the waitlist justifies it.
- **Watch-outs ⚠️:** event permits/insurance for the booth; have a polished one-card pitch + the marketplace live on a screen.

## 4. AI content engine — mine Instagram for ideas, generate with Higgsfield 💎⚠️
**Idea:** Maintain a curated set of Instagram accounts (saved in an "airluxo" collection — supercar pages, luxury-lifestyle, rental competitors, local hotspots). **Scrape their reels & posts with Apify** to surface what's working (formats, hooks, trending audio, cadence, top performers), turn those into content briefs, and **automate production with the Higgsfield MCP/CLI** (on-brand car reels & images). Also flag **collab / cross-promo candidates** from the same data.

**Feedback — strong organic-growth lever, but keep humans in the loop and scrape for *inspiration*, not reposting.**
- **Pipeline:** Apify `instagram-scraper` actor pulls posts/reels for the saved handles → rank by engagement/recency to spot winning formats & hooks → derive briefs → **Higgsfield generates** clips/stills (lock an on-brand composition, like our `studio-shot` pattern) → **human review** → schedule/post. Higgsfield MCP is already connected; Apify needs an account + API token + the chosen actor.
- **Collabs 🤝:** the same scrape ranks complementary accounts (watches, hotels, alpine lifestyle, detailers) by engagement + likely audience overlap → shortlist for cross-promo, gifted experiences, or co-branded reels. Ties into the hotel (#1) and Airbnb-host (#2) channels.
- **Watch-outs ⚠️:**
  - **IP / copyright:** use scraped content to learn *patterns*, never to repost others' footage. Generate our own assets.
  - **Instagram ToS + Apify:** scraping public IG is legally grey and IG actively rate-limits/blocks — keep volume low, research-only, no harvesting of personal data. Apify actors break when IG changes; expect maintenance.
  - **Brand risk of full automation:** don't auto-publish raw AI output — IG penalises spammy/synthetic posting and off-brand clips erode a luxury image. Keep a human approval gate. Mind **reel music licensing** (use IG's licensed library, not scraped audio).
- **Start small:** one weekly batch — scrape the saved list, pick 2–3 proven formats, generate a couple of Higgsfield reels, post manually, watch retention/saves in PostHog/IG insights before automating further.

---

## Cross-cutting enablers (turn ideas into machines)
- **Referral / promo-code / affiliate system** — unique codes, attribution, partner commissions. Unlocks hotels (#1) and Airbnb hosts (#2). → candidate for BACKLOG.
- **Trackable landing pages / UTM** — already have PostHog; tag campaign sources so we can measure each channel's bookings.
- **The embed widget + home delivery** — already built; lead with them in every pitch.
- **AI content pipeline (Apify scrape → Higgsfield generate → human review → post)** — see #4. → candidate for BACKLOG once it moves past manual weekly batches.

_Last updated: 2026-06-01._
