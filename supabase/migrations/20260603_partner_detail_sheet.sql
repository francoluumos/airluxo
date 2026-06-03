-- Partner info sheet for the founder Partners section. Applied to live 2026-06-03.
-- Adds go-live tracking, an event log (timeline), and a full detail RPC.
-- Financials marked est_* use the partner's CURRENT plan rate — commission/app-fee
-- aren't stored per booking yet (see BACKLOG follow-up to persist them for exact
-- accounting).

alter table public.partners add column if not exists went_live_at timestamptz;
update public.partners set went_live_at = created_at where is_prospect = false and went_live_at is null;

-- Event log → the timeline (created / stage moves / went-live).
create table if not exists public.partner_events (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  kind text not null,        -- 'created' | 'stage' | 'went_live'
  detail text,               -- stage key for kind='stage'
  created_at timestamptz not null default now()
);
create index if not exists partner_events_partner_idx on public.partner_events (partner_id, created_at);
alter table public.partner_events enable row level security;
-- No client policy: admins read via admin_partner_detail; writes via SECURITY
-- DEFINER functions / service-role edge functions (admin-create/claim-prospect).

-- Stage setter logs each transition.
create or replace function public.admin_set_prospect_stage(p_id uuid, p_stage text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if p_stage not in ('lead', 'preview_built', 'shared', 'negotiating', 'won', 'lost') then
    raise exception 'invalid stage';
  end if;
  update public.partners set pipeline_stage = p_stage where id = p_id and is_prospect = true;
  insert into public.partner_events (partner_id, kind, detail) values (p_id, 'stage', p_stage);
end $$;

-- Backfill created/went-live events for existing partners.
insert into public.partner_events (partner_id, kind, detail, created_at)
  select id, 'created', null, created_at from public.partners pp
  where not exists (select 1 from public.partner_events e where e.partner_id = pp.id and e.kind = 'created');
insert into public.partner_events (partner_id, kind, detail, created_at)
  select id, 'went_live', null, went_live_at from public.partners pp
  where went_live_at is not null
    and not exists (select 1 from public.partner_events e where e.partner_id = pp.id and e.kind = 'went_live');

create or replace function public.admin_partner_detail(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public stable as $$
declare
  result jsonb;
  rate numeric;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  select (case plan when 'pro' then 0.09 when 'max' then 0.03 else 0.15 end)
    into rate from public.partners where id = p_id;
  if rate is null then return null; end if;

  select jsonb_build_object(
    'partner', (
      select jsonb_build_object(
        'id', p.id, 'company_name', p.company_name, 'contact_name', p.contact_name,
        'phone', (case when p.is_prospect then p.prospect_contact_phone else p.phone end),
        'email', (case when p.is_prospect then p.prospect_contact_email else u.email end),
        'plan', p.plan, 'is_prospect', p.is_prospect, 'pipeline_stage', p.pipeline_stage,
        'source', p.prospect_source, 'created_at', p.created_at, 'went_live_at', p.went_live_at,
        'stripe_connected', (p.stripe_account_id is not null),
        'stripe_charges_enabled', coalesce(p.stripe_charges_enabled, false)
      ) from public.partners p join auth.users u on u.id = p.id where p.id = p_id
    ),
    'locations', coalesce((
      select jsonb_agg(jsonb_build_object('label', loc.label, 'city', loc.city, 'address', loc.address) order by loc.created_at)
      from public.partner_locations loc where loc.partner_id = p_id
    ), '[]'::jsonb),
    'cars', (
      select jsonb_build_object('total', count(*),
        'available', count(*) filter (where status = 'Available'),
        'draft', count(*) filter (where status = 'Draft'))
      from public.listings where partner_id = p_id
    ),
    'bookings', (
      select jsonb_build_object('total', count(*),
        'pending', count(*) filter (where status = 'Pending'),
        'confirmed', count(*) filter (where status = 'Confirmed'),
        'on_trip', count(*) filter (where status = 'On trip'),
        'completed', count(*) filter (where status = 'Completed'),
        'declined', count(*) filter (where status = 'Declined'),
        'cancelled', count(*) filter (where status = 'Cancelled'),
        'last_booking_at', max(created_at))
      from public.bookings where partner_id = p_id
    ),
    'financials', (
      select jsonb_build_object(
        'gross', coalesce(sum(total_amount), 0),
        'service_fees', coalesce(sum(service_fee), 0),
        'discounts', coalesce(sum(discount_amount), 0),
        'affiliate_commission', coalesce(sum(affiliate_commission), 0),
        'est_host_commission', round(coalesce(sum(base_amount + addons_amount), 0) * rate),
        'est_our_earnings', round(coalesce(sum(service_fee), 0) + coalesce(sum(base_amount + addons_amount), 0) * rate - coalesce(sum(discount_amount), 0)),
        'est_partner_net', round(coalesce(sum(total_amount), 0) - coalesce(sum(service_fee), 0) - coalesce(sum(base_amount + addons_amount), 0) * rate))
      from public.bookings where partner_id = p_id and status not in ('Declined', 'Cancelled')
    ),
    'top_cars', coalesce((
      select jsonb_agg(t) from (
        select coalesce(nullif(trim(coalesce(li.make,'') || ' ' || coalesce(li.model,'')), ''), b.car_label, 'Car') as car,
               count(*) as bookings, coalesce(sum(b.total_amount), 0) as revenue
        from public.bookings b left join public.listings li on li.id = b.listing_id
        where b.partner_id = p_id and b.status not in ('Declined', 'Cancelled')
        group by 1 order by revenue desc limit 5
      ) t
    ), '[]'::jsonb),
    'timeline', coalesce((
      select jsonb_agg(jsonb_build_object('kind', e.kind, 'detail', e.detail, 'at', e.created_at) order by e.created_at)
      from public.partner_events e where e.partner_id = p_id
    ), '[]'::jsonb)
  ) into result;
  return result;
end $$;
