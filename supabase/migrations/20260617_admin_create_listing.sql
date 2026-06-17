-- Build a prospect's fleet from the Brand & pitch review: an admin creates a listing for
-- a partner directly (bypassing owner-RLS via SECURITY DEFINER), with the core car fields
-- + a photos gallery from the scraped images. Feeds the storefront preview + the
-- white-label site listings without impersonating the partner.

create or replace function public.admin_create_listing(p_partner_id uuid, p_fields jsonb, p_photos jsonb)
returns public.listings language plpgsql security definer set search_path = public as $$
declare row public.listings; hero text; f jsonb := coalesce(p_fields, '{}'::jsonb);
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if coalesce(f->>'make','') = '' and coalesce(f->>'model','') = '' then raise exception 'make or model required'; end if;
  select coalesce(
    (select value->>'url' from jsonb_array_elements(coalesce(p_photos,'[]'::jsonb)) where value->>'type'='hero' limit 1),
    (select value->>'url' from jsonb_array_elements(coalesce(p_photos,'[]'::jsonb)) limit 1)
  ) into hero;

  insert into public.listings (
    partner_id, status, make, model, year, category, city,
    exterior_color, interior_color, power, seats, gearbox, fuel,
    price_per_day, mileage_per_day, description, photos, photo_url
  ) values (
    p_partner_id, 'Available',
    nullif(trim(f->>'make'),''), nullif(trim(f->>'model'),''),
    nullif(f->>'year','')::int, nullif(trim(f->>'category'),''), nullif(trim(f->>'city'),''),
    nullif(trim(f->>'exterior_color'),''), nullif(trim(f->>'interior_color'),''),
    nullif(trim(f->>'power'),''), nullif(f->>'seats','')::int,
    nullif(trim(f->>'gearbox'),''), nullif(trim(f->>'fuel'),''),
    nullif(f->>'price_per_day','')::numeric, nullif(f->>'mileage_per_day','')::int,
    nullif(trim(f->>'description'),''), coalesce(p_photos,'[]'::jsonb), hero
  ) returning * into row;
  return row;
end $$;
