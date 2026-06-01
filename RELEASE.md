# Releasing AIRLUXO

Two environments, both on the Vercel project `airluxo` (team `luumos-projects`):

| Env | Branch | URL | Gate |
|-----|--------|-----|------|
| **Production** | `main` | https://airluxo.ch · https://www.airluxo.ch | Basic-auth (`SITE_PASSWORD`, Production scope) until launch |
| **Staging** | `staging` | https://staging.airluxo.ch | Basic-auth (`SITE_PASSWORD`, Preview scope) |

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

## Going live (launch day)

Remove `SITE_PASSWORD` from the **Production** scope only (Vercel → Settings → Environment Variables), then redeploy `main`. Keep it on **Preview** so staging stays private.

```sh
# after removing the Production-scope SITE_PASSWORD in the dashboard:
git commit --allow-empty -m "chore: launch — drop production password gate" && git push
```

## URLs that are NOT gated by your password

The raw `*.vercel.app` deployment URLs are covered by the same `middleware.js` gate (since Vercel Authentication is off). The custom domains are the canonical entry points; share those.
