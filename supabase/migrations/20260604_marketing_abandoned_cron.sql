-- Hourly schedule for abandoned-booking recovery. Sends the reminder 1–48h after a
-- guest abandoned checkout (kept "soon, not weeks later" per the legal guidance).
-- Auth via the service-role key from Vault (see 20260604_marketing_birthday_cron.sql).

select cron.schedule(
  'marketing-abandoned-hourly',
  '15 * * * *',
  format($c$select net.http_post(url := %L, headers := %s, body := '{"flow":"abandoned"}'::jsonb);$c$,
    'https://shoeopxxjawmusgnjxfh.supabase.co/functions/v1/marketing-run',
    $h$jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'sb_service_role_key'), ''))$h$)
);
