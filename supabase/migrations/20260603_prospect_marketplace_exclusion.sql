-- Phase 2: hide prospect partners' cars from the public marketplace + map.
-- Applied to live 2026-06-03. Denormalize is_prospect onto listings (synced by
-- triggers) so the marketplace query + fleet_pins RPC filter cheaply. The embed
-- (reached by explicit partner id) still shows them — the preview mechanism.

alter table public.listings
  add column if not exists is_prospect boolean not null default false;

create or replace function public.set_listing_prospect_flag()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.is_prospect := coalesce((select is_prospect from public.partners where id = new.partner_id), false);
  return new;
end $$;
drop trigger if exists trg_listing_prospect_flag on public.listings;
create trigger trg_listing_prospect_flag
  before insert or update of partner_id on public.listings
  for each row execute function public.set_listing_prospect_flag();

create or replace function public.sync_listings_prospect_flag()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_prospect is distinct from old.is_prospect then
    update public.listings set is_prospect = new.is_prospect where partner_id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists trg_sync_listings_prospect on public.partners;
create trigger trg_sync_listings_prospect
  after update of is_prospect on public.partners
  for each row execute function public.sync_listings_prospect_flag();

update public.listings l set is_prospect = p.is_prospect
  from public.partners p where p.id = l.partner_id and l.is_prospect is distinct from p.is_prospect;

-- map RPC: existing definition + the is_prospect filter
create or replace function public.fleet_pins()
returns table(listing_id uuid, lat double precision, lng double precision, city text)
language sql stable security definer set search_path to '' as $function$
  select li.id, loc.lat, loc.lng, coalesce(loc.city, li.city)
  from public.listings li
  join public.partner_locations loc on loc.id = li.location_id
  where li.status <> 'Draft' and li.is_prospect = false
    and loc.lat is not null and loc.lng is not null;
$function$;
