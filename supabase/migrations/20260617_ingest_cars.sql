-- Structured car extraction: partner-ingest now runs Firecrawl AI extraction over the
-- fleet page and stores a list of cars (make/model/price/specs/image) on the job, so the
-- founder reviews a real car table and bulk-creates listings (instead of a raw image dump).

alter table public.partner_ingest_jobs
  add column if not exists cars jsonb not null default '[]'::jsonb;  -- [{make,model,year,price_per_day,power,seats,transmission,fuel,image_url}]

-- Review payload: include the job's extracted cars.
create or replace function public.admin_partner_brand_review(p_partner_id uuid)
returns jsonb language sql security definer set search_path = public stable as $$
  select case when public.is_admin() then jsonb_build_object(
    'partner_id', p.id,
    'company_name', p.company_name,
    'preview_token', p.preview_token,
    'slug', p.slug,
    'site_published', p.site_published,
    'site_config', coalesce(p.site_config, '{}'::jsonb),
    'legal', coalesce(p.legal, '{}'::jsonb),
    'legal_pages', coalesce(p.legal_pages, '{}'::jsonb),
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
        'cars', coalesce(j.cars, '[]'::jsonb),
        'fleet_url', j.fleet_url, 'screenshot_url', j.screenshot_url, 'error', j.error
      )
      from public.partner_ingest_jobs j where j.partner_id = p.id order by j.created_at desc limit 1)
  ) else null end
  from public.partners p where p.id = p_partner_id;
$$;
