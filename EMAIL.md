# Email (Resend)

AIRLUXO sends all email through **Resend**. **Setup is live** (since 1 Jun 2026): the
`send.airluxo.ch` sending domain is **verified** (SPF/DKIM/DMARC), all `RESEND_*`
secrets are set, and **Supabase Auth custom SMTP → Resend** is configured (magic-link
/ password-reset emails deliver through Resend, not Supabase's rate-limited mailer).
Verified against the Resend logs 4 Jun 2026.

Flows:

| Flow | Function | Trigger | Secrets used |
|------|----------|---------|--------------|
| Partner new-booking alert | `booking-notify` | booking created | `RESEND_API_KEY`, `RESEND_FROM` |
| Guest booking confirmation | `booking-confirm` | booking created | `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_REPLY_TO` |
| Guest invoice / receipt | `booking-invoice` | capture succeeds (→ Confirmed) | `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_REPLY_TO` |
| Newsletter signup → SSOT + Audience + welcome | `newsletter-subscribe` | footer / checkout / profile | `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`, `RESEND_FROM` |
| Auth (magic link, password reset) | Supabase Auth | sign-in / reset | custom SMTP (Resend) |

All edge-function flows **no-op gracefully** until the secrets are set — so nothing sends by accident.

## Brand templates — where they live

Transactional email styling is centralised in **`supabase/functions/_shared/email.ts`** —
the single source of truth. It exports `emailShell({ preheader, heading, bodyHtml, footnote })`
(the AIRLUXO wordmark header, brand palette from `DESIGN.md`/`src/index.css`, footer),
plus `rows()`, `button()`, `chf()`, `esc()`. Every function imports it (`../_shared/email.ts`),
so changing the brand once updates all emails. Constraints baked in: inline styles + tables
(Outlook), a **system-font stack** (Clash Display / Satoshi don't load in mail clients), hidden preheader.

**Marketing campaigns** (newsletter blasts to the Audience) are built in **Resend → Broadcasts**
(visual editor; Resend injects the unsubscribe footer), *not* in code.

## Marketing lifecycle flows (lean in-house)

Triggered/time-based marketing (birthday, win-back, post-trip, new-models) runs on
**our own data** and sends via Resend — no external ESP, no second contact list.
Pieces:

- **Consent gate:** `newsletter_subscribers` (the SSOT). Only `subscribed = true` is mailed.
- **Idempotency + audit:** every send logs to `marketing_sends` with a `(flow, email, sent_on)`
  unique key, so a flow can't double-send in a day.
- **One-click unsubscribe:** each subscriber has an `unsubscribe_token`; marketing emails
  carry `List-Unsubscribe` headers (`unsubHeaders()`) + a footer link, both pointing at the
  `newsletter-unsubscribe` function (token-based, no auth). Required by Gmail/Yahoo for bulk mail.
- **Scheduling:** `pg_cron` POSTs to the flow's edge function daily; the function authorises by
  checking the bearer equals the service-role key, which cron reads from **Vault** at run time.

**Flows live:** `marketing-birthday` (daily 07:00 UTC) — branded birthday note + member gesture.

### ⚠️ One-time activation (required for any cron flow to send)

Run once in the **Supabase SQL editor** (so the key is never handled by tooling):

```sql
select vault.create_secret('<YOUR_SERVICE_ROLE_KEY>', 'sb_service_role_key');
```

Until that secret exists, the cron runs but `marketing-birthday` returns 403 (no sends).
Find the key in Supabase → Project Settings → API → `service_role`. To test immediately after:

```sql
select net.http_post(
  url := 'https://shoeopxxjawmusgnjxfh.supabase.co/functions/v1/marketing-birthday',
  headers := jsonb_build_object('Content-Type','application/json',
    'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='sb_service_role_key')),
  body := '{}'::jsonb);
```

> When deploying a function that imports `_shared/email.ts` via the MCP, include the shared
> file in the upload `files` array (name `../_shared/email.ts`) alongside `index.ts`.

> **One shared backend.** There is a single Supabase project (`shoeopxxjawmusgnjxfh`) behind *both* the production and staging frontends. These secrets are set once and apply to both. A booking made on `staging.airluxo.ch` will send real email just like production. Use test addresses when testing on staging.

## One-time setup

### 1. Verify a sending domain in Resend
In the [Resend dashboard](https://resend.com) → **Domains** → **Add Domain**, add a **subdomain** (don't use the bare `airluxo.ch` — a subdomain protects the root domain's reputation):

```
send.airluxo.ch
```

Resend then shows a set of DNS records (MX, SPF/TXT, DKIM, and a DMARC suggestion). **Copy them exactly** — the DKIM keys are unique to your domain.

### 2. Add those records at Hostpoint
DNS for `airluxo.ch` lives at **Hostpoint** (Control Panel → Domains → `airluxo.ch` → DNS). Add each record Resend listed. They'll look roughly like:

| Type | Host / Name | Value | Notes |
|------|-------------|-------|-------|
| MX | `send` | `feedback-smtp.<region>.amazonses.com` (prio 10) | bounce/complaint handling |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | SPF |
| TXT/CNAME | `resend._domainkey.send` (as shown) | (long DKIM value from Resend) | DKIM — copy verbatim |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@airluxo.ch` | recommended |

> Hostpoint asks for the **host** part only (e.g. `send`, not `send.airluxo.ch`). Wait a few minutes, then click **Verify** in Resend.

### 3. Create the newsletter Audience
Resend → **Audiences** → create one (e.g. "AIRLUXO Newsletter"). Copy its **Audience ID**.

### 4. Create an API key
Resend → **API Keys** → create one with **Sending access**. Copy it (shown once).

### 5. Set the Supabase secrets
Supabase dashboard → project `airluxo` → **Edge Functions → Secrets** (or **Project Settings → Edge Functions**), add:

```
RESEND_API_KEY      = re_xxxxxxxxxxxxxxxxxxxx
RESEND_AUDIENCE_ID  = <audience id from step 3>
RESEND_FROM         = AirLuxo News <noreply@send.airluxo.ch>
RESEND_REPLY_TO     = hello@airluxo.ch        # a real monitored inbox
```

(Or via CLI: `supabase secrets set RESEND_API_KEY=... --project-ref shoeopxxjawmusgnjxfh`.)

No redeploy needed — edge functions pick up secrets on the next invocation.

## Verify it works
- **Newsletter:** submit the footer form on staging with a test address → you should receive the welcome email and see the contact appear in the Resend Audience.
- **Booking:** make a test booking → guest gets "Booking received", partner gets "New booking".
- Check **Resend → Logs** for delivery status, and Supabase **Edge Function logs** for `{ sent: true }` vs `{ skipped: ... }`.

## Newsletter (Broadcasts)
Send campaigns from Resend → **Broadcasts**, targeting the Audience. Resend adds the unsubscribe link and manages opt-outs automatically (keeps you GDPR/FADP compliant). The signup form is single opt-in; switch to double opt-in later if desired.

## Later: separate marketing vs transactional
For stronger deliverability you can split senders so a marketing issue never delays a booking email — e.g. verify a second subdomain `news.airluxo.ch` and give `newsletter-subscribe` its own `RESEND_FROM`. Not needed at launch volume.
