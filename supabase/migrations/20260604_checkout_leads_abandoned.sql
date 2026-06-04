-- Abandoned-booking recovery. Captures the email + car/context the moment a guest
-- types it at the checkout details step (soft-opt-in basis: they were booking, the
-- form offered a marketing choice, the reminder is about the SAME car only). A lead
-- is the record of that basis. One reminder per lead, 1–48h after abandonment.

create table if not exists public.checkout_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  listing_id uuid references public.listings(id) on delete set null,
  car_label text,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  converted_at timestamptz,   -- a booking was created for this email → no reminder
  recovered_at timestamptz,    -- a reminder was sent → never send again
  unsubscribed boolean not null default false,
  unsubscribe_token uuid not null default gen_random_uuid()
);
create unique index if not exists checkout_leads_email_listing_idx on public.checkout_leads(lower(email), listing_id);
create unique index if not exists checkout_leads_unsub_token_idx on public.checkout_leads(unsubscribe_token);
create index if not exists checkout_leads_open_idx on public.checkout_leads(created_at) where converted_at is null and recovered_at is null;

alter table public.checkout_leads enable row level security;
drop policy if exists checkout_leads_admin_read on public.checkout_leads;
create policy checkout_leads_admin_read on public.checkout_leads for select using (public.is_admin());
-- Writes go through the checkout-lead edge function (service role) only.

-- When a booking is created, mark that email's open leads converted (no reminder).
create or replace function public.mark_leads_converted()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.checkout_leads
    set converted_at = now()
    where lower(email) = lower(new.guest_email) and converted_at is null;
  return new;
end $$;

drop trigger if exists trg_mark_leads_converted on public.bookings;
create trigger trg_mark_leads_converted
  after insert on public.bookings
  for each row execute function public.mark_leads_converted();

-- Recipients: open leads 1–48h old, not converted/recovered/unsubscribed, whose
-- email hasn't explicitly opted out and hasn't had a recovery in the last 7 days.
-- id = the matching customer (or null for a pure lead); lead_id drives the per-lead guard.
create or replace function public.marketing_recipients_abandoned()
returns table (id uuid, lead_id uuid, email text, car_label text, listing_id uuid,
               start_date date, end_date date, unsubscribe_token uuid)
language sql security definer set search_path = public stable as $$
  select cu.id, cl.id, cl.email, cl.car_label, cl.listing_id, cl.start_date, cl.end_date, cl.unsubscribe_token
  from public.checkout_leads cl
  left join public.customers cu on lower(cu.email) = lower(cl.email)
  where cl.converted_at is null
    and cl.recovered_at is null
    and not cl.unsubscribed
    and cl.created_at < now() - interval '1 hour'
    and cl.created_at > now() - interval '48 hours'
    and not exists (select 1 from public.newsletter_subscribers s
                    where lower(s.email) = lower(cl.email) and s.subscribed = false)
    and not exists (select 1 from public.marketing_sends ms
                    where lower(ms.email) = lower(cl.email) and ms.flow = 'abandoned' and ms.sent_at > now() - interval '7 days');
$$;

revoke execute on function public.marketing_recipients_abandoned() from public, anon, authenticated;
grant execute on function public.marketing_recipients_abandoned() to service_role;
