-- Lead enrichment: a structured Swiss address + a list of web/social links on a
-- prospect (and any partner). Address autocompleted client-side via geo.admin.ch.
-- prospect_links is a jsonb array of { platform, url }.

alter table public.partners
  add column if not exists prospect_street text,
  add column if not exists prospect_street_number text,
  add column if not exists prospect_zip text,
  add column if not exists prospect_city text,
  add column if not exists prospect_country text,
  add column if not exists prospect_lat double precision,
  add column if not exists prospect_lng double precision,
  add column if not exists prospect_links jsonb not null default '[]'::jsonb;

-- Pipeline board now carries the lead's address + links (return type changed → drop+recreate).
drop function if exists public.admin_list_prospects();
create function public.admin_list_prospects()
returns table (
  id uuid, company_name text, pipeline_stage text, preview_token uuid,
  prospect_contact_name text, prospect_contact_email text, prospect_contact_phone text,
  prospect_source text, prospect_notes text,
  prospect_street text, prospect_street_number text, prospect_zip text, prospect_city text,
  prospect_country text, prospect_lat double precision, prospect_lng double precision,
  prospect_links jsonb, created_at timestamptz, car_count bigint
) language sql security definer set search_path = public stable as $$
  select p.id, p.company_name, p.pipeline_stage, p.preview_token,
         p.prospect_contact_name, p.prospect_contact_email, p.prospect_contact_phone,
         p.prospect_source, p.prospect_notes,
         p.prospect_street, p.prospect_street_number, p.prospect_zip, p.prospect_city,
         p.prospect_country, p.prospect_lat, p.prospect_lng, p.prospect_links,
         p.created_at,
         (select count(*) from public.listings l where l.partner_id = p.id) as car_count
  from public.partners p
  where p.is_prospect = true and public.is_admin()
  order by p.created_at desc;
$$;

-- Partners section also exposes the address + links so the edit sheet can prefill.
drop function if exists public.admin_list_partners();
create function public.admin_list_partners()
returns table (
  id uuid, company_name text, contact_name text, phone text, plan text,
  is_prospect boolean, pipeline_stage text, prospect_contact_email text,
  prospect_source text, login_email text, created_at timestamptz, car_count bigint,
  archived_at timestamptz,
  prospect_street text, prospect_street_number text, prospect_zip text, prospect_city text,
  prospect_country text, prospect_lat double precision, prospect_lng double precision,
  prospect_links jsonb
) language sql security definer set search_path = public stable as $$
  select p.id, p.company_name, p.contact_name,
         (case when p.is_prospect then p.prospect_contact_phone else p.phone end) as phone,
         p.plan, p.is_prospect, p.pipeline_stage, p.prospect_contact_email, p.prospect_source,
         u.email::text, p.created_at,
         (select count(*) from public.listings l where l.partner_id = p.id),
         p.archived_at,
         p.prospect_street, p.prospect_street_number, p.prospect_zip, p.prospect_city,
         p.prospect_country, p.prospect_lat, p.prospect_lng, p.prospect_links
  from public.partners p join auth.users u on u.id = p.id
  where public.is_admin()
  order by p.created_at desc;
$$;
