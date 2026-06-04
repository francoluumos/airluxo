-- Data layer for the next marketing flows: post-trip, win-back, wishlist,
-- new-models. Each recipient RPC is SECURITY DEFINER, service_role-only, and bakes
-- in its own targeting + a re-send throttle (via marketing_sends) so a recurring
-- cron never nags the same person.

-- Completion timestamp for the post-trip flow (set on first transition to Completed).
alter table public.bookings add column if not exists completed_at timestamptz;

create or replace function public.set_booking_completed_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'Completed' and old.status is distinct from 'Completed' and new.completed_at is null then
    new.completed_at := now();
  end if;
  return new;
end $$;

drop trigger if exists trg_booking_completed_at on public.bookings;
create trigger trg_booking_completed_at
  before update of status on public.bookings
  for each row execute function public.set_booking_completed_at();

-- POST-TRIP: 2 days after a trip completes, once per customer, throttled 14d.
create or replace function public.marketing_recipients_post_trip()
returns table (id uuid, full_name text, email text, unsubscribe_token uuid, car_label text)
language sql security definer set search_path = public stable as $$
  select distinct on (c.id) c.id, c.full_name, c.email, s.unsubscribe_token, b.car_label
  from public.bookings b
  join public.customers c on (b.user_id = c.id or lower(b.guest_email) = lower(c.email))
  join public.newsletter_subscribers s on lower(s.email) = lower(c.email)
  where s.subscribed
    and b.completed_at is not null
    and (b.completed_at at time zone 'Europe/Zurich')::date = ((now() at time zone 'Europe/Zurich')::date - 2)
    and not exists (select 1 from public.marketing_sends ms
                    where lower(ms.email) = lower(c.email) and ms.flow = 'post_trip' and ms.sent_at > now() - interval '14 days')
  order by c.id, b.completed_at desc;
$$;

-- WIN-BACK: had a completed trip, nothing booked in 180d, throttled 180d.
create or replace function public.marketing_recipients_winback()
returns table (id uuid, full_name text, email text, unsubscribe_token uuid)
language sql security definer set search_path = public stable as $$
  select c.id, c.full_name, c.email, s.unsubscribe_token
  from public.customers c
  join public.newsletter_subscribers s on lower(s.email) = lower(c.email)
  where s.subscribed
    and exists (select 1 from public.bookings b
                where (b.user_id = c.id or lower(b.guest_email) = lower(c.email)) and b.status = 'Completed')
    and not exists (select 1 from public.bookings b
                    where (b.user_id = c.id or lower(b.guest_email) = lower(c.email)) and b.created_at > now() - interval '180 days')
    and not exists (select 1 from public.marketing_sends ms
                    where lower(ms.email) = lower(c.email) and ms.flow = 'winback' and ms.sent_at > now() - interval '180 days');
$$;

-- WISHLIST: has saved cars, hasn't booked in 60d, throttled 45d.
create or replace function public.marketing_recipients_wishlist()
returns table (id uuid, full_name text, email text, unsubscribe_token uuid, saved_car text, saved_count bigint)
language sql security definer set search_path = public stable as $$
  select c.id, c.full_name, c.email, s.unsubscribe_token,
    (select li.make || ' ' || li.model from public.favourites f2 join public.listings li on li.id = f2.listing_id
     where f2.user_id = c.id order by f2.created_at desc limit 1) as saved_car,
    (select count(*) from public.favourites f3 where f3.user_id = c.id) as saved_count
  from public.customers c
  join public.newsletter_subscribers s on lower(s.email) = lower(c.email)
  where s.subscribed
    and exists (select 1 from public.favourites f where f.user_id = c.id)
    and not exists (select 1 from public.bookings b
                    where (b.user_id = c.id or lower(b.guest_email) = lower(c.email)) and b.created_at > now() - interval '60 days')
    and not exists (select 1 from public.marketing_sends ms
                    where lower(ms.email) = lower(c.email) and ms.flow = 'wishlist' and ms.sent_at > now() - interval '45 days');
$$;

-- NEW-MODELS: all subscribers (customers + leads), throttled 6d (weekly digest).
-- The function only sends when there are actually new cars (checked separately).
create or replace function public.marketing_recipients_new_models()
returns table (id uuid, full_name text, email text, unsubscribe_token uuid)
language sql security definer set search_path = public stable as $$
  select c.id, c.full_name, s.email, s.unsubscribe_token
  from public.newsletter_subscribers s
  left join public.customers c on c.id = s.customer_id
  where s.subscribed
    and not exists (select 1 from public.marketing_sends ms
                    where lower(ms.email) = lower(s.email) and ms.flow = 'new_models' and ms.sent_at > now() - interval '6 days');
$$;

revoke execute on function public.marketing_recipients_post_trip(), public.marketing_recipients_winback(),
  public.marketing_recipients_wishlist(), public.marketing_recipients_new_models() from public, anon, authenticated;
grant execute on function public.marketing_recipients_post_trip(), public.marketing_recipients_winback(),
  public.marketing_recipients_wishlist(), public.marketing_recipients_new_models() to service_role;
