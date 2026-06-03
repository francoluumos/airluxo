-- Founder "Customers" section. Applied to live 2026-06-03. Bookings match a
-- customer by user_id OR email (covers guest-then-account). Birthdate comes from
-- the licence on file. Admin-gated.

create or replace function public.admin_list_customers()
returns table (
  id uuid, full_name text, email text, phone text, created_at timestamptz,
  marketing_opt_in boolean, licence_verified boolean, loyalty_points integer,
  birth_date text, bookings_count bigint, completed_count bigint, gross numeric, last_booking_at timestamptz
) language sql security definer set search_path = public stable as $$
  select c.id, c.full_name, c.email, c.phone, c.created_at,
    c.marketing_opt_in, c.licence_verified, c.loyalty_points,
    (c.licence->>'birth_date'),
    (select count(*) from public.bookings b where b.user_id = c.id or lower(b.guest_email) = lower(c.email)),
    (select count(*) from public.bookings b where (b.user_id = c.id or lower(b.guest_email) = lower(c.email)) and b.status = 'Completed'),
    coalesce((select sum(b.total_amount) from public.bookings b where (b.user_id = c.id or lower(b.guest_email) = lower(c.email)) and b.status not in ('Declined','Cancelled')), 0),
    (select max(b.created_at) from public.bookings b where b.user_id = c.id or lower(b.guest_email) = lower(c.email))
  from public.customers c
  where public.is_admin()
  order by c.created_at desc;
$$;

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
        'marketing_opt_in', c.marketing_opt_in, 'licence_verified', c.licence_verified, 'loyalty_points', c.loyalty_points,
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
