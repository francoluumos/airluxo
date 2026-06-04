-- Founder Marketing → Flows panel data. Admin-gated. Reads cron job status, per-flow
-- send stats, and recent sends from marketing_sends.
create or replace function public.admin_marketing_overview()
returns jsonb language plpgsql security definer set search_path = public, cron stable as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  select jsonb_build_object(
    'jobs', coalesce((select jsonb_agg(jsonb_build_object('jobname', jobname, 'schedule', schedule, 'active', active) order by jobname)
                      from cron.job where jobname like 'marketing-%'), '[]'::jsonb),
    'stats', coalesce((select jsonb_agg(s) from (
        select flow,
               count(*) as total,
               count(*) filter (where sent_at > now() - interval '30 days') as last_30d,
               max(sent_at) as last_sent
        from public.marketing_sends group by flow order by flow) s), '[]'::jsonb),
    'recent', coalesce((select jsonb_agg(r) from (
        select flow, email, subject, sent_at
        from public.marketing_sends order by sent_at desc limit 25) r), '[]'::jsonb)
  ) into result;
  return result;
end $$;

-- Pause/resume a marketing flow by toggling its cron job. Admin-gated; only
-- marketing-* jobs may be touched.
create or replace function public.admin_set_flow_active(p_jobname text, p_active boolean)
returns boolean language plpgsql security definer set search_path = public, cron volatile as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if p_jobname not like 'marketing-%' then raise exception 'not a marketing job'; end if;
  update cron.job set active = p_active where jobname = p_jobname;
  return found;
end $$;
