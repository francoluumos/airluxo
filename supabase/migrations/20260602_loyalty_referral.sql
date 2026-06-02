-- Referral: per-customer code + who referred them, a claim RPC, and double-sided
-- bonuses on the referee's first completed trip. Applied to live 2026-06-02.
-- Mirrors src/lib/loyalty.js REFERRAL { refereeCredit: 500, referrerReward: 1000 }.

alter table public.customers
  add column if not exists referral_code text unique,
  add column if not exists referred_by uuid references public.customers(id) on delete set null;

create or replace function public.set_referral_code()
returns trigger language plpgsql as $$
begin
  if new.referral_code is null then
    new.referral_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  end if;
  return new;
end $$;
drop trigger if exists trg_set_referral_code on public.customers;
create trigger trg_set_referral_code before insert on public.customers
  for each row execute function public.set_referral_code();

update public.customers
  set referral_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  where referral_code is null;

-- Claim a referral code: sets the caller's referred_by once, never to self.
create or replace function public.apply_referral(p_code text)
returns boolean language plpgsql security definer set search_path = public as $$
declare ref uuid;
begin
  if p_code is null or length(trim(p_code)) = 0 then return false; end if;
  select id into ref from public.customers where referral_code = upper(trim(p_code)) limit 1;
  if ref is null or ref = auth.uid() then return false; end if;
  update public.customers set referred_by = ref
    where id = auth.uid() and referred_by is null;
  return found;
end $$;

-- Completion award + referral bonuses (idempotent via the ledger reason rows).
create or replace function public.award_loyalty_on_completion()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  cust_id uuid; earn integer; ref uuid;
begin
  if new.status = 'Completed' and (old.status is distinct from 'Completed') then
    if exists (select 1 from public.loyalty_ledger where booking_id = new.id and reason = 'trip_completed') then
      return new;
    end if;
    cust_id := coalesce(
      new.user_id,
      (select id from public.customers where lower(email) = lower(new.guest_email) limit 1)
    );
    if cust_id is null then return new; end if;

    earn := greatest(0, round((coalesce(new.base_amount, 0) + coalesce(new.addons_amount, 0)) * 5))::integer;
    if earn > 0 then
      insert into public.loyalty_ledger (customer_id, delta, reason, booking_id) values (cust_id, earn, 'trip_completed', new.id);
      update public.customers set loyalty_points = loyalty_points + earn where id = cust_id;
    end if;

    if not exists (select 1 from public.loyalty_ledger where customer_id = cust_id and reason = 'referral_referee') then
      select referred_by into ref from public.customers where id = cust_id;
      if ref is not null then
        insert into public.loyalty_ledger (customer_id, delta, reason, booking_id) values (cust_id, 500, 'referral_referee', new.id);
        update public.customers set loyalty_points = loyalty_points + 500 where id = cust_id;
        insert into public.loyalty_ledger (customer_id, delta, reason, booking_id) values (ref, 1000, 'referral_referrer', new.id);
        update public.customers set loyalty_points = loyalty_points + 1000 where id = ref;
      end if;
    end if;
  end if;
  return new;
end $$;
