-- Founder/admin gating (Phase 0). Applied to live 2026-06-03. Security boundary is
-- server-side: is_admin() is checked in admin-scoped edge functions + RLS, never
-- trusted from the client/URL.

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;
drop policy if exists "app_admins own read" on public.app_admins;
create policy "app_admins own read" on public.app_admins
  for select using (user_id = auth.uid());

create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid());
$$;

-- Seed Franco (franco@luumos.io). Add more admins with:
--   insert into public.app_admins (user_id) values ('<auth.users.id>');
insert into public.app_admins (user_id)
values ('cb500e2f-f90d-4725-aec6-77a570efaebf')
on conflict (user_id) do nothing;
