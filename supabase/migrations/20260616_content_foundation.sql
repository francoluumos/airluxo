-- Content-automation subsystem (founder dashboard → Content). Four tables for the
-- mine → generate → approve → publish pipeline, admin-gated via is_admin() RPCs
-- (RLS on, no client policy — access only through SECURITY DEFINER RPCs / service-
-- role edge functions, same posture as the prospect pipeline). Plus a public
-- content-media storage bucket for generated reels/carousels.

-- ── Tables ──────────────────────────────────────────────────────────────
create table if not exists public.content_watchlist (
  id uuid primary key default gen_random_uuid(),
  platform text not null default 'instagram',
  handle text not null,
  note text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.content_inspiration (
  id uuid primary key default gen_random_uuid(),
  source_handle text,
  reel_url text unique,
  caption text,
  hashtags jsonb not null default '[]'::jsonb,
  views bigint,
  likes bigint,
  comments bigint,
  posted_at timestamptz,
  audio_title text,
  emotion_tags jsonb not null default '[]'::jsonb,
  work_score double precision,
  scraped_at timestamptz not null default now()
);
create index if not exists content_inspiration_score_idx on public.content_inspiration (work_score desc nulls last);

create table if not exists public.content_drafts (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete set null,
  format text not null default 'reel',          -- 'reel' | 'carousel'
  concept_brief jsonb not null default '{}'::jsonb,
  asset_urls jsonb not null default '[]'::jsonb, -- storage URLs of generated media
  caption text,
  virality_score double precision,
  hook_score double precision,
  status text not null default 'generated',      -- generated|approved|rejected|scheduled|posted|failed
  inspiration_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists content_drafts_status_idx on public.content_drafts (status, created_at desc);

create table if not exists public.content_posts (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid references public.content_drafts(id) on delete cascade,
  postiz_post_id text,
  scheduled_for timestamptz,
  targets jsonb not null default '[]'::jsonb,     -- which channels
  status text not null default 'scheduled',       -- scheduled|publishing|posted|failed
  posted_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists content_posts_due_idx on public.content_posts (status, scheduled_for);

alter table public.content_watchlist enable row level security;
alter table public.content_inspiration enable row level security;
alter table public.content_drafts enable row level security;
alter table public.content_posts enable row level security;
-- No client policies: admins read/write via the SECURITY DEFINER RPCs below;
-- service-role edge functions (scrape/ingest/publish) bypass RLS.

-- ── Storage bucket for generated media ──────────────────────────────────
insert into storage.buckets (id, name, public)
  values ('content-media', 'content-media', true)
  on conflict (id) do nothing;

-- ── Watchlist RPCs ──────────────────────────────────────────────────────
create or replace function public.admin_list_watchlist()
returns setof public.content_watchlist language sql security definer set search_path = public stable as $$
  select * from public.content_watchlist where public.is_admin() order by created_at desc;
$$;

create or replace function public.admin_upsert_watchlist(
  p_id uuid, p_platform text, p_handle text, p_note text, p_active boolean
) returns public.content_watchlist language plpgsql security definer set search_path = public as $$
declare row public.content_watchlist;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if coalesce(trim(p_handle), '') = '' then raise exception 'handle required'; end if;
  if p_id is null then
    insert into public.content_watchlist (platform, handle, note, active)
      values (coalesce(nullif(trim(p_platform), ''), 'instagram'), trim(p_handle), p_note, coalesce(p_active, true))
      returning * into row;
  else
    update public.content_watchlist set
      platform = coalesce(nullif(trim(p_platform), ''), platform),
      handle = trim(p_handle), note = p_note, active = coalesce(p_active, active)
      where id = p_id returning * into row;
  end if;
  return row;
end $$;

create or replace function public.admin_delete_watchlist(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  delete from public.content_watchlist where id = p_id;
end $$;

-- ── Inspiration / drafts / posts RPCs ───────────────────────────────────
create or replace function public.admin_list_inspiration(p_limit int default 200)
returns setof public.content_inspiration language sql security definer set search_path = public stable as $$
  select * from public.content_inspiration where public.is_admin()
  order by work_score desc nulls last, scraped_at desc limit greatest(1, p_limit);
$$;

create or replace function public.admin_list_drafts(p_status text default null)
returns setof public.content_drafts language sql security definer set search_path = public stable as $$
  select * from public.content_drafts
  where public.is_admin() and (p_status is null or status = p_status)
  order by created_at desc;
$$;

create or replace function public.admin_set_draft_status(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if p_status not in ('generated', 'approved', 'rejected', 'scheduled', 'posted', 'failed') then
    raise exception 'invalid status';
  end if;
  update public.content_drafts set status = p_status where id = p_id;
end $$;

-- Approve + schedule in one step: stamp the draft scheduled and create a post row.
create or replace function public.admin_schedule_draft(p_draft_id uuid, p_scheduled_for timestamptz, p_targets jsonb)
returns public.content_posts language plpgsql security definer set search_path = public as $$
declare row public.content_posts;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if p_scheduled_for is null or p_scheduled_for < now() then raise exception 'schedule must be in the future'; end if;
  if p_targets is null or jsonb_array_length(p_targets) = 0 then raise exception 'pick at least one channel'; end if;
  update public.content_drafts set status = 'scheduled' where id = p_draft_id;
  insert into public.content_posts (draft_id, scheduled_for, targets)
    values (p_draft_id, p_scheduled_for, p_targets) returning * into row;
  return row;
end $$;

create or replace function public.admin_list_content_posts()
returns setof public.content_posts language sql security definer set search_path = public stable as $$
  select * from public.content_posts where public.is_admin() order by scheduled_for desc nulls last, created_at desc;
$$;
