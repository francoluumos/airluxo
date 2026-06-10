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
