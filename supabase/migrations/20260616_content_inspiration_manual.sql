-- Manual inspiration: hand-pick a specific reel/post by link, independent of the
-- watchlist scan. Stored immediately; the scrape job (U3) later enriches manual
-- rows that lack metrics. `source` distinguishes 'manual' (hand-added) from
-- 'scraped' (watchlist scan).

alter table public.content_inspiration
  add column if not exists source text not null default 'scraped',
  add column if not exists note text;

-- Add (or re-flag) a reel/post by URL. Idempotent on reel_url.
create or replace function public.admin_add_inspiration_link(p_url text, p_note text)
returns public.content_inspiration language plpgsql security definer set search_path = public as $$
declare row public.content_inspiration; u text := trim(p_url);
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if u = '' or u !~* '^https?://' then raise exception 'a valid URL is required'; end if;
  insert into public.content_inspiration (reel_url, note, source, source_handle)
    values (u, p_note, 'manual', null)
  on conflict (reel_url) do update set
    note = coalesce(excluded.note, public.content_inspiration.note),
    source = 'manual'
  returning * into row;
  return row;
end $$;
