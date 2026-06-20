-- Fix: scraped specs arrive as text with units ("650 PS", "CHF 1290"), but listings.power
-- / seats / year / mileage are integer and price_per_day numeric. Strip non-digits and
-- cast defensively so admin_create_listing never throws a type error.

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
    nullif(regexp_replace(coalesce(f->>'year',''),  '[^0-9]', '', 'g'), '')::int,
    nullif(trim(f->>'category'),''), nullif(trim(f->>'city'),''),
    nullif(trim(f->>'exterior_color'),''), nullif(trim(f->>'interior_color'),''),
    nullif(regexp_replace(coalesce(f->>'power',''), '[^0-9]', '', 'g'), '')::int,
    nullif(regexp_replace(coalesce(f->>'seats',''), '[^0-9]', '', 'g'), '')::int,
    nullif(trim(f->>'gearbox'),''), nullif(trim(f->>'fuel'),''),
    nullif(regexp_replace(coalesce(f->>'price_per_day',''), '[^0-9.]', '', 'g'), '')::numeric,
    nullif(regexp_replace(coalesce(f->>'mileage_per_day',''), '[^0-9]', '', 'g'), '')::int,
    nullif(trim(f->>'description'),''), coalesce(p_photos,'[]'::jsonb), hero
  ) returning * into row;
  return row;
end $$;
