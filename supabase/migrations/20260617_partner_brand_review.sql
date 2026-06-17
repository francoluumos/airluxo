-- U6: admin review & apply. One RPC loads the full review payload for a prospect
-- (live + proposed brand kit, USP/copy, tech stack, the partner's listings, and the
-- latest ingest job's scraped images); another attaches a photos gallery to a listing.
-- Applying the brand kit itself reuses admin_set_partner_brand_kit (sets the live kit).

create or replace function public.admin_partner_brand_review(p_partner_id uuid)
returns jsonb language sql security definer set search_path = public stable as $$
  select case when public.is_admin() then jsonb_build_object(
    'partner_id', p.id,
    'company_name', p.company_name,
    'preview_token', p.preview_token,
    'brand_kit', coalesce(p.brand_kit, '{}'::jsonb),
    'brand_kit_raw', coalesce(p.brand_kit_raw, '{}'::jsonb),
    'partner_pages', coalesce(p.partner_pages, '{}'::jsonb),
    'tech_stack', coalesce(p.tech_stack, '{}'::jsonb),
    'drive_folder_url', p.drive_folder_url,
    'listings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id, 'make', l.make, 'model', l.model,
        'photo_url', l.photo_url, 'photos', coalesce(l.photos, '[]'::jsonb)
      ) order by l.created_at)
      from public.listings l where l.partner_id = p.id), '[]'::jsonb),
    'job', (
      select jsonb_build_object(
        'id', j.id, 'status', j.status, 'images', coalesce(j.images, '[]'::jsonb),
        'fleet_url', j.fleet_url, 'screenshot_url', j.screenshot_url, 'error', j.error
      )
      from public.partner_ingest_jobs j where j.partner_id = p.id order by j.created_at desc limit 1)
  ) else null end
  from public.partners p where p.id = p_partner_id;
$$;

-- Attach a photos gallery to a listing. photo_url stays the hero (first 'hero' photo,
-- else the first photo) for back-compat with the single-image components.
create or replace function public.admin_apply_listing_photos(p_listing_id uuid, p_photos jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare hero text;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  select coalesce(
    (select value->>'url' from jsonb_array_elements(coalesce(p_photos, '[]'::jsonb)) where value->>'type' = 'hero' limit 1),
    (select value->>'url' from jsonb_array_elements(coalesce(p_photos, '[]'::jsonb)) limit 1)
  ) into hero;
  update public.listings
    set photos = coalesce(p_photos, '[]'::jsonb),
        photo_url = coalesce(hero, photo_url)
    where id = p_listing_id;
end $$;
