-- Daily inspiration scrape. pg_cron POSTs to content-scrape each morning; the function
-- mines the active watchlist via Apify and upserts content_inspiration. Bearer = the
-- service-role key from Vault (same setup as the marketing crons). Until that Vault
-- secret exists the scheduled run 401s — the admin "Scan now" button works regardless.
--
-- ACTIVATION (one-time, if not already done for marketing — run in the SQL editor):
--   select vault.create_secret('<YOUR_SERVICE_ROLE_KEY>', 'sb_service_role_key');

create extension if not exists pg_net;
create extension if not exists pg_cron;

do $$ begin perform cron.unschedule('content-scrape-daily'); exception when others then null; end $$;
select cron.schedule(
  'content-scrape-daily',
  '0 5 * * *',
  $$
  select net.http_post(
    url := 'https://shoeopxxjawmusgnjxfh.supabase.co/functions/v1/content-scrape',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'sb_service_role_key'), '')
    ),
    body := '{}'::jsonb
  );
  $$
);
