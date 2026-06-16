-- Founder Overview dashboard: daily additions (leads, live partners, customers,
-- bookings, GMV) for a rolling window, with the previous equal-length window for
-- period-over-period comparison. Day buckets in Europe/Zurich. Admin-gated.

create or replace function public.admin_overview(p_days int default 7)
returns jsonb language plpgsql security definer set search_path = public stable as $$
declare
  tz constant text := 'Europe/Zurich';
  cur_start timestamptz := now() - (p_days || ' days')::interval;
  prev_start timestamptz := now() - ((2 * p_days) || ' days')::interval;
  result jsonb;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;

  with metrics as (
    select
      (select count(*) from public.partners where is_prospect and created_at >= cur_start) as leads_cur,
      (select count(*) from public.partners where is_prospect and created_at >= prev_start and created_at < cur_start) as leads_prev,
      (select count(*) from public.partners where not is_prospect and coalesce(went_live_at, created_at) >= cur_start) as partners_cur,
      (select count(*) from public.partners where not is_prospect and coalesce(went_live_at, created_at) >= prev_start and coalesce(went_live_at, created_at) < cur_start) as partners_prev,
      (select count(*) from public.customers where created_at >= cur_start) as customers_cur,
      (select count(*) from public.customers where created_at >= prev_start and created_at < cur_start) as customers_prev,
      (select count(*) from public.bookings where created_at >= cur_start) as bookings_cur,
      (select count(*) from public.bookings where created_at >= prev_start and created_at < cur_start) as bookings_prev,
      (select coalesce(sum(total_amount), 0) from public.bookings where created_at >= cur_start and status not in ('Declined', 'Cancelled')) as gmv_cur,
      (select coalesce(sum(total_amount), 0) from public.bookings where created_at >= prev_start and created_at < cur_start and status not in ('Declined', 'Cancelled')) as gmv_prev
  ),
  days as (
    select generate_series(
      (date_trunc('day', now() at time zone tz) - ((p_days - 1) || ' days')::interval),
      date_trunc('day', now() at time zone tz),
      interval '1 day'
    )::date as day
  ),
  daily as (
    select d.day,
      (select count(*) from public.partners where is_prospect and (created_at at time zone tz)::date = d.day) as leads,
      (select count(*) from public.partners where not is_prospect and (coalesce(went_live_at, created_at) at time zone tz)::date = d.day) as partners,
      (select count(*) from public.customers where (created_at at time zone tz)::date = d.day) as customers,
      (select count(*) from public.bookings where (created_at at time zone tz)::date = d.day) as bookings,
      (select coalesce(sum(total_amount), 0) from public.bookings where (created_at at time zone tz)::date = d.day and status not in ('Declined', 'Cancelled')) as gmv
    from days d order by d.day
  )
  select jsonb_build_object(
    'days', p_days,
    'current',  jsonb_build_object('leads', leads_cur,  'partners', partners_cur,  'customers', customers_cur,  'bookings', bookings_cur,  'gmv', gmv_cur),
    'previous', jsonb_build_object('leads', leads_prev, 'partners', partners_prev, 'customers', customers_prev, 'bookings', bookings_prev, 'gmv', gmv_prev),
    'daily', (select jsonb_agg(jsonb_build_object('d', day, 'leads', leads, 'partners', partners, 'customers', customers, 'bookings', bookings, 'gmv', gmv)) from daily)
  ) into result from metrics;

  return result;
end $$;
