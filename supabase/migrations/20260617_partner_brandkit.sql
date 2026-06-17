-- Partner ingest + brand-kit foundation (Phase 1). Brand kit (colours/fonts/logo),
-- scraped pages/USP, tech-stack read, a multi-image gallery per car, and the ingest
-- job table. Brand kit is non-sensitive (branding) → readable publicly for storefront
-- theming; admin/partner write paths are gated.

alter table public.partners
  add column if not exists brand_kit jsonb not null default '{}'::jsonb,
  add column if not exists brand_kit_raw jsonb not null default '{}'::jsonb,
  add column if not exists partner_pages jsonb not null default '{}'::jsonb,
  add column if not exists tech_stack jsonb not null default '{}'::jsonb,
  add column if not exists drive_folder_url text;

-- Multi-image gallery: [{ url, type: 'hero'|'interior'|'detail', caption }]. photo_url
-- stays the hero for back-compat.
alter table public.listings
  add column if not exists photos jsonb not null default '[]'::jsonb;

create table if not exists public.partner_ingest_jobs (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid references public.partners(id) on delete cascade,
  url text,
  status text not null default 'queued',     -- queued|scraping|crawling|enriching|ready|failed
  firecrawl_crawl_id text,
  screenshot_url text,
  error text,
  created_at timestamptz not null default now()
);
alter table public.partner_ingest_jobs enable row level security;  -- admin RPC only

-- Admin: set a partner's live brand kit (used by the review/apply flow).
create or replace function public.admin_set_partner_brand_kit(p_id uuid, p_brand_kit jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  update public.partners set brand_kit = coalesce(p_brand_kit, '{}'::jsonb) where id = p_id;
end $$;

create or replace function public.admin_list_ingest_jobs()
returns setof public.partner_ingest_jobs language sql security definer set search_path = public stable as $$
  select * from public.partner_ingest_jobs where public.is_admin() order by created_at desc;
$$;

-- Partner edits their own brand kit (Design tab). partners.id = the auth user id.
create or replace function public.partner_update_brand_kit(p_brand_kit jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare k jsonb;
begin
  update public.partners set brand_kit = coalesce(p_brand_kit, '{}'::jsonb)
    where id = auth.uid() returning brand_kit into k;
  if k is null then raise exception 'no partner for this user'; end if;
  return k;
end $$;

-- Public read of a partner's brand kit (colours/fonts/logo only) for storefront /
-- preview theming. Safe to expose to anon.
create or replace function public.partner_brand_kit(p_partner_id uuid)
returns jsonb language sql security definer set search_path = public stable as $$
  select coalesce(brand_kit, '{}'::jsonb) from public.partners where id = p_partner_id;
$$;
grant execute on function public.partner_brand_kit(uuid) to anon, authenticated;
