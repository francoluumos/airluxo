-- Marketing-mail foundation (lean in-house). Self-driven lifecycle flows send via
-- Resend from edge functions; these are the pieces every flow needs: a per-
-- subscriber unsubscribe token (one-click List-Unsubscribe, required by Gmail/Yahoo
-- for bulk mail) and a send log (idempotency + audit).

-- One-click unsubscribe token. Adding with a default backfills existing rows.
alter table public.newsletter_subscribers
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();
create unique index if not exists newsletter_subscribers_unsub_token_idx
  on public.newsletter_subscribers(unsubscribe_token);

-- Append-only log of every marketing send. The (flow, email, sent_on) unique key
-- makes a flow idempotent per day (a cron re-run never double-sends).
create table if not exists public.marketing_sends (
  id uuid primary key default gen_random_uuid(),
  flow text not null,
  email text not null,
  customer_id uuid references public.customers(id) on delete set null,
  subject text,
  sent_at timestamptz not null default now(),
  sent_on date not null default (now() at time zone 'Europe/Zurich')::date
);
create unique index if not exists marketing_sends_dedupe_idx
  on public.marketing_sends(flow, lower(email), sent_on);
create index if not exists marketing_sends_flow_idx on public.marketing_sends(flow, sent_at desc);

alter table public.marketing_sends enable row level security;
drop policy if exists marketing_sends_admin_read on public.marketing_sends;
create policy marketing_sends_admin_read on public.marketing_sends
  for select using (public.is_admin());
-- Writes happen only via the service role (edge functions), which bypasses RLS.
