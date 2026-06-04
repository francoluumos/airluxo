-- Schedules for the generic marketing-run flows. Each cron POSTs its flow to the
-- marketing-run edge function; the function authorises via the service-role key read
-- from Vault at run time (see 20260604_marketing_birthday_cron.sql for activation).
-- Cadences: post-trip daily (catches trips completed ~2 days ago); win-back,
-- wishlist, new-models weekly on different days.

do $$
declare
  fn text := 'https://shoeopxxjawmusgnjxfh.supabase.co/functions/v1/marketing-run';
  hdr text := $h$jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'sb_service_role_key'), ''))$h$;
begin
  perform cron.schedule('marketing-post-trip-daily', '0 8 * * *',
    format($c$select net.http_post(url := %L, headers := %s, body := '{"flow":"post_trip"}'::jsonb);$c$, fn, hdr));
  perform cron.schedule('marketing-winback-weekly', '0 8 * * 2',
    format($c$select net.http_post(url := %L, headers := %s, body := '{"flow":"winback"}'::jsonb);$c$, fn, hdr));
  perform cron.schedule('marketing-wishlist-weekly', '0 8 * * 4',
    format($c$select net.http_post(url := %L, headers := %s, body := '{"flow":"wishlist"}'::jsonb);$c$, fn, hdr));
  perform cron.schedule('marketing-new-models-weekly', '0 8 * * 5',
    format($c$select net.http_post(url := %L, headers := %s, body := '{"flow":"new_models"}'::jsonb);$c$, fn, hdr));
end $$;
