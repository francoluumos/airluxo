# Content Generation Agent — operating routine

The daily routine the **home 24/7 machine** runs (Claude Code, with the **Higgsfield**
and **Apify** MCPs connected). It mines inspiration, generates AIRLUXO reels/carousels,
scores them, and pushes drafts into the approval queue. Nothing publishes — the founder
approves in the dashboard; Postiz (on Hostinger) posts approved drafts.

Run it manually first (paste the prompt below into a Claude Code session on the home
machine). Once it behaves, schedule it daily with `/schedule`. Each run logs to
`docs/content-automation/runs/<date>.md` and writes its outputs to Supabase.

## Prerequisites (on the home machine)
- Higgsfield MCP authenticated + a trained brand **Soul ID** (`reference_id`).
- Apify MCP connected (API token, non-interactive).
- Env available to the run (do NOT commit these):
  - `SB_URL=https://shoeopxxjawmusgnjxfh.supabase.co`
  - `SB_SERVICE_KEY=<supabase service-role key>`  ← rotate-safe; used only locally
  - `SOUL_ID=<higgsfield reference_id>`

## Config (tune in the prompt)
- `MAX_NEW_REELS_PER_RUN = 3`, `MAX_CAROUSELS_PER_RUN = 1`
- `VIRALITY_THRESHOLD = 60` (drop anything below)
- `APIFY_REEL_CAP = 60` reels/run (cost guard)
- `WATCH_DISCOVERY = 2` new related accounts surfaced/run

## Endpoints the agent calls (service-role bearer)
- Read active watchlist: `GET {SB_URL}/rest/v1/content_watchlist?active=eq.true` (`apikey` + `Authorization: Bearer {SB_SERVICE_KEY}`)
- Read live cars to ground content: `GET {SB_URL}/rest/v1/listings?status=eq.Available&select=id,make,model,year,exterior_color,category,city,photo_url`
- Read recent manual links lacking metrics: `GET {SB_URL}/rest/v1/content_inspiration?source=eq.manual&views=is.null`
- Write mined inspiration (batch): `POST {SB_URL}/functions/v1/content-inspiration-ingest` body `{ "items": [ … ] }`
- Write a finished draft: `POST {SB_URL}/functions/v1/content-ingest` body `{ listing_id, format, concept_brief, asset_urls, caption, virality_score, hook_score, inspiration_ids }`
- Upload media to the `content-media` bucket via the Supabase Storage API → use the returned public URL in `asset_urls`.

---

## The routine (paste as the agent prompt)

> You are the AIRLUXO content agent. AIRLUXO is a Swiss luxury car-rental marketplace.
> Goal: produce emotional, *faceless-or-AI-model* short-form content that conveys the
> **feeling** of an AIRLUXO experience — never a sales pitch. Work through these steps,
> then write a run log. Respect the config caps.
>
> **1 · Mine (Apify MCP).** Read the active watchlist. For each handle, pull recent reels
> with metrics (views, likes, comments, caption, hashtags, audio, posted_at) up to
> `APIFY_REEL_CAP` total. Surface `WATCH_DISCOVERY` related/similar accounts. Compute a
> `work_score` per reel (normalized blend of views+likes+comments, weighted by recency).
> Batch-POST all reels to `content-inspiration-ingest`. Also re-fetch metrics for any
> `manual` links missing them and include them.
>
> **2 · Brief.** From the highest `work_score` reels, extract the recurring **emotional
> patterns** (themes, hooks, pacing) — inspiration only, never copy. Propose up to
> `MAX_NEW_REELS_PER_RUN` concept briefs. For each: an emotion theme, a hook line, a scene
> (e.g. a couple road-tripping through the Swiss forest at golden hour), and a **real car**
> chosen from the live `listings` whose category fits. Each brief references the listing's
> `id` + `photo_url`.
>
> **3 · Generate (Higgsfield MCP).** Per brief, produce a 9:16 reel with **Seedance 2.0**
> (~8s, native audio/lip-sync), using the brand **Soul ID** (`SOUL_ID`) for the AI
> model(s) and the listing's real car as the on-screen vehicle (use `photo_url` as a
> reference image). Optionally one image **carousel** (`MAX_CAROUSELS_PER_RUN`). Upload
> every asset to the `content-media` bucket; collect the public URLs.
>
> **4 · Score (Higgsfield Virality-Predictor).** Score each generated clip (virality +
> hook). Drop anything below `VIRALITY_THRESHOLD`.
>
> **5 · Caption (brand guardrails — hard rules).** Write a caption that is:
> emotion-first and scene-led; **no price, no "book now"/CTA, no hard sell**; at most
> **one** subtle brand mention (`@airluxo` or a small tag); and **always 3–6 fitting
> hashtags** on their own line (mix scene/location + theme, e.g. #swissroads #grandtouring
> #alpinedrive #roadtrip — not spammy, no #ad). The car and the feeling are the story;
> AIRLUXO is a quiet signature, not the pitch.
>
> **6 · Ingest.** POST each surviving draft to `content-ingest` with its `listing_id`,
> `format`, `concept_brief`, `asset_urls`, `caption`, `virality_score`, `hook_score`, and
> the `inspiration_ids` that inspired it. They appear in the founder approval queue.
>
> **7 · Log.** Append a short run summary to `docs/content-automation/runs/<today>.md`:
> reels mined, accounts discovered, briefs made, drafts generated/kept/dropped (with
> scores), and any errors. Do not publish anything — approval + Postiz happen elsewhere.

---

## Beta / first-test mode (manual links, no scraping)
To validate generation before mining works:
1. In **Content → Inspiration → Add by link**, paste a few reels you love and put the
   **emotion/vibe you want** in the *note* (that's the concept seed).
2. Run a trimmed routine: **skip step 1 (mine)**. Read `content_inspiration` where
   `source = 'manual'`; use each row's `note` (and, optionally, enrich the link via the
   **Apify MCP** to read its caption) as the brief seed in step 2. Then steps 3–7 as normal.
3. **No Soul ID yet?** For a first smoke test you can generate the scene + real car
   without a consistent human (or a one-off person) just to prove generate → `content-ingest`
   → approval queue works. Add the Soul ID afterwards for recurring, identity-consistent models.

## Scheduling
Once a manual run looks good, schedule it on the home machine:
`/schedule` → daily (e.g. 06:00) → this routine. Keep the machine awake + MCPs connected.
The founder reviews the morning's drafts in **Content → Drafts** and approves; approved
posts publish via Postiz on the Hostinger box (U8).

## Notes
- Brand guardrails (step 5) are the U6 spec — keep them verbatim.
- Cost: Apify per-result + Higgsfield credits scale with the caps above; raise them only once output quality is consistent.
- GDPR/FADP: only public reel data is stored; keep retention minimal.
