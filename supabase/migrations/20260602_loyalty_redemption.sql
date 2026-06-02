-- Points redemption: record what was redeemed on the booking and burn it from
-- the customer's balance on booking insert. The CHF credit is computed
-- authoritatively in the stripe-create-payment edge function. Applied 2026-06-02.

alter table public.bookings
  add column if not exists points_redeemed integer not null default 0,
  add column if not exists loyalty_credit numeric not null default 0;

create or replace function public.burn_loyalty_on_booking()
returns trigger language plpgsql security definer set search_path = public as $$
declare bal integer; burn integer;
begin
  if coalesce(new.points_redeemed, 0) > 0 and new.user_id is not null then
    select loyalty_points into bal from public.customers where id = new.user_id;
    burn := least(new.points_redeemed, coalesce(bal, 0));   -- never go negative
    if burn > 0 then
      insert into public.loyalty_ledger (customer_id, delta, reason, booking_id)
        values (new.user_id, -burn, 'redeemed', new.id);
      update public.customers set loyalty_points = loyalty_points - burn where id = new.user_id;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_burn_loyalty on public.bookings;
create trigger trg_burn_loyalty after insert on public.bookings
  for each row execute function public.burn_loyalty_on_booking();
