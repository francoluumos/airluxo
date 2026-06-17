-- U11: Swiss legal pages. Founder/partner store legal-entity data + generated
-- Impressum/privacy/terms; the public site serves them (already exposed by
-- public_partner_site). Extends the review payload with legal + legal_pages.

create or replace function public.admin_set_partner_legal(p_id uuid, p_legal jsonb, p_legal_pages jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  update public.partners set
    legal = coalesce(p_legal, legal),
    legal_pages = coalesce(p_legal_pages, legal_pages)
  where id = p_id;
end $$;

-- Partner self-edit of their own legal data + pages.
create or replace function public.partner_update_legal(p_legal jsonb, p_legal_pages jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare out jsonb;
begin
  update public.partners set
    legal = coalesce(p_legal, legal),
    legal_pages = coalesce(p_legal_pages, legal_pages)
  where id = auth.uid()
  returning jsonb_build_object('legal', legal, 'legal_pages', legal_pages) into out;
  if out is null then raise exception 'no partner for this user'; end if;
  return out;
end $$;

-- Review payload now also carries legal + legal_pages for the admin Legal editor.
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
        'fleet_url', j.fleet_url, 'screenshot_url', j.screenshot_url, 'error', j.error
      )
      from public.partner_ingest_jobs j where j.partner_id = p.id order by j.created_at desc limit 1)
  ) else null end
  from public.partners p where p.id = p_partner_id;
$$;
