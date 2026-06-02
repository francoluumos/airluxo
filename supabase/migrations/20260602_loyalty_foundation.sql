-- Loyalty foundation: points balance, append-only ledger, earn-on-completion.
-- Applied to the live project 2026-06-02. Additive only; mirrors
-- src/lib/loyalty.js (POINTS_PER_CHF = 5).
--
-- NOTE: this is the first captured migration. The rest of the schema still lives
-- only in the live DB (see BACKLOG "capture prod schema as code" before any
-- staging split). New schema changes should be added here as files going forward.

alter table public.customers
  add column if not exists loyalty_points integer not null default 0;

create table if not exists public.loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  delta integer not null,
  reason text not null,
  booking_id uuid references public.bookings(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists loyalty_ledger_customer_idx
  on public.loyalty_ledger (customer_id, created_at desc);

alter table public.loyalty_ledger enable row level security;

-- Customers read their own ledger. Inserts happen only via the SECURITY DEFINER
-- trigger / service role — no client insert/update/delete policy.
drop policy if exists "loyalty_ledger own read" on public.loyalty_ledger;
create policy "loyalty_ledger own read" on public.loyalty_ledger
  for select using (customer_id = auth.uid());

-- Award points once when a booking transitions into 'Completed'. Earns on rental
-- value (base + commissionable add-ons); excludes service fee and the
-- partner-keeps protection fee. Resolves the customer by user_id, else by email.
create or replace function public.award_loyalty_on_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cust_id uuid;
  earn integer;
begin
  if new.status = 'Completed' and (old.status is distinct from 'Completed') then
    if exists (
      select 1 from public.loyalty_ledger
      where booking_id = new.id and reason = 'trip_completed'
    ) then
      return new; -- idempotency: never award twice for the same booking
    end if;

    cust_id := coalesce(
      new.user_id,
      (select id from public.customers where lower(email) = lower(new.guest_email) limit 1)
    );
    if cust_id is null then
      return new; -- guest with no account yet; nothing to credit
    end if;

    earn := greatest(0, round((coalesce(new.base_amount, 0) + coalesce(new.addons_amount, 0)) * 5))::integer;
    if earn > 0 then
      insert into public.loyalty_ledger (customer_id, delta, reason, booking_id)
      values (cust_id, earn, 'trip_completed', new.id);
      update public.customers set loyalty_points = loyalty_points + earn where id = cust_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_award_loyalty on public.bookings;
create trigger trg_award_loyalty
  after update on public.bookings
  for each row execute function public.award_loyalty_on_completion();
