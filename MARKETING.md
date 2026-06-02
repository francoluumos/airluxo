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

## 5. Offline placements at high-net-worth venues (ads / flyers) 💎⚠️
**Idea:** Advertise physically where our ICP already gathers — **luxury hotels, golf clubs, cigar lounges**, and possibly **Rotary clubs** (plus yacht/private members' clubs, watch boutiques, fine dining). Tasteful printed cards / small framed displays / a card at the concierge or valet desk.

**Feedback — high-signal audience targeting; the catch is permission, material quality, and tracking.**
- **Why it works:** these venues concentrate exactly the affluent, experience-seeking audience we want — very little wasted spend vs broad digital. Pairs with the hotel-concierge channel (#1).
- **Make it trackable:** every placement gets a **unique QR → a UTM'd landing page and/or a venue-specific promo code**, so we can see scans → bookings per venue (we already have PostHog; promo codes are the referral enabler below). Otherwise it's unmeasurable spend.
- **Watch-outs ⚠️:** **get permission** — don't just drop flyers (looks cheap/unauthorized and can get pulled); the **material must look luxury** (heavy stock, restrained design) or it hurts the brand; **Rotary & private clubs are relationship networks**, so a **member introduction or a short talk/sponsored evening lands far better than flyers**; some venues will expect a kickback/partnership (tie to the concierge commission in #1).
- **How to start:** pilot a handful of venues in one city (Geneva / Zürich / St. Moritz), a **distinct QR + code per venue**, premium cards, measure scans→bookings over a few weeks before scaling. Lead with a partner venue that already fits (a hotel from #1).

## 6. Airbnb's growth playbook — reference + what we steal 💎
**Source:** [How Airbnb grew 0→1B bookings (buildd.co)](https://buildd.co/marketing/airbnb-marketing-strategy). Distilled, mapped to AIRLUXO:
- **Referral program = their single biggest lever (~900% annual growth).** Double-sided travel credits (referrer *and* referee). → This is #7 below.
- **Professional photography fixed conversion.** Founders shot listings themselves. → We already automate this with **`studio-shot`** (clean white studio thumbnails); keep it sharp (it's our equivalent of their photo program).
- **Solve the chicken-and-egg by going where demand already is.** They poached Craigslist listings + targeted conference attendees (600 DNC stays). → Our analogue: the **hotel-concierge (#1)** and **luxury-host (#2)** channels put us in front of guests at the high-intent moment; recruit supply from pro fleets first.
- **Trust mechanisms unlock high-ticket bookings.** Reviews, Superhosts, **AirCover insurance (up to $1M)**, transparent pricing. → We mirror with **verified-host badges, licence KYC, itemized pricing, and the damage-protection add-on** (our "AirCover").
- **Brand over performance spend; UGC + SEO.** "Live like a local," #airbnbhost (103k posts), Pineapple magazine. → Our analogue is the **AI content engine (#4)** + UGC of cars in iconic Swiss settings; lead with brand, not discount.
- **"Superhost" status drives quality.** → A **partner quality tier** (response rate, ratings) could feed featured placement (ties to the subscription tiers).

## 7. Referral + loyalty / tiers for recurring customers 💎🧭 — the biggest lever
**Idea:** Build AIRLUXO's compounding-retention engine: a **double-sided referral** program + a **loyalty tier** system (à la Booking.com **Genius**), where recurring customers and referrers earn points redeemable for perks — free add-ons (e.g. damage protection), upgrades, group-booking discounts, and access.

**Feedback — agreed, this is the highest-leverage growth+retention play; design it luxury, not discounty.**
- **Why it's the lever:** luxury rentals are high-ticket and infrequent, so **repeat + referred guests are the cheapest, highest-LTV demand** there is. Airbnb's referral program alone drove ~900% growth; Booking.com's Genius tiers are a retention moat. A great first trip + a reason to come back (and bring friends) beats paid acquisition.
- **🧭 Brand rule:** a luxury brand must **not feel like a coupon site.** Frame everything as **membership, credits, access, and upgrades** — not "% off." Booking.com can shout discounts; we lean on status, priority, and complimentary upgrades.
- **Two pillars:**
  1. **Double-sided referral (Airbnb-style):** every member gets a personal code; the **referee** gets a credit/perk on their first trip, the **referrer** gets a credit once that trip completes. We can **largely reuse the existing promo/affiliate system** (codes, attribution, funded_by, commission) — the referral layer is close to free to ship.
  2. **Loyalty tiers (Booking.com Genius-style):** levels earned by trips or trailing-12-month spend, each unlocking better perks. Working name **"Keys": Silver → Gold → Platinum → Noir.**

**Creative loyalty incentives (the brainstorm):**
- **Comp the damage-protection add-on** at higher tiers — strong, on-brand ("you're covered, on us"), and ties straight into Stage A.
- **Free / discounted home delivery & collection.**
- **Complimentary category upgrade** when the next class up is idle (cheap to give, feels premium).
- **Group / friend-booking rewards** — book several cars together (ties to the *group-ride* backlog feature): the organiser earns bonus points, everyone in the group gets a perk. Turns one booking into many + referrals.
- **Member credit** toward the next trip (frame as credit, not discount) + **birthday / anniversary credit.**
- **Waived AIRLUXO service fee** at the top tier.
- **Priority & early access** to new and rare/exotic inventory; first dibs on event-weekend availability.
- **Extended mileage / late-return grace / free additional driver** as tier perks (concierge feel, low cash cost).
- **Experiential (top tier "Noir"):** a curated drive / track day, or partner perks (a night at a #1 hotel partner, a fine-dining table) via the concierge network — points as access to *experiences*, not money off.
- **Status match:** instantly match a guest's Booking.com Genius / airline / hotel status to an AIRLUXO tier — a fast HNW-acquisition hook.
- **Earn beyond spend:** points for **reviews**, completing **licence KYC**, and **midweek/idle-fleet** trips (doubles as a fleet-utilisation lever — reward filling the quiet days).
- **Soft anti-churn:** points keep their value while you stay active; a gentle "your Gold status renews if you take one trip this year" nudge.

**Build:** the data model (`loyalty_ledger`, points, tiers, referrals) + phased rollout (referral first, then points, then checkout redemption, then tier perks) is speced in **[BACKLOG → Loyalty & referral program](BACKLOG.md)**. Earn on *completed* trips only (avoid cancellation-gaming); redemption must be **authoritative server-side** in `stripe-create-payment`.

---

## Cross-cutting enablers (turn ideas into machines)
- **Referral / promo-code / affiliate system** — unique codes, attribution, partner commissions. **Partly built already** (`promo_codes` + `validate_promo` + affiliate commission + checkout `PromoField` + authoritative discount in `stripe-create-payment`). Unlocks hotels (#1) and Airbnb hosts (#2), and is the **base for the customer loyalty + referral program (#7)** — the points/tiers layer is the new build (see BACKLOG).
- **Trackable landing pages / UTM** — already have PostHog; tag campaign sources so we can measure each channel's bookings.
- **The embed widget + home delivery** — already built; lead with them in every pitch.
- **AI content pipeline (Apify scrape → Higgsfield generate → human review → post)** — see #4. → candidate for BACKLOG once it moves past manual weekly batches.

_Last updated: 2026-06-02._
