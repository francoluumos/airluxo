-- Prospect/CRM pipeline (Phase 1). Applied to live 2026-06-03. CRM fields on
-- partners (a prospect is a pre-partner) + admin-gated RPCs for the board.

alter table public.partners
  add column if not exists is_prospect boolean not null default false,
  add column if not exists preview_token uuid not null default gen_random_uuid(),
  add column if not exists pipeline_stage text,
  add column if not exists prospect_contact_name text,
  add column if not exists prospect_contact_email text,
  add column if not exists prospect_contact_phone text,
  add column if not exists prospect_source text,
  add column if not exists prospect_notes text;

create or replace function public.admin_list_prospects()
returns table (
  id uuid, company_name text, pipeline_stage text, preview_token uuid,
  prospect_contact_name text, prospect_contact_email text, prospect_contact_phone text,
  prospect_source text, prospect_notes text, created_at timestamptz, car_count bigint
) language sql security definer set search_path = public stable as $$
  select p.id, p.company_name, p.pipeline_stage, p.preview_token,
         p.prospect_contact_name, p.prospect_contact_email, p.prospect_contact_phone,
         p.prospect_source, p.prospect_notes, p.created_at,
         (select count(*) from public.listings l where l.partner_id = p.id) as car_count
  from public.partners p
  where p.is_prospect = true and public.is_admin()
  order by p.created_at desc;
$$;

create or replace function public.admin_set_prospect_stage(p_id uuid, p_stage text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if p_stage not in ('lead', 'preview_built', 'shared', 'negotiating', 'won', 'lost') then
    raise exception 'invalid stage';
  end if;
  update public.partners set pipeline_stage = p_stage where id = p_id and is_prospect = true;
end $$;

create or replace function public.admin_update_prospect(
  p_id uuid, p_notes text, p_contact_name text, p_contact_email text, p_contact_phone text
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  update public.partners set
    prospect_notes = p_notes,
    prospect_contact_name = p_contact_name,
    prospect_contact_email = p_contact_email,
    prospect_contact_phone = p_contact_phone
  where id = p_id and is_prospect = true;
end $$;
