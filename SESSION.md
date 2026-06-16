# SESSION — handoff log

Read this first on a new start; update it at the end of every session.
Resume the conversation with **`claude --continue`** (approve the pending Playwright MCP when prompted).
This is the "where were we / what's next" pointer — see **BACKLOG.md** for the full roadmap and **TESTING.md** for the test suite.

---

## ▶ Pick up here — as of 2026-06-16

**Immediate next (pick any):**
1. **Provision content-automation externals** (see `docs/content-automation/SETUP.md`), then I build the blocked phases: add `APIFY_TOKEN` → U3 scrape; train a Higgsfield **Soul ID** → U5 generation agent (the `content-ingest` target is already live); self-host **Postiz** + connect IG/TikTok/YouTube + `POSTIZ_API_KEY`/`POSTIZ_BASE_URL` → U8 publish. U4/U6 (Gemini concept-brief + caption guardrails) build alongside U5.
2. **⚠️ Rotate the Supabase personal access token** — a `sbp_…` token was pasted into the chat this session and used for all migrations/function deploys. Kill it: https://supabase.com/dashboard/account/tokens
3. **Human-review the AI DE/FR/IT** in Founder → Translations (still all `auto=true`, 536/536). Tighten awkward rows; saving marks reviewed.
4. Earlier open threads: full booking → licence → **Stripe test payment** E2E; **customer-account** logged-in flows; activate marketing sends (Vault key); the deferred **exact Stripe billing** for Finance (replace run-rate/commission estimates).

**State (all committed + pushed to `staging` AND promoted to `main`/prod; tip `cb15e7a`). Prod still password-gated.**
- **Deploy flow this session:** migrations via the Supabase **Management API** (`/database/query` with the `sbp_` token), edge functions via `supabase functions deploy --project-ref shoeopxxjawmusgnjxfh` (CLI token), frontend promote `git push origin staging:main`. Captured in memory `airluxo-deploy-mechanics`. Prod = `main` branch; remove `SITE_PASSWORD` from Production scope to go live.
- **Founder dashboard** now opens on **Overview** (daily adds — leads/partners/customers/bookings/GMV, 7/30/90-day + period-over-period). New **Finance** (subscription run-rate + booking-fee revenue − discounts/credits, est.; booking-history table; **Excel exports** bookings/partners/customers; paginated) and **Security** (Developer → automated RLS/policy/definer/extension audit + manual checks, daily `pg_cron`). Menu order: Overview, Finance, Pipeline, Partners, Customers, Marketing, Content, Translations, Docs, Developer. Shared `usePager`/`TablePager` paginate all long tables (25/page).
- **Lead pipeline (CRM)** gained: hover **delete** on cards; **gear** → editable lead info sheet (double-width); **Swiss address autocomplete** (geo.admin.ch) + **VAT/UID** + **web/socials** multiselect + **website AI-enrich** (`enrich-prospect` edge fn — Gemini `url_context`+search reads the site, fills blanks) + a timestamped **activity-note log**. New `prospect_*` columns + `prospect_links` jsonb.
- **Content automation Phase 1 live** (founder → **Content**): watchlist (add/pause/remove creators), Inspiration (+**Add by link**), **approval queue** (preview · edit caption · channels + datetime · approve→schedule / reject), Schedule. Backend: `content_*` tables + RPCs, `content-media` bucket, `content-ingest` edge fn. Phases 2–4 (Apify/Higgsfield-agent/Postiz) blocked on external setup — plan `docs/plans/2026-06-16-001-feat-content-automation-pipeline-plan.md`, runbook `docs/content-automation/SETUP.md`.
- **Brand favicons** (black customer / cream admin, swapped by `main.jsx` on `admin.*`). **Resend cold-mail templates** published: `prospect-preview-cold` (full) + `prospect-preview-short`, from `AIRLUXO <hello@send.airluxo.ch>`.
- **Tooling:** Higgsfield MCP + CLI authenticated; `higgsfield-*` skills installed (in gitignored `.agents/`); compound-engineering plugin (`/ce-plan`, `/ce-work`). i18n + Playwright state unchanged from 2026-06-10 (still pending human translation review).

---

## Log (newest first)

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
