-- Daily schedule for the birthday flow. pg_cron POSTs to the marketing-birthday
-- edge function each morning (07:00 UTC ≈ 09:00 Europe/Zurich). The function
-- authorises the caller by checking the bearer equals the service-role key, so the
-- cron reads that key from Vault at run time (never stored in the job definition).
--
-- ACTIVATION (one manual step, run once in the Supabase SQL editor where you're
-- authenticated — the key is never handled by tooling):
--   select vault.create_secret('<YOUR_SERVICE_ROLE_KEY>', 'sb_service_role_key');
-- Until that secret exists the job runs but the function returns 403 (no sends).

create extension if not exists pg_net;
create extension if not exists pg_cron;

select cron.schedule(
  'marketing-birthday-daily',
  '0 7 * * *',
  $$
  select net.http_post(
    url := 'https://shoeopxxjawmusgnjxfh.supabase.co/functions/v1/marketing-birthday',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'sb_service_role_key'), '')
    ),
    body := '{}'::jsonb
  );
  $$
);
