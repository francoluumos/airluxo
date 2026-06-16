-- Founder Financials: what AIRLUXO earns (subscription run-rate + booking fees)
-- and spends (discounts, loyalty credits) over a window, plus a full booking
-- history export. Host commission is estimated from each partner's CURRENT plan
-- rate (per-booking rate isn't persisted yet — same basis as admin_partner_detail).
-- Admin-gated.

create or replace function public.admin_financials(p_days int default 30)
returns jsonb language plpgsql security definer set search_path = public stable as $$
declare
  cur_start timestamptz := now() - (p_days || ' days')::interval;
  result jsonb;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;

  with
  subs as (
    select
      count(*) filter (where coalesce(plan, 'free') = 'free') as free,
      count(*) filter (where plan = 'pro') as pro,
      count(*) filter (where plan = 'max') as max
    from public.partners
    where is_prospect = false and archived_at is null
  ),
  bk as (
    select b.*, coalesce(p.plan, 'free') as plan
    from public.bookings b
    left join public.partners p on p.id = b.partner_id
    where b.created_at >= cur_start and b.status not in ('Declined', 'Cancelled')
  ),
  rev as (
    select
      count(*) as bookings,
      coalesce(sum(total_amount), 0) as gmv,
      coalesce(sum(service_fee), 0) as service_fees,
      coalesce(sum((coalesce(base_amount,0) + coalesce(addons_amount,0)) *
        (case plan when 'pro' then 0.09 when 'max' then 0.03 else 0.15 end)), 0) as host_commission,
      coalesce(sum(discount_amount), 0) as discounts,
      coalesce(sum(loyalty_credit), 0) as loyalty_credits,
      coalesce(sum(affiliate_commission), 0) as affiliate_commission
    from bk
  )
  select jsonb_build_object(
    'days', p_days,
    'subscriptions', jsonb_build_object(
      'free', subs.free, 'pro', subs.pro, 'max', subs.max,
      'mrr', subs.pro * 49 + subs.max * 199
    ),
    'revenue', jsonb_build_object(
      'bookings', rev.bookings, 'gmv', rev.gmv,
      'service_fees', round(rev.service_fees), 'host_commission', round(rev.host_commission)
    ),
    'spend', jsonb_build_object(
      'discounts', round(rev.discounts), 'loyalty_credits', round(rev.loyalty_credits),
      'affiliate_commission', round(rev.affiliate_commission)
    ),
    'net', round(rev.service_fees + rev.host_commission - rev.discounts - rev.loyalty_credits)
  ) into result
  from subs, rev;

  return result;
end $$;

-- Full booking history for export (newest first), with partner + customer labels
-- and the estimated host commission per booking.
create or replace function public.admin_bookings_export(p_limit int default 5000)
returns table (
  created_at timestamptz, status text, company_name text, customer text,
  car_label text, start_date text, end_date text,
  base_amount numeric, addons_amount numeric, service_fee numeric,
  discount_amount numeric, loyalty_credit numeric, total_amount numeric,
  host_commission_est numeric, plan text
) language sql security definer set search_path = public stable as $$
  select
    b.created_at, b.status, p.company_name,
    coalesce(c.full_name, b.guest_email) as customer,
    b.car_label, b.start_date::text, b.end_date::text,
    b.base_amount, b.addons_amount, b.service_fee,
    b.discount_amount, b.loyalty_credit, b.total_amount,
    round((coalesce(b.base_amount,0) + coalesce(b.addons_amount,0)) *
      (case coalesce(p.plan,'free') when 'pro' then 0.09 when 'max' then 0.03 else 0.15 end)) as host_commission_est,
    coalesce(p.plan, 'free') as plan
  from public.bookings b
  left join public.partners p on p.id = b.partner_id
  left join public.customers c on c.id = b.user_id
  where public.is_admin()
  order by b.created_at desc
  limit p_limit;
$$;
