-- Phase 5 (U9): the white-label partner site foundation. A partner gets a full site —
-- home (hero/USP, about, benefits, contact) + their fleet + legal pages — themed by
-- their brand kit, served at a public slug (and later their own domain). Content seeds
-- from the ingested USP/copy and is founder/partner editable. Publish is founder-gated.

alter table public.partners
  add column if not exists slug text,
  add column if not exists site_published boolean not null default false,
  add column if not exists site_config jsonb not null default '{}'::jsonb,   -- { sections:{hero,about,benefits,contact}, nav:[] }
  add column if not exists legal jsonb not null default '{}'::jsonb,         -- legal-entity for Impressum (U11)
  add column if not exists legal_pages jsonb not null default '{}'::jsonb;   -- generated impressum/privacy/terms (U11)

-- Slugs are unique (case-insensitive) for public routing.
create unique index if not exists partners_slug_key on public.partners (lower(slug)) where slug is not null;

-- Public hostname → partner map for multi-tenant resolution (U12/U13).
create table if not exists public.partner_domains (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid references public.partners(id) on delete cascade,
  hostname text not null unique,
  kind text not null default 'cname',     -- subpath | cname | vercel
  verified boolean not null default false,
  verify_token text,
  vercel_project_id text,
  created_at timestamptz not null default now()
);
alter table public.partner_domains enable row level security;  -- admin RPC only

-- Admin: set a partner's full site (slug + sections/nav + published gate).
create or replace function public.admin_set_partner_site(p_id uuid, p_slug text, p_site jsonb, p_published boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  update public.partners set
    slug = coalesce(nullif(trim(p_slug), ''), slug),
    site_config = coalesce(p_site, site_config),
    site_published = coalesce(p_published, site_published)
  where id = p_id;
end $$;

-- Partner edits their own site content (slug/publish stay founder-controlled).
create or replace function public.partner_update_site(p_site jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s jsonb;
begin
  update public.partners set site_config = coalesce(p_site, '{}'::jsonb)
    where id = auth.uid() returning site_config into s;
  if s is null then raise exception 'no partner for this user'; end if;
  return s;
end $$;

-- Public read of a PUBLISHED partner site by slug. Anon-safe: only published, and only
-- non-sensitive site/brand/legal data (never partner PII or unpublished drafts).
create or replace function public.public_partner_site(p_key text)
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'partner_id', p.id,
    'company_name', p.company_name,
    'slug', p.slug,
    'brand_kit', coalesce(p.brand_kit, '{}'::jsonb),
    'site_config', coalesce(p.site_config, '{}'::jsonb),
    'legal_pages', coalesce(p.legal_pages, '{}'::jsonb)
  )
  from public.partners p
  where p.site_published = true and lower(p.slug) = lower(p_key)
  limit 1;
$$;
grant execute on function public.public_partner_site(text) to anon, authenticated;

-- Extend the U6 review payload with the site fields so the admin review modal can also
-- manage the slug / publish state and seed the site from the ingested copy.
create or replace function public.admin_partner_brand_review(p_partner_id uuid)
returns jsonb language sql security definer set search_path = public stable as $$
  select case when public.is_admin() then jsonb_build_object(
    'partner_id', p.id,
    'company_name', p.company_name,
    'preview_token', p.preview_token,
    'slug', p.slug,
    'site_published', p.site_published,
    'site_config', coalesce(p.site_config, '{}'::jsonb),
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
