# Releasing AIRLUXO

Two environments, both on the Vercel project `airluxo` (team `luumos-projects`):

| Env | Branch | URL | Gate |
|-----|--------|-----|------|
| **Production** | `main` | https://airluxo.ch · https://www.airluxo.ch | Basic-auth (`SITE_PASSWORD`, Production scope) until launch |
| **Staging** | `staging` | https://staging.airluxo.ch | Basic-auth (`SITE_PASSWORD`, Preview scope) |
| **Founder** | `staging` (for now) | https://admin.airluxo.ch | `app_admins` allowlist + `is_admin()` (server-side) + staging Basic-auth |

Every push to a branch auto-deploys via Vercel's GitHub integration — no manual deploy step.

## Day-to-day flow

1. **Build on `staging`** (directly, or via feature branches merged into `staging`).
   ```sh
   git switch staging
   # ...commit work...
   git push            # auto-deploys to https://staging.airluxo.ch
   ```
2. **Test** on https://staging.airluxo.ch (log in with the staging username + password).
3. **Promote to production** once it looks good:
   ```sh
   ./scripts/promote.sh
   ```
   This fast-forwards `main` to `staging` and pushes — Vercel then deploys production.

`promote.sh` refuses to run unless `main` can fast-forward cleanly from `staging` (i.e. `staging` is `main` plus new commits), so production never gets anything that wasn't first on staging.

## Access (passwords)

Both environments are gated by `middleware.js` (HTTP Basic auth), active whenever `SITE_PASSWORD` is set:
- Username: `SITE_USER` (defaults to `airluxo`).
- Password: `SITE_PASSWORD`.

Scopes in Vercel → Settings → Environment Variables:
- **Preview** scope → gates staging. Keep it set always.
- **Production** scope → gates `airluxo.ch` pre-launch.

> Note: Vercel **Deployment Protection → Vercel Authentication is OFF**, so the custom-domain Basic-auth gate (not Vercel's team SSO) is what protects preview/staging. Don't re-enable it or external testers will be locked out.

## Founder / admin dashboard (admin.airluxo.ch)

Company-internal back office (the prospect/onboarding pipeline lives here), separate from the partner dashboard.

**How it loads:** the app renders the founder area when the hostname starts with `admin.` — or via `?admin` on any host (same code path, for testing). Access is gated **server-side** by the `app_admins` allowlist + the `is_admin()` helper, enforced in every admin RPC / edge function. The URL/subdomain is **not** the security boundary.

**Admins:** the `app_admins` table (seeded: `franco@luumos.io`). Add another:
```sql
insert into public.app_admins (user_id) values ('<auth.users.id>');
```

**Wiring the subdomain (one-time):**
1. **Vercel → Add Domain** `admin.airluxo.ch` → **Connect to an environment → the `staging` branch** — **NOT Production.** The founder code only lives on `staging`; production/`main` is behind and has no admin area, so pointing it at Production would serve the old site. Save.
2. **Hostpoint DNS:** explicit `CNAME admin → cname.vercel-dns.com` (the `*.airluxo.ch` wildcard would otherwise shadow it — same gotcha as staging).
3. Once it resolves, `admin.airluxo.ch` shows the founder login. The staging Basic-auth gate also covers it (it sits on the staging env) — an extra layer, fine.
4. When the founder dashboard is promoted to production, re-point `admin.airluxo.ch` to **Production**.

**Testing without the subdomain:** `https://staging.airluxo.ch/?admin` (identical code path). Quirk: in `?admin` mode the "Build fleet" impersonation shares the origin and will swap your session to the prospect — use an **incognito window**, or the real `admin.airluxo.ch` subdomain (separate origin) avoids it entirely.

**Prospect pipeline (sales previews):** create a prospect (no partner email needed) → **Build fleet** opens the prospect's dashboard via a magic link to upload cars → **Preview** shows the token-gated storefront (`?embed=<id>&preview=<token>`, "Sales preview" banner) → **Go live** claims it into a real partner account (sets their email, flips the cars live, returns a password-setup link to send them; they connect Stripe afterwards). Prospect cars are hidden from the public marketplace + map (RLS + query filters) and reachable only via the preview token. Admin edge functions (all `verify_jwt` on + `is_admin`-checked): `admin-create-prospect`, `admin-impersonate-prospect`, `admin-claim-prospect`.

## Going live (launch day)

Remove `SITE_PASSWORD` from the **Production** scope only (Vercel → Settings → Environment Variables), then redeploy `main`. Keep it on **Preview** so staging stays private.

```sh
# after removing the Production-scope SITE_PASSWORD in the dashboard:
git commit --allow-empty -m "chore: launch — drop production password gate" && git push
```

## URLs that are NOT gated by your password

The raw `*.vercel.app` deployment URLs are covered by the same `middleware.js` gate (since Vercel Authentication is off). The custom domains are the canonical entry points; share those.
