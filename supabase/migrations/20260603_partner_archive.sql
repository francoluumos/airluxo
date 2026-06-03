-- Partner archive (soft, reversible) + archived cars hidden from the marketplace.
-- Applied to live 2026-06-03.

alter table public.partners add column if not exists archived_at timestamptz;

-- listings.is_prospect now means "hidden from the public marketplace" = the
-- partner is a prospect OR is archived. (preview_listings still serves prospect
-- cars by token; this only gates the public marketplace + map.)
create or replace function public.set_listing_prospect_flag()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.is_prospect := coalesce((select (is_prospect or archived_at is not null) from public.partners where id = new.partner_id), false);
  return new;
end $$;

create or replace function public.sync_listings_prospect_flag()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.listings set is_prospect = (new.is_prospect or new.archived_at is not null) where partner_id = new.id;
  return new;
end $$;
drop trigger if exists trg_sync_listings_prospect on public.partners;
create trigger trg_sync_listings_prospect
  after update of is_prospect, archived_at on public.partners
  for each row execute function public.sync_listings_prospect_flag();

create or replace function public.admin_archive_partner(p_id uuid, p_archived boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  update public.partners set archived_at = (case when p_archived then now() else null end) where id = p_id;
end $$;

-- admin_list_partners now reports archived_at (return type changed → drop+recreate).
drop function if exists public.admin_list_partners();
create function public.admin_list_partners()
returns table (
  id uuid, company_name text, contact_name text, phone text, plan text,
  is_prospect boolean, pipeline_stage text, prospect_contact_email text,
  prospect_source text, login_email text, created_at timestamptz, car_count bigint,
  archived_at timestamptz
) language sql security definer set search_path = public stable as $$
  select p.id, p.company_name, p.contact_name,
         (case when p.is_prospect then p.prospect_contact_phone else p.phone end) as phone,
         p.plan, p.is_prospect, p.pipeline_stage, p.prospect_contact_email, p.prospect_source,
         u.email::text, p.created_at,
         (select count(*) from public.listings l where l.partner_id = p.id),
         p.archived_at
  from public.partners p join auth.users u on u.id = p.id
  where public.is_admin()
  order by p.created_at desc;
$$;
