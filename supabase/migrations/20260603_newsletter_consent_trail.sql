-- Consent audit trail for the newsletter. revDSG/GDPR put the burden of proof on
-- us, so a single boolean isn't enough: we record WHEN and HOW consent was given,
-- and when it was withdrawn. Timestamps are stamped by a trigger so every write
-- path (checkout, profile toggle, signup) is covered; `source` is set by the caller.

alter table public.customers
  add column if not exists marketing_opt_in_at timestamptz,
  add column if not exists marketing_opt_out_at timestamptz,
  add column if not exists marketing_opt_in_source text;

-- Carry a guest's checkout opt-in onto the booking, so it can be adopted onto the
-- customer row if they later create an account (book-then-account flow).
alter table public.bookings
  add column if not exists marketing_opt_in boolean not null default false;

create or replace function public.stamp_marketing_consent()
returns trigger language plpgsql as $$
begin
  -- transition into opted-in: stamp the moment, clear any prior opt-out
  if coalesce(new.marketing_opt_in, false) and not coalesce(old.marketing_opt_in, false) then
    new.marketing_opt_in_at := now();
    new.marketing_opt_out_at := null;
  -- transition into opted-out: stamp the withdrawal
  elsif not coalesce(new.marketing_opt_in, false) and coalesce(old.marketing_opt_in, false) then
    new.marketing_opt_out_at := now();
  end if;
  return new;
end $$;

drop trigger if exists trg_stamp_marketing_consent on public.customers;
create trigger trg_stamp_marketing_consent
  before insert or update of marketing_opt_in on public.customers
  for each row execute function public.stamp_marketing_consent();

-- On INSERT the OLD row is null, so a row created already-opted-in gets stamped too.
create or replace function public.stamp_marketing_consent_ins()
returns trigger language plpgsql as $$
begin
  if coalesce(new.marketing_opt_in, false) and new.marketing_opt_in_at is null then
    new.marketing_opt_in_at := now();
  end if;
  return new;
end $$;

drop trigger if exists trg_stamp_marketing_consent_ins on public.customers;
create trigger trg_stamp_marketing_consent_ins
  before insert on public.customers
  for each row execute function public.stamp_marketing_consent_ins();

-- Surface the consent trail in the founder customer sheet.
create or replace function public.admin_customer_detail(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public stable as $$
declare result jsonb; cemail text;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  select lower(email) into cemail from public.customers where id = p_id;
  if cemail is null then return null; end if;

  select jsonb_build_object(
    'customer', (select jsonb_build_object(
        'id', c.id, 'full_name', c.full_name, 'email', c.email, 'phone', c.phone, 'created_at', c.created_at,
        'marketing_opt_in', c.marketing_opt_in, 'marketing_opt_in_at', c.marketing_opt_in_at,
        'marketing_opt_out_at', c.marketing_opt_out_at, 'marketing_opt_in_source', c.marketing_opt_in_source,
        'licence_verified', c.licence_verified, 'loyalty_points', c.loyalty_points,
        'birth_date', (c.licence->>'birth_date'), 'address', c.address, 'referral_code', c.referral_code,
        'referred_by', (select jsonb_build_object('name', rc.full_name, 'email', rc.email) from public.customers rc where rc.id = c.referred_by)
      ) from public.customers c where c.id = p_id),
    'completed_count', (select count(*) from public.bookings b where (b.user_id = p_id or lower(b.guest_email) = cemail) and b.status = 'Completed'),
    'referrals_made', (select count(*) from public.loyalty_ledger e where e.customer_id = p_id and e.reason = 'referral_referrer'),
    'bookings', (select jsonb_build_object('total', count(*),
        'pending', count(*) filter (where status = 'Pending'),
        'confirmed', count(*) filter (where status = 'Confirmed'),
        'on_trip', count(*) filter (where status = 'On trip'),
        'completed', count(*) filter (where status = 'Completed'),
        'declined', count(*) filter (where status = 'Declined'),
        'cancelled', count(*) filter (where status = 'Cancelled'),
        'last_booking_at', max(created_at))
      from public.bookings b where b.user_id = p_id or lower(b.guest_email) = cemail),
    'financials', (select jsonb_build_object('gross', coalesce(sum(total_amount), 0))
      from public.bookings b where (b.user_id = p_id or lower(b.guest_email) = cemail) and b.status not in ('Declined','Cancelled')),
    'top_cars', coalesce((select jsonb_agg(t) from (
        select coalesce(nullif(trim(coalesce(li.make,'') || ' ' || coalesce(li.model,'')), ''), b.car_label, 'Car') as car,
               count(*) as bookings, coalesce(sum(b.total_amount), 0) as revenue
        from public.bookings b left join public.listings li on li.id = b.listing_id
        where (b.user_id = p_id or lower(b.guest_email) = cemail) and b.status not in ('Declined','Cancelled')
        group by 1 order by revenue desc limit 5) t), '[]'::jsonb)
  ) into result;
  return result;
end $$;
