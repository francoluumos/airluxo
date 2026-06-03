-- Single source of truth for the newsletter. Supabase is canonical; Resend is a
-- downstream mirror we can rebuild from this table. One row per email, covering
-- both customers and non-customer leads (footer signups). Supersedes the consent
-- columns previously added to customers + bookings (20260603_newsletter_consent_trail).

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  subscribed boolean not null default true,
  opt_in_at timestamptz,
  opt_out_at timestamptz,
  source text,
  customer_id uuid references public.customers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists newsletter_subscribers_customer_id_idx on public.newsletter_subscribers(customer_id);

create or replace function public.stamp_subscriber_consent()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    if new.subscribed and new.opt_in_at is null then new.opt_in_at := now(); end if;
    if not new.subscribed and new.opt_out_at is null then new.opt_out_at := now(); end if;
  else
    if new.subscribed and not old.subscribed then
      new.opt_in_at := now(); new.opt_out_at := null;
    elsif not new.subscribed and old.subscribed then
      new.opt_out_at := now();
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_stamp_subscriber_consent on public.newsletter_subscribers;
create trigger trg_stamp_subscriber_consent
  before insert or update on public.newsletter_subscribers
  for each row execute function public.stamp_subscriber_consent();

-- RLS: admins see/manage all; a signed-in customer can read their own row.
-- All writes happen through the newsletter-subscribe edge function (service role),
-- so no browser insert/update policy is needed (prevents spam-subscribing others).
alter table public.newsletter_subscribers enable row level security;
drop policy if exists newsletter_admin_all on public.newsletter_subscribers;
create policy newsletter_admin_all on public.newsletter_subscribers
  for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists newsletter_self_read on public.newsletter_subscribers;
create policy newsletter_self_read on public.newsletter_subscribers
  for select using (lower(email) = lower(coalesce(auth.jwt()->>'email', '')));

-- Backfill from the consent we already recorded on customers.
insert into public.newsletter_subscribers (email, subscribed, opt_in_at, source, customer_id)
select lower(c.email), true, coalesce(c.marketing_opt_in_at, now()),
       coalesce(c.marketing_opt_in_source, 'migrated'), c.id
from public.customers c
where c.marketing_opt_in = true and c.email is not null
on conflict (email) do nothing;

-- Retire the superseded columns/triggers on customers + bookings.
drop trigger if exists trg_stamp_marketing_consent on public.customers;
drop trigger if exists trg_stamp_marketing_consent_ins on public.customers;
drop function if exists public.stamp_marketing_consent();
drop function if exists public.stamp_marketing_consent_ins();
alter table public.customers
  drop column if exists marketing_opt_in,
  drop column if exists marketing_opt_in_at,
  drop column if exists marketing_opt_out_at,
  drop column if exists marketing_opt_in_source;
alter table public.bookings drop column if exists marketing_opt_in;

-- Admin: full subscriber list (incl. non-customer leads) for the cockpit + CSV.
create or replace function public.admin_list_subscribers()
returns table (
  id uuid, email text, subscribed boolean, source text,
  opt_in_at timestamptz, opt_out_at timestamptz,
  customer_id uuid, customer_name text, created_at timestamptz
) language sql security definer set search_path = public stable as $$
  select s.id, s.email, s.subscribed, s.source, s.opt_in_at, s.opt_out_at,
         s.customer_id, c.full_name, s.created_at
  from public.newsletter_subscribers s
  left join public.customers c on c.id = s.customer_id
  where public.is_admin()
  order by s.created_at desc;
$$;

-- Repoint the customer list: newsletter state now comes from the subscribers table.
create or replace function public.admin_list_customers()
returns table (
  id uuid, full_name text, email text, phone text, created_at timestamptz,
  marketing_opt_in boolean, licence_verified boolean, loyalty_points integer,
  birth_date text, bookings_count bigint, completed_count bigint, gross numeric, last_booking_at timestamptz
) language sql security definer set search_path = public stable as $$
  select c.id, c.full_name, c.email, c.phone, c.created_at,
    coalesce((select s.subscribed from public.newsletter_subscribers s where lower(s.email) = lower(c.email)), false),
    c.licence_verified, c.loyalty_points,
    (c.licence->>'birth_date'),
    (select count(*) from public.bookings b where b.user_id = c.id or lower(b.guest_email) = lower(c.email)),
    (select count(*) from public.bookings b where (b.user_id = c.id or lower(b.guest_email) = lower(c.email)) and b.status = 'Completed'),
    coalesce((select sum(b.total_amount) from public.bookings b where (b.user_id = c.id or lower(b.guest_email) = lower(c.email)) and b.status not in ('Declined','Cancelled')), 0),
    (select max(b.created_at) from public.bookings b where b.user_id = c.id or lower(b.guest_email) = lower(c.email))
  from public.customers c
  where public.is_admin()
  order by c.created_at desc;
$$;

-- Repoint the customer detail sheet: consent block joins the subscribers table.
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
        'marketing_opt_in', coalesce(s.subscribed, false), 'marketing_opt_in_at', s.opt_in_at,
        'marketing_opt_out_at', s.opt_out_at, 'marketing_opt_in_source', s.source,
        'licence_verified', c.licence_verified, 'loyalty_points', c.loyalty_points,
        'birth_date', (c.licence->>'birth_date'), 'address', c.address, 'referral_code', c.referral_code,
        'referred_by', (select jsonb_build_object('name', rc.full_name, 'email', rc.email) from public.customers rc where rc.id = c.referred_by)
      ) from public.customers c
        left join public.newsletter_subscribers s on lower(s.email) = lower(c.email)
        where c.id = p_id),
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
