-- Published partner sites must show their own fleet even while the partner is still a
-- pipeline prospect (is_prospect = true). The anon RLS policy on listings excludes
-- prospect rows (marketplace exclusion), so the white-label site at /p/<slug> rendered
-- 0 cars. Expose a partner's cars through a security-definer RPC gated on site_published
-- = true (so only a live site reveals them, and only that partner's own listings).
create or replace function public.public_partner_listings(p_partner_id uuid)
returns setof public.listings
language sql security definer set search_path = public stable as $$
  select l.*
  from public.listings l
  join public.partners pa on pa.id = l.partner_id
  where l.partner_id = p_partner_id
    and l.status <> 'Draft'
    and pa.site_published = true;
$$;
grant execute on function public.public_partner_listings(uuid) to anon, authenticated;
