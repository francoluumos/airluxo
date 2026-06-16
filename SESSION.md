# SESSION — handoff log

Read this first on a new start; update it at the end of every session.
Resume the conversation with **`claude --continue`** (approve the pending Playwright MCP when prompted).
This is the "where were we / what's next" pointer — see **BACKLOG.md** for the full roadmap and **TESTING.md** for the test suite.

---

## ▶ Pick up here — as of 2026-06-16

**Immediate next — finish content automation (mine ✅ → generate ⏳ → approve ✅ → publish ⏳):**
1. **Higgsfield credits** — account is on **free plan, 0 credits left** (the generation test used them). Top up / upgrade (PLUS/ULTRA) → then I generate real **Seedance video reels** (+ virality scoring). Images cost ~2 credits each; video needs the upgrade.
2. **Train a Higgsfield Soul ID** (`higgsfield-soul-id`, ~20 photos of the recurring couple/models) → consistent AI people across scenes. Send me the `reference_id`.
3. **Set the Vault service-role key** (one line in the SQL editor) → activates the **daily `content-scrape` cron** + the marketing crons: `select vault.create_secret('<SERVICE_ROLE_KEY>', 'sb_service_role_key');`
4. **Self-host Postiz on the Hostinger VPS** → follow `docs/content-automation/postiz-hostinger.md`, connect IG/TikTok/YouTube, add `POSTIZ_API_KEY` + `POSTIZ_BASE_URL` secrets → I build **U8** (publish). (Confirm Hostinger is a VPS.)
5. **⚠️ Rotate the Supabase personal access token** — a `sbp_…` token was pasted into chat + used all session: https://supabase.com/dashboard/account/tokens
6. Older threads: human-review AI DE/FR/IT (Translations, still `auto=true` 536/536); Stripe test-payment E2E; deferred exact Stripe billing for Finance.

**Decisions locked:** mining = **backend REST** (`content-scrape` + `APIFY_API` secret, primary) ; generation = **home 24/7 machine** runs the agent via the **Higgsfield MCP**, logged (routine `docs/content-automation/generation-agent.md`) ; publishing = **Postiz on Hostinger** ; approval gate stays (nothing auto-posts).

**State (all committed + pushed to `staging` AND promoted to `main`/prod; tip `ab1b288`). Prod still password-gated.**
- **Deploy flow this session:** migrations via the Supabase **Management API** (`/database/query` with the `sbp_` token), edge functions via `supabase functions deploy --project-ref shoeopxxjawmusgnjxfh` (CLI token), frontend promote `git push origin staging:main`. Captured in memory `airluxo-deploy-mechanics`. Prod = `main` branch; remove `SITE_PASSWORD` from Production scope to go live.
- **Founder dashboard** now opens on **Overview** (daily adds — leads/partners/customers/bookings/GMV, 7/30/90-day + period-over-period). New **Finance** (subscription run-rate + booking-fee revenue − discounts/credits, est.; booking-history table; **Excel exports** bookings/partners/customers; paginated) and **Security** (Developer → automated RLS/policy/definer/extension audit + manual checks, daily `pg_cron`). Menu order: Overview, Finance, Pipeline, Partners, Customers, Marketing, Content, Translations, Docs, Developer. Shared `usePager`/`TablePager` paginate all long tables (25/page).
- **Lead pipeline (CRM)** gained: hover **delete** on cards; **gear** → editable lead info sheet (double-width); **Swiss address autocomplete** (geo.admin.ch) + **VAT/UID** + **web/socials** multiselect + **website AI-enrich** (`enrich-prospect` edge fn — Gemini `url_context`+search reads the site, fills blanks) + a timestamped **activity-note log**. New `prospect_*` columns + `prospect_links` jsonb.
- **Content automation** (founder → **Content**) — mine + approve are LIVE: watchlist (add/pause/remove + **Scan now**), Inspiration (ranked reels with **▶ Watch**, **Add by link**, **delete**), **approval queue** (9:16 preview with **click-to-enlarge lightbox** + carousel frame nav, edit caption w/ hashtags, channels + datetime, approve→schedule / reject), Schedule. Backend live: `content_*` tables/RPCs, `content-media` bucket, edge fns `content-scrape` (Apify REST, `APIFY_API` secret, daily cron — needs Vault key), `content-inspiration-ingest`, `content-ingest`. **Generation** runs from the home machine via the Higgsfield MCP (routine in `generation-agent.md`); **publish** = Postiz on Hostinger (runbook `postiz-hostinger.md`). Plan: `docs/plans/2026-06-16-001-feat-content-automation-pipeline-plan.md`; setup: `docs/content-automation/SETUP.md`. **A live generation test produced a 2-frame carousel draft** (couple + Bentley + Swiss forest) sitting in the approval queue.
- **Brand favicons** (black customer / cream admin, swapped by `main.jsx` on `admin.*`). **Resend cold-mail templates** published: `prospect-preview-cold` (full) + `prospect-preview-short`, from `AIRLUXO <hello@send.airluxo.ch>`.
- **Tooling:** Higgsfield MCP + CLI authenticated; `higgsfield-*` skills installed (in gitignored `.agents/`); compound-engineering plugin (`/ce-plan`, `/ce-work`). i18n + Playwright state unchanged from 2026-06-10 (still pending human translation review).

---

## Log (newest first)

### 2026-06-16 (cont.) — Content automation build-out: mining live, generation test, docs backfill
- **Mining live (U3):** `content-scrape` edge fn (Apify Instagram Reel Scraper REST, `APIFY_API` secret, dual auth: service-role cron + admin) → ranks by recency-decayed `work_score` → upserts `content_inspiration`. **Scan now** button (Settings) + daily `content-scrape-daily` cron (needs Vault `sb_service_role_key`). Verified: a real scan pulled ~20 reels from a watchlist (e.g. @itisbainz). Hardened field-mapping + a sample-keys diagnostic.
- **Inspiration UX:** **Add by link** (manual hand-picked refs, `manual` badge, idempotent on `reel_url`), **▶ Watch** link per row, **delete** (✕). `content-inspiration-ingest` service-role write-path (for the agent).
- **Approval queue (U7) polished:** draft cards get a **click-to-enlarge lightbox** + **carousel frame nav** (arrows + dots, card + lightbox).
- **Generation contract + agent:** `content-ingest` service-role edge fn (generation → draft). Agent routine `docs/content-automation/generation-agent.md` (mine→brief→generate→score→ingest, brand guardrails incl. **3–6 hashtags**, beta/manual-link mode) — runs on the home 24/7 machine via the Higgsfield MCP, logged.
- **Live generation test:** via Higgsfield MCP (nano_banana image), produced a **2-frame carousel draft** (couple + Bentley Continental GT + misty Swiss alpine forest, golden hour) grounded to a real listing, emotion-first caption + hashtags + subtle `@airluxo` — now in the approval queue. Burned the free-plan credits (**0 left**); video reels + virality need a Higgsfield upgrade.
- **Postiz (U8) runbook:** `docs/content-automation/postiz-hostinger.md` (VPS docker-compose + Caddy SSL + per-platform OAuth + secrets). Deferred: Instagram saved-folder import (needs authenticated account access).
- **Architecture decision:** mining = backend REST (cleaner than MCP-in-agent once `APIFY_API` was set); generation = home-agent MCP; both Apify paths exist (REST + MCP added via `claude mcp add apify`).
- **Docs/changelog backfilled** (`src/lib/docs.js`): admin guide gained Overview/Finance/Content/Security sections + enriched Pipeline + prepended changelog for the whole day's work — after Franco flagged the in-app changelog had been skipped. New memory `update-changelog-every-feature` (update docs.js in the SAME commit, every feature).
- All promoted to `main`/prod incrementally. Tips this stretch: `0140c1b` (delete + docs backfill) → `642c99d` (carousel lightbox) → `ab1b288` (hashtag guardrail). Higgsfield CLI/skills + Apify MCP connected on the home machine.

### 2026-06-16 — Lead CRM upgrade · Overview/Finance/Security dashboards · content-automation Phase 1
- **Lead pipeline (CRM):** card **delete** (reuses `admin-delete-partner`); **gear → ProspectInfoModal** (double-width, 2-col) to view/edit a lead; **Swiss address autocomplete** (`AddressFields`/geo.admin.ch, white-input variant) + **VAT/UID** + **web/socials** multiselect (`prospect_links` jsonb) + **website AI-enrich** (new `enrich-prospect` edge fn: Gemini `url_context`+`google_search` reads the site → fills empty fields; bumped maxOutputTokens to 4096 to fix empty-response non-2xx); **activity-note log** (`partner_events` kind='note'). New `prospect_street/.../vat/website` cols + RPCs. Phone inputs strip spaces. AI-fill button + tables matched to the house design system (`Icon.ArrowUpRight`, standard table shell).
- **Overview** section (new, default landing): `admin_overview(days)` — daily leads/partners/customers/bookings/GMV + previous-period deltas + sparklines, 7/30/90 toggle.
- **Finance** section: `admin_financials(days)` (subscription run-rate from `plans.js` + service-fee + est. host-commission − discounts/loyalty; all "est.") + `admin_bookings_export`; booking-history table + **Excel exports** (lazy `xlsx`) for bookings/partners/customers; paginated.
- **Security** section (Developer): `security_audit_compute()` catalog checks (public-table RLS, RLS-without-policy, definer `search_path`, extensions-in-public) + manual config checks; `security_runs` table + daily `pg_cron`; "Run check now" + remediation list. First run: 0 fail, 2 warn (intentional deny-all tables; `pg_net` in public), 3 manual.
- **Shared pagination:** extracted `usePager`/`TablePager` (25/page, house `Icon.Arrow` nav) and applied to Finance, **Translations, Partners, Customers** — after Franco flagged that a pattern must be applied globally (memory `apply-ui-patterns-globally`).
- **Content automation Phase 1** (`/ce-plan` → `/ce-work`): plan + setup runbook written; built U1 (4 `content_*` tables + admin RPCs + `content-media` bucket + `src/lib/content.js`), U2 (Content section: watchlist / inspiration+add-by-link / drafts / schedule tabs), U7 (approval queue: media preview, caption edit, channel+datetime, approve→`admin_schedule_draft`/reject), and the `content-ingest` service-role edge fn. U3 (Apify), U5 (Higgsfield agent), U8 (Postiz) blocked on external provisioning.
- **Brand favicons** (cropped from `logo/airluxo-logos.png`) + runtime admin/customer swap. **Resend** cold-mail templates `prospect-preview-cold` + `prospect-preview-short` published. Installed Higgsfield CLI/skills + compound-engineering plugin.
- **All promoted to `main`/prod** incrementally (migrations via Management API, functions via CLI). New memories: `airluxo-deploy-mechanics`, `apply-ui-patterns-globally`. Tip `cb15e7a`.
- ⚠️ A Supabase `sbp_` access token was pasted in chat + used all session — **rotate it**.

### 2026-06-10 — Partner dashboard fully translatable (DE/FR/IT) + Developer menu + DEPLOY.md
- **i18n extraction complete:** all partner-dashboard surfaces now route through `t()` — 9 tabs (Overview, Settings, Bookings, Calendar, Earnings, Plans, Location, My fleet + Add/Edit-car) + sidebar/header chrome + setup tour (`Tour.jsx` + `PARTNER_TOUR`) + partner login (`PartnerLogin.jsx`). ~452 new `partner.*` keys in `src/locales/en.js`. Dates/months/weekdays localised via `Intl` (de-CH/fr-CH/it-CH); statuses/payment via a `statusLabel(t, …)` helper (stored values stay English). Committed per-section.
- **DE/FR/IT AI-filled:** `scripts/i18n-fill.mjs` (signs in as admin, calls the `translate` edge function, upserts to `public.translations`, `auto=true` → pending review). 452 × 3 = 1356 rows saved. Domain terms verified (Selbstbehalt/franchise/franchigia, Kaution/Caution, Provision/Commissione). Refine any in Founder → Translations.
- **Proven:** `partner.loggedin.spec.ts` now asserts the dashboard flips to German on switch (Active listings → Aktive Inserate). Logged-in suite 4/4 green (with creds).
- **Developer menu** added to the admin/founder dashboard — first card opens the latest Playwright report (local server + CI-runs link).
- **DEPLOY.md** written: Vercel + Hostpoint + git/gating runbook **and** the working-system section (per-domain docs, changelog-as-data, SESSION.md ritual, bootstrap instructions for new projects).
- **DE/FR/IT to 100% (536/536 each):** filled the remaining pre-existing customer-key gaps (French was 464/536) via `scripts/i18n-fill.mjs --gaps`. **Fixed** the founder "AI-fill N missing/stale" button (was 502/422 on big batches): now chunks 20 + retry, saving per chunk, resumable. `scripts/i18n-fill.mjs` gained `--gaps` + paginated DB read.
- **OPERATIONS.md #6** — customer prepaid credit balance (e.g. CHF 2000 → 2200 store credit); reuses `loyalty_ledger` + the authoritative checkout credit path; gating work is VAT/voucher accounting.
- Tips this session: `48aa04e` (fleet) → `374b7b1` (tour/login) → `b82a836` (DEPLOY) → `074c650` (AI-fill + DE test) → `dd2bc15` (docs) → `7a72c71` (batch fix + gaps + OPERATIONS #6). A transient disk-IO stall mid-session (git/node timeouts) was cleared; nothing lost.
- Note: the machine had a transient disk/IO stall mid-session (git/node timeouts); cleared a stale `.git/index.lock`. All work committed + pushed to `staging`.

### 2026-06-07 (cont.) — Test run archive + auto-run-on-push
- **Local archive:** `npm run test:archive` (`scripts/test-archive.mjs`) runs the suite, snapshots that run's HTML report into `test-archive/<date>__<branch>__<commit>/` (gitignored, never overwritten) + `summary.md`, and appends to `test-archive/INDEX.md` (logbook). Added a `json` reporter to the config for counts.
- **Auto-on-push:** `.githooks/pre-push` (wired via `core.hooksPath`) launches `test:archive` in the **background** on every push — non-blocking, report opens + archives when done. Skips on `CI` / `SKIP_E2E_HOOK=1`.
- **Logged-in on push too:** `test:archive` loads `.e2e.env` (gitignored: `E2E_PARTNER_EMAIL/PASSWORD`, a partner test account) so the partner logged-in flows run on every push, not just CI. Full suite = 53 (50 public + 3 logged-in).
- Reminder: the live `playwright-report/` is always the *last* run; history = `test-archive/` (local) + CI artifacts (per-commit, shareable).

### 2026-06-07 (cont.) — E2E flows via the Playwright MCP
- Approved + used the Playwright MCP (live browser) to map the booking + partner-login flows and author specs.
- Added `auth`, `marketplace`, `booking` flow specs + `HomePage`/`BookingModal` page objects. `data-testid` on car-card + calendar. 50 × 5 browsers green.
- **Auth fixture** (`auth.setup.ts` partner UI login → storageState) + `partner.loggedin.spec.ts` (language switch + tour replay). `setup` + `logged-in` projects in the config; CI secrets `E2E_PARTNER_*`. Verified with creds (all pass) and without (public pass, logged-in skip).

### 2026-06-07 — Playwright suite + white-page fix + i18n Phase 2
- **Fixed white-page crash** (`Footer` used `t()` without `useT()` → ReferenceError, blanked the app; build can't catch runtime errors). Found via headless console capture. `377ad9f`.
- **Added Playwright E2E suite**: `playwright.config.ts` (chromium/firefox/webkit/mobile-chrome/mobile-safari), `tests/smoke.spec.ts` (route mount + no-JS-error guard), CI workflow, `npm test` scripts, `.mcp.json` (Playwright MCP — pending approval), TESTING.md docs. `e20877e`.
- **i18n Phase 2a–2d**: extracted nav, account menu, hero/search, full booking flow, auth modal, Home marketing eyebrows + footer to `t()`. Founder Translations: status column, wider/auto-size cells, English locale names.
- Earlier in the session: i18n Phase 1 foundation + Translations section; marketing flows + Flows panel; partner setup-guide tour; scrollbar-gutter fix; AI car descriptions; delivery-address autocomplete; misc UI fixes.
