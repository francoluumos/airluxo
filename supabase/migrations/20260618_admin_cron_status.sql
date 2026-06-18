-- Developer → Cron & jobs observability. One admin RPC returns: every pg_cron job + its
-- schedule/active state, the recent run history (status + message + duration), and the
-- recent pg_net HTTP responses — the latter catches "silent" failures where a cron run
-- reports succeeded (the POST was sent) but the edge function actually returned 401/500.

create or replace function public.admin_cron_status()
returns jsonb language plpgsql security definer set search_path = public as $$
declare jobs jsonb := '[]'::jsonb; runs jsonb := '[]'::jsonb; http jsonb := '[]'::jsonb; ingest jsonb := '[]'::jsonb;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;

  begin
    select coalesce(jsonb_agg(jsonb_build_object(
      'jobid', jobid, 'jobname', jobname, 'schedule', schedule, 'active', active,
      'command', left(command, 240)) order by jobname), '[]'::jsonb)
    into jobs from cron.job;
  exception when others then jobs := '[]'::jsonb; end;

  begin
    select coalesce(jsonb_agg(r), '[]'::jsonb) into runs from (
      select j.jobname, d.status, left(coalesce(d.return_message, ''), 300) as return_message,
             d.start_time, round(extract(epoch from (d.end_time - d.start_time))::numeric, 1) as duration_s
      from cron.job_run_details d join cron.job j on j.jobid = d.jobid
      order by d.start_time desc limit 50) r;
  exception when others then runs := '[]'::jsonb; end;

  begin
    select coalesce(jsonb_agg(h), '[]'::jsonb) into http from (
      select status_code, left(coalesce(error_msg, ''), 240) as error_msg, created
      from net._http_response order by created desc limit 50) h;
  exception when others then http := '[]'::jsonb; end;

  begin
    select coalesce(jsonb_agg(i), '[]'::jsonb) into ingest from (
      select id, status, left(coalesce(error, ''), 240) as error, created_at
      from public.partner_ingest_jobs order by created_at desc limit 20) i;
  exception when others then ingest := '[]'::jsonb; end;

  return jsonb_build_object('jobs', jobs, 'runs', runs, 'http', http, 'ingest', ingest);
end $$;
