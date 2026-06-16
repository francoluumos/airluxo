-- Lead enrichment + notes: a website (for AI enrichment) and VAT number on a
-- prospect, plus a timestamped note log (reusing partner_events kind='note').

alter table public.partners
  add column if not exists prospect_website text,
  add column if not exists prospect_vat text;

-- Append a timestamped note to a prospect's log. Returns the new entry.
create or replace function public.admin_add_prospect_note(p_id uuid, p_text text)
returns table (id uuid, text text, at timestamptz)
language plpgsql security definer set search_path = public as $$
declare new_id uuid; new_at timestamptz;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if coalesce(trim(p_text), '') = '' then raise exception 'empty note'; end if;
  insert into public.partner_events (partner_id, kind, detail)
    values (p_id, 'note', trim(p_text))
    returning partner_events.id, partner_events.created_at into new_id, new_at;
  return query select new_id, trim(p_text), new_at;
end $$;

-- The note log for a prospect, newest first.
create or replace function public.admin_list_prospect_notes(p_id uuid)
returns table (id uuid, text text, at timestamptz)
language sql security definer set search_path = public stable as $$
  select e.id, e.detail as text, e.created_at as at
  from public.partner_events e
  where e.partner_id = p_id and e.kind = 'note' and public.is_admin()
  order by e.created_at desc;
$$;

-- Pipeline board carries website + VAT (return type changed → drop+recreate).
drop function if exists public.admin_list_prospects();
create function public.admin_list_prospects()
returns table (
  id uuid, company_name text, pipeline_stage text, preview_token uuid,
  prospect_contact_name text, prospect_contact_email text, prospect_contact_phone text,
  prospect_source text, prospect_notes text,
  prospect_street text, prospect_street_number text, prospect_zip text, prospect_city text,
  prospect_country text, prospect_lat double precision, prospect_lng double precision,
  prospect_links jsonb, prospect_website text, prospect_vat text,
  created_at timestamptz, car_count bigint
) language sql security definer set search_path = public stable as $$
  select p.id, p.company_name, p.pipeline_stage, p.preview_token,
         p.prospect_contact_name, p.prospect_contact_email, p.prospect_contact_phone,
         p.prospect_source, p.prospect_notes,
         p.prospect_street, p.prospect_street_number, p.prospect_zip, p.prospect_city,
         p.prospect_country, p.prospect_lat, p.prospect_lng, p.prospect_links,
         p.prospect_website, p.prospect_vat,
         p.created_at,
         (select count(*) from public.listings l where l.partner_id = p.id) as car_count
  from public.partners p
  where p.is_prospect = true and public.is_admin()
  order by p.created_at desc;
$$;

drop function if exists public.admin_list_partners();
create function public.admin_list_partners()
returns table (
  id uuid, company_name text, contact_name text, phone text, plan text,
  is_prospect boolean, pipeline_stage text, prospect_contact_email text,
  prospect_source text, login_email text, created_at timestamptz, car_count bigint,
  archived_at timestamptz,
  prospect_street text, prospect_street_number text, prospect_zip text, prospect_city text,
  prospect_country text, prospect_lat double precision, prospect_lng double precision,
  prospect_links jsonb, prospect_website text, prospect_vat text
) language sql security definer set search_path = public stable as $$
  select p.id, p.company_name, p.contact_name,
         (case when p.is_prospect then p.prospect_contact_phone else p.phone end) as phone,
         p.plan, p.is_prospect, p.pipeline_stage, p.prospect_contact_email, p.prospect_source,
         u.email::text, p.created_at,
         (select count(*) from public.listings l where l.partner_id = p.id),
         p.archived_at,
         p.prospect_street, p.prospect_street_number, p.prospect_zip, p.prospect_city,
         p.prospect_country, p.prospect_lat, p.prospect_lng, p.prospect_links,
         p.prospect_website, p.prospect_vat
  from public.partners p join auth.users u on u.id = p.id
  where public.is_admin()
  order by p.created_at desc;
$$;
