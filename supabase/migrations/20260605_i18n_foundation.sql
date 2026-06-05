-- Localization foundation. English is the source (lives in the repo, src/locales/en.js);
-- DE/FR/IT translations live here so the founder Translation section can edit + AI-fill
-- them at runtime. Public read (the site renders from these); admin-only writes.

alter table public.customers add column if not exists locale text;
alter table public.partners  add column if not exists locale text;

create table if not exists public.translations (
  locale text not null,
  key text not null,
  value text not null,
  source_hash text,            -- hash of the EN source when translated → stale detection
  auto boolean not null default false,  -- true = AI-generated, not yet human-reviewed
  updated_at timestamptz not null default now(),
  primary key (locale, key)
);
create index if not exists translations_locale_idx on public.translations(locale);

alter table public.translations enable row level security;
-- Anyone can read translations (the public site renders from them).
drop policy if exists translations_public_read on public.translations;
create policy translations_public_read on public.translations for select using (true);
-- Only admins manage them (the founder Translation section).
drop policy if exists translations_admin_write on public.translations;
create policy translations_admin_write on public.translations for all
  using (public.is_admin()) with check (public.is_admin());
