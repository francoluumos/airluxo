-- Phase 3: token-gated preview. Applied to live 2026-06-03. Tighten the public
-- listings read to fully exclude prospects (defense in depth), and expose prospect
-- cars only through a token-checked RPC used by the preview embed.

drop policy if exists "listings_public_read" on public.listings;
create policy "listings_public_read" on public.listings
  for select using (status <> 'Draft' and is_prospect = false);

create or replace function public.preview_listings(p_partner_id uuid, p_token uuid)
returns setof public.listings
language sql security definer set search_path = public stable as $$
  select l.*
  from public.listings l
  join public.partners pa on pa.id = l.partner_id
  where l.partner_id = p_partner_id
    and l.status <> 'Draft'
    and pa.preview_token = p_token;
$$;
