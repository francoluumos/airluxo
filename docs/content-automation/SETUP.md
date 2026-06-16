# Content Automation — Setup Runbook

What's live + what you need to provision to unblock the rest of the pipeline.
Plan: `docs/plans/2026-06-16-001-feat-content-automation-pipeline-plan.md`.

## Live now (no setup needed)
- **Content** section in the founder dashboard (admin only), four tabs:
  - **Settings** — watchlist: add/pause/remove Instagram creators.
  - **Inspiration** — paginated list + **Add by link** (paste a reel/post URL → stored as a `manual` reference, enriched later by the scan).
  - **Drafts** — approval queue: media preview, virality/hook badges, editable caption, channel chips + datetime, **Approve & schedule** / **Reject**.
  - **Schedule** — scheduled/posted history.
- Backend: tables + admin RPCs, `content-media` storage bucket, and `content-ingest` (the endpoint the generator posts finished assets to).

## To unblock the pipeline — provision these

### 1. Apify (U3 — inspiration mining, via MCP)
- Create an Apify account → Console → Integrations → copy the **API token**.
- **Connect the Apify MCP to the generation agent** (not to Supabase). The scheduled Claude agent mines + discovers reels through the Apify MCP and writes them via the `content-inspiration-ingest` edge function (already deployed). So **no `APIFY_TOKEN` on Supabase and no scrape cron** — the token lives in the agent's MCP config, and it must auth non-interactively (API token, not a browser login) so it works in the scheduled run.
- Budget ~$1.50–2.60 / 1,000 reels — a per-run cap is set in the agent routine.
- ⚠️ Legal: scraping public reels is a ToS-gray area + a GDPR/Swiss-FADP consideration (storing creator data). Acceptable posture: public-only, minimal retention. Your call to accept.
- _(Fallback only if you ever want scraping decoupled from the agent: a `content-scrape` edge fn + cron + `APIFY_TOKEN` using the Apify REST API.)_

### 2. Higgsfield (U5 — generation)
- You already have the MCP + CLI authenticated.
- One-time: **train a brand Soul ID** for the recurring AI models (`higgsfield-soul-id`, ~20 photos). Note the returned `reference_id`.
- Decide the generation agent: a scheduled Claude Code routine (the `schedule` skill) that runs mine→brief→generate→virality and POSTs to `content-ingest`. I'll wire it once the Soul ID exists.
- (Optional) If you want fully-backend generation later: `HIGGSFIELD_API_KEY` (may require the ULTRA plan).

### 3. Postiz (U8 — scheduling/posting)
- Self-host Postiz (Docker + Postgres + Redis). One-command templates exist (Railway/Dokploy).
- Connect your **business** accounts inside Postiz: Instagram (Business/Creator via Graph API), TikTok (content-posting API — needs an audited app for auto-publish), YouTube (Data API). Each needs its own OAuth app credentials.
- Get the Postiz **API key** (Settings → Developers → Public API).
- Add Supabase secrets: `POSTIZ_API_KEY=<key>`, `POSTIZ_BASE_URL=<your-postiz-host>`.
- Then I build `content-publish` (upload → schedule) + the publish cron + status sync.

## Secrets summary (Supabase → Edge Functions → Secrets)
| Secret | For | Status |
|---|---|---|
| `POSTIZ_API_KEY` | U8 publish | needed |
| `POSTIZ_BASE_URL` | U8 publish | needed |
| `GEMINI_API_KEY` | concept briefs (U4) | already set |
| `sb_service_role_key` (Vault) | cron auth | already set |
| ~~`APIFY_TOKEN`~~ | — | not needed (Apify auth lives in the agent's MCP) |
| ~~`HIGGSFIELD_API_KEY`~~ | — | not needed (Higgsfield via the agent's MCP) |

## Deferred
- **Instagram "Saved" folder import** — your saved collections are private to your logged-in account; public scraping can't reach them. Needs authenticated session access (ToS-gray, account-ban risk) or a manual export. Revisit deliberately.
- Full hands-off auto-posting (approval gate stays until trusted).
