-- U12/U13: public host resolution + admin domain management for own-domain deploy.
-- Multi-tenant: a partner CNAMEs their domain at the shared deploy; the app resolves the
-- partner by hostname. Only verified domains of published sites resolve. A dedicated
-- Vercel project per partner is the documented upsell (vercel_project_id is recorded).

-- Public: resolve a verified custom hostname → its published partner site (anon-safe).
create or replace function public.public_partner_site_by_host(p_host text)
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'partner_id', p.id, 'company_name', p.company_name, 'slug', p.slug,
    'brand_kit', coalesce(p.brand_kit, '{}'::jsonb),
    'site_config', coalesce(p.site_config, '{}'::jsonb),
    'legal_pages', coalesce(p.legal_pages, '{}'::jsonb)
  )
  from public.partner_domains d
  join public.partners p on p.id = d.partner_id
  where d.verified = true and p.site_published = true
    and lower(d.hostname) = lower(regexp_replace(p_host, '^www\.', ''))
  limit 1;
$$;
grant execute on function public.public_partner_site_by_host(text) to anon, authenticated;

-- Admin: add a domain (returns the row incl. a verify token + the CNAME target the UI shows).
create or replace function public.admin_add_partner_domain(p_partner_id uuid, p_hostname text, p_kind text)
returns public.partner_domains language plpgsql security definer set search_path = public as $$
declare row public.partner_domains;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if coalesce(trim(p_hostname), '') = '' then raise exception 'hostname required'; end if;
  insert into public.partner_domains (partner_id, hostname, kind, verify_token)
    values (p_partner_id, lower(regexp_replace(trim(p_hostname), '^www\.', '')),
            coalesce(nullif(trim(p_kind), ''), 'cname'),
            'airluxo-verify-' || substr(md5(random()::text), 1, 12))
    returning * into row;
  return row;
end $$;

create or replace function public.admin_list_partner_domains(p_partner_id uuid)
returns setof public.partner_domains language sql security definer set search_path = public stable as $$
  select * from public.partner_domains where public.is_admin() and partner_id = p_partner_id order by created_at;
$$;

create or replace function public.admin_set_domain_verified(p_id uuid, p_verified boolean, p_vercel_project_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  update public.partner_domains
    set verified = coalesce(p_verified, verified),
        vercel_project_id = coalesce(p_vercel_project_id, vercel_project_id)
  where id = p_id;
end $$;

create or replace function public.admin_remove_partner_domain(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  delete from public.partner_domains where id = p_id;
end $$;
