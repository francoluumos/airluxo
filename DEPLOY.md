# Deploy & gating — AIRLUXO (Vercel + Hostpoint + git)

How this project is deployed, gated pre-launch, and released. Written so it can be
**replicated on another project** — see the ordered checklist at the bottom.

---

## 1. Git branch model

Two long-lived branches, each wired to a Vercel environment:

| Branch    | Vercel env            | Domain(s)                          |
| --------- | --------------------- | ---------------------------------- |
| `main`    | Production            | `airluxo.ch`, `www.airluxo.ch`     |
| `staging` | Preview (branch deploy) | `staging.airluxo.ch`             |

- `staging` mirrors `main`; you work on `staging` and **promote staging → main** for a
  release (merge / fast-forward). Never commit straight to `main`.
- Vercel's GitHub integration auto-builds the matching environment on every push — no
  CI config is needed for the deploy itself.

## 2. Vercel project

- Project: `airluxo` (team `luumos-projects`). Framework preset: **Vite**.
- Linked via the `vercel` CLI → `.vercel/` folder, which is **gitignored**.
- Assigning a domain to a specific Git branch (e.g. `staging.airluxo.ch` → `staging`) is
  **dashboard-only** (Settings → Domains → assign to branch). The CLI can't do it.
- No `vercel.json` required — Vite defaults + `middleware.js` are enough.

## 3. The password gate — and the key gotcha

There are **two independent protection layers**. Conflating them is the classic mistake:

- **A. Vercel SSO (Deployment Protection)** guards the auto `*.vercel.app` preview URLs.
  Only Vercel team members can open them; the Basic-auth middleware does **not** run
  there. These URLs can't be shared externally.
- **B. Our own HTTP Basic-auth middleware** runs on the **custom domains**
  (`airluxo.ch`, `staging.airluxo.ch`), which serve *without* Vercel SSO. This is what
  lets us share a private link with outsiders (credentials, no Vercel account needed).

➡️ **To share staging externally, use the custom domain `staging.airluxo.ch` — never the
`.vercel.app` URL.**

The gate lives in `middleware.js` (Vercel Edge Middleware, repo root). It protects the
**whole site, but only when `SITE_PASSWORD` is set**:

```js
export const config = {
  // Gate every path EXCEPT Vercel internals and the favicon.
  matcher: ['/((?!_vercel|favicon.ico).*)'],
}

export default function middleware(request) {
  const password = process.env.SITE_PASSWORD
  if (!password) return                       // unset → public (this is the launch state)
  const user = process.env.SITE_USER || 'airluxo'
  const expected = 'Basic ' + btoa(`${user}:${password}`)
  if (request.headers.get('authorization') === expected) return
  return new Response('Authentication required.', {
    status: 401,
    headers: {
      // Realm must be ASCII-only, or the header is invalid and the browser
      // never shows its login dialog.
      'WWW-Authenticate': 'Basic realm="AIRLUXO private preview", charset="UTF-8"',
    },
  })
}
```

Two non-obvious details: the `matcher` must exclude `_vercel` + `favicon.ico` (else the
gate blocks Vercel internals), and the `realm` string must be **ASCII-only**.

**Env-var scopes are the launch switch:**

- Pre-launch: set `SITE_PASSWORD` (+ optional `SITE_USER`, default user `airluxo`) on
  **both Production and Preview** scopes → the whole site is gated.
- **Go live = delete `SITE_PASSWORD` from the Production scope only.** Keep it on Preview
  so staging stays private forever.
- A white page on a custom domain is almost always just this gate → re-enter the
  Basic-auth credentials (user `airluxo`).

## 4. DNS at Hostpoint (not delegated to Vercel)

The domain's nameservers stay at **Hostpoint** (`ns*.hostpoint.ch`) — DNS is **not**
delegated to Vercel. So each subdomain needs a record added in Hostpoint's DNS panel:

- `staging` → **CNAME** → `cname.vercel-dns.com`
- apex / `www` → the A / CNAME values Vercel shows in Settings → Domains.

Add the record at Hostpoint; Vercel then verifies and issues the TLS cert automatically.

## 5. Git commit / push conventions

- Work on `staging`; **promote to `main`** for releases. Never push to `main` directly.
- Commit only when asked; small, focused commits with a subject + a body that explains
  *why*. Commit messages end with a `Co-Authored-By:` trailer.
- **Pre-push hook** (`.githooks/pre-push`, enabled with `git config core.hooksPath
  .githooks`): on every push it launches the Playwright suite **in the background**
  (non-blocking — the push is not held or blocked), then opens + archives the report.
  Skips when `CI` is set or with `SKIP_E2E_HOOK=1 git push` (used during rapid commits).
- **GitHub Actions** (`.github/workflows/e2e.yml`) runs the same suite on push/PR to
  `main`/`staging` and uploads the report artifact — the durable, per-commit test history.
- See `TESTING.md` for the test suite and the three run-history trails.

---

## Replicate on a new project (ordered)

1. Create `main` + `staging` branches; push both.
2. `vercel link` the repo; gitignore `.vercel/`. Set framework preset.
3. Add `middleware.js` at the repo root (snippet above; change the realm name).
4. Set `SITE_PASSWORD` on **Production and Preview** in Vercel env settings.
5. Vercel → Domains: attach apex/`www` to `main`, and `staging.<domain>` to the
   `staging` branch.
6. Hostpoint DNS: add the CNAME(s) Vercel requests (`staging` → `cname.vercel-dns.com`,
   plus apex records).
7. (Optional) Add the pre-push hook + `core.hooksPath`, and the e2e GitHub Action.
8. **Launch:** remove `SITE_PASSWORD` from the Production scope only.

---

# Working system — docs, changelog & SESSION.md

This is the preferred operating model: **knowledge lives in the repo, not in chat
history.** Every concern gets a small Markdown file; the agent reads them at the
start of a session and updates them as part of the work. Replicate this on a new
project — it's the system to carry forward.

## 1. Per-domain Markdown docs (repo root)

One file per concern, kept short and current. The agent reads the relevant one before
working in that area and updates it when the area changes. AIRLUXO's set (adapt names to
the project):

| File | What it holds |
| --- | --- |
| `PRODUCT.md` | What the product is, who it's for, the core model. |
| `DESIGN.md`  | Visual system: tokens, type, spacing, components, brand rules. |
| `BACKLOG.md` | The full roadmap / open threads (the "everything we might do" list). |
| `SESSION.md` | Handoff log — where we are, what's next (see §3). |
| `RELEASE.md` | Branch→env table + the promote-to-prod flow (`scripts/promote.sh`). |
| `DEPLOY.md`  | This file — infra, gating, DNS, git conventions. |
| `TESTING.md` | Test suite, how to run it, the run-history trails. |
| domain files | One each for real subsystems: `EMAIL.md`, `AUTH.md`, `PROMO.md`, `OPERATIONS.md`, `MARKETING.md`, `INSURANCE.md`, `CANCELLATION_POLICY.md`, … |

Rules: keep each file tight (most are < 130 lines); convert relative dates to absolute;
when code and a doc disagree, fix the doc in the same change. New non-obvious subsystem →
new `<NAME>.md`, don't bloat an existing one.

## 2. Changelog = data, rendered in-app

The changelog is **not** a `CHANGELOG.md` — it's structured data the app renders, so it's
visible to the actual audience (here: partners), and **updated with every shipped change**:

- Source of truth: `src/lib/docs.js` (a `changelog` array of releases — version/date +
  bullet list, plus the guide content).
- Rendered by the in-app **Docs hub** (`src/components/Docs.jsx`, reached at `/?docs`,
  with a "Changelog" section), and linked from the dashboard's "Guide & changelog" card.
- Convention (stated at the top of `docs.js`): *keep the changelog updated with every
  change.* Shipping a user-visible change = add a changelog entry in the same commit.

For a new project: keep a changelog as data next to the code and surface it in-app, rather
than a loose Markdown file no user ever sees. (A plain `CHANGELOG.md` is a fine fallback if
there's no in-app docs surface yet.)

## 3. SESSION.md — the handoff ritual

The single "where were we / what's next" pointer. **Read it first every session; conclude
every session by updating it.** Structure:

```markdown
# SESSION — handoff log

Read this first on a new start; update it at the end of every session.
This is the "where were we / what's next" pointer — see BACKLOG.md for the full
roadmap and TESTING.md for the test suite.

## ▶ Pick up here — as of <absolute date>
**Immediate next:** <the one or two things to do next>.
**State (all committed + pushed to `staging`; tip `<sha>`):** <bullet list of what's live>
**Open threads (pick any):** <short list, or pointer to BACKLOG.md>

## Log (newest first)
### <date> — <headline>
- <what changed, with commit refs>
```

Conventions: newest entry on top; the `▶ Pick up here` block always reflects the *current*
tip; reference commit SHAs so the log ties to git history; keep entries to what a future
reader needs, not a transcript.

## 4. Git + release flow (recap)

- Work on `staging`; commit small and focused; promote to `main` via `scripts/promote.sh`
  (fast-forwards `main` from `staging` — so prod never gets anything not first on staging).
- Pre-push hook runs the test suite in the background + archives the report (see `TESTING.md`).

## 5. (Claude Code) persistent memory

Beyond the repo docs, durable cross-session facts live in Claude Code's file memory
(`~/.claude/projects/<project>/memory/` + a `MEMORY.md` index) — things not derivable from
the code: env quirks, the SSO-vs-Basic-auth gotcha, the project ref, etc. Repo docs are for
anyone; memory is the agent's private notebook. Don't duplicate the repo in memory.

## Bootstrap a new project with this system (initial instructions)

1. Create `PRODUCT.md`, `DESIGN.md`, `BACKLOG.md`, `SESSION.md`, `RELEASE.md`, `DEPLOY.md`,
   `TESTING.md` at the repo root (stub them; fill as you go).
2. Add a changelog as data + an in-app docs/changelog surface (or a `CHANGELOG.md` stub).
3. Seed `SESSION.md` with a `▶ Pick up here` block and an empty `Log`.
4. Tell the agent, as standing instructions: *"Read SESSION.md first. Keep the per-domain
   `.md` docs and the in-app changelog current as you work. Conclude every session by
   updating SESSION.md (newest entry on top, refresh ▶ Pick up here). Work on `staging`,
   promote to `main`."*
