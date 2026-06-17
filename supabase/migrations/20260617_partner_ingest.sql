-- Partner ingest (Phase 2, U4). Storage for scraped brand assets, extra job columns
-- for the async crawl, an admin RPC to read a partner's latest ingest job, and the
-- cron that finalizes async crawls. The partner-ingest edge fn (Firecrawl) writes
-- brand_kit_raw / partner_pages / tech_stack on the partner and tracks progress here.

-- Brand assets (full-page screenshots, logos) — public read (non-sensitive branding);
-- writes are service-role only (the edge fn), so no insert/update policies needed.
insert into storage.buckets (id, name, public)
  values ('brand-assets', 'brand-assets', true)
  on conflict (id) do nothing;

-- Extra job columns: the crawl's discovered fleet URL + the car images it found
-- (downloaded into Storage by the poll), for the founder review/apply step (U6).
alter table public.partner_ingest_jobs
  add column if not exists fleet_url text,
  add column if not exists images jsonb not null default '[]'::jsonb;  -- [{url, source}]

-- Admin: the most recent ingest job for a partner (drives the Pipeline status line).
create or replace function public.admin_latest_ingest_job(p_partner_id uuid)
returns public.partner_ingest_jobs language sql security definer set search_path = public stable as $$
  select * from public.partner_ingest_jobs
  where public.is_admin() and partner_id = p_partner_id
  order by created_at desc limit 1;
$$;

-- ── Cron: finalize async crawls ─────────────────────────────────────────
-- Every 2 min, poll partner-ingest-poll (service-role bearer from Vault). It checks
-- Firecrawl for completed crawls, downloads car images to Storage, and flips the job
-- to ready. Until the Vault secret exists the scheduled run 401s (same as the other
-- crons); the on-demand ingest still kicks the crawl off.
create extension if not exists pg_net;
create extension if not exists pg_cron;

do $$ begin perform cron.unschedule('partner-ingest-poll'); exception when others then null; end $$;
select cron.schedule(
  'partner-ingest-poll',
  '*/2 * * * *',
  $$
  select net.http_post(
    url := 'https://shoeopxxjawmusgnjxfh.supabase.co/functions/v1/partner-ingest-poll',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'sb_service_role_key'), '')
    ),
    body := '{}'::jsonb
  );
  $$
);
