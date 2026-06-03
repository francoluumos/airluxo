-- Founder "Partners" section: every partner (prospects + live) with car count and
-- login email. Applied to live 2026-06-03. Status (prospecting/won/lost) is derived
-- client-side from is_prospect + pipeline_stage. Admin-gated.
-- Phone mirrors email: prospect_contact_phone for prospects, partners.phone for live.
create or replace function public.admin_list_partners()
returns table (
  id uuid, company_name text, contact_name text, phone text, plan text,
  is_prospect boolean, pipeline_stage text, prospect_contact_email text,
  prospect_source text, login_email text, created_at timestamptz, car_count bigint
) language sql security definer set search_path = public stable as $$
  select p.id, p.company_name, p.contact_name,
         (case when p.is_prospect then p.prospect_contact_phone else p.phone end) as phone,
         p.plan, p.is_prospect, p.pipeline_stage, p.prospect_contact_email, p.prospect_source,
         u.email::text as login_email, p.created_at,
         (select count(*) from public.listings l where l.partner_id = p.id) as car_count
  from public.partners p
  join auth.users u on u.id = p.id
  where public.is_admin()
  order by p.created_at desc;
$$;
