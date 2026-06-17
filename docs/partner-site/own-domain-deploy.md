# Own-domain deploy (U13)

Two ways to put a partner's published white-label site on their own domain. **Multi-tenant
is the default**; a dedicated Vercel project is the isolation upsell.

The partner site already serves at `airluxo.ch/p/<slug>` once published (U9/U12). These
steps add a custom domain on top.

## A) Multi-tenant (default) — partner CNAMEs at the shared deploy

One codebase, one Vercel deploy, infinite partners. The app resolves the partner from the
request hostname (`public_partner_site_by_host`), so no per-partner infra.

1. **Add the domain in AIRLUXO** — Brand & pitch → Own domain → enter `cars.partner.ch`.
2. **DNS at the partner's registrar** — add a `CNAME` record:
   `cars.partner.ch  →  cname.vercel-dns.com`
   (apex domains: use the registrar's ALIAS/ANAME, or an A record to Vercel's IP.)
3. **Add the domain to the Vercel `airluxo` project** — Vercel dashboard → Project →
   Settings → Domains → Add `cars.partner.ch`. Vercel issues TLS automatically.
4. **Mark verified** — once Vercel shows the domain valid, flip **Mark verified** in the
   Own-domain panel. The site is now live on the partner's domain (published + verified).

Notes
- Only **verified** domains of **published** sites resolve; everything else falls through
  to AIRLUXO. The main/admin/staging hosts are never treated as a tenant (see `App.jsx`
  `isOurHost`).
- `*.vercel.app` URLs are SSO-locked, so a custom domain is required to share externally
  (see the `vercel-staging-setup` note).

### Automating step 3 (optional)
Add a `VERCEL_TOKEN` (+ team id) Supabase secret and a `partner-domain` edge function that
calls the Vercel Domains API (`POST /v10/projects/{id}/domains`, then poll
`/v9/.../domains/{domain}/config` for `misconfigured=false`) to add + verify the domain and
write `verified` automatically. Until then, steps 3–4 are the manual dashboard flow above.

## B) Dedicated Vercel project (per-partner isolation)

For a VIP partner who wants full isolation.

1. **New Vercel project** from the same repo (`airluxo`), production branch `main`.
2. **Env**: set `VITE_PARTNER_ID=<partner uuid>` (and `VITE_PARTNER_SLUG=<slug>` if you wire
   a boot shortcut) so the build serves that partner's `PartnerSite` directly. *(Boot
   shortcut is a small follow-up — today the multi-tenant host route already serves them.)*
3. **Domain**: add the partner's domain to that project; TLS auto.
4. **Record it** — in the Own-domain panel add the hostname with kind `vercel` and store the
   `vercel_project_id` (via `admin_set_domain_verified`) for bookkeeping.

Multi-tenant (A) is the recommended default; reserve (B) for partners who explicitly need a
separate deployment.
