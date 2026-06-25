-- AIRLUXO — car_suggestions
-- Public "what car should be up next?" poll on a partner's white-label site. Anonymous
-- visitors submit { brand, type, optional email }; writes go through the suggest-car edge
-- function (service role), so the browser never touches this table. The owning partner
-- (and admins) can read their own suggestions for a future dashboard view.

create table if not exists public.car_suggestions (
  id          uuid primary key default gen_random_uuid(),
  partner_id  uuid not null references public.partners(id) on delete cascade,
  brand       text not null,
  type        text,
  email       text,
  created_at  timestamptz not null default now()
);

create index if not exists car_suggestions_partner_idx
  on public.car_suggestions (partner_id, created_at desc);

alter table public.car_suggestions enable row level security;

-- No client INSERT policy: writes go through the suggest-car edge function (service role).
-- The owning partner reads their own suggestions; admins read all.
drop policy if exists car_suggestions_owner_read on public.car_suggestions;
create policy car_suggestions_owner_read on public.car_suggestions
  for select using (partner_id = auth.uid() or public.is_admin());
