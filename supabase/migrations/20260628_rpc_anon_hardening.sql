-- AIRLUXO — RPC execute-grant hardening (security review H3 / M-referral)
--
-- The partner self-edit RPCs and apply_referral are SECURITY DEFINER and, by the
-- Postgres default, EXECUTE is granted to PUBLIC (anon + authenticated). They are
-- only meant for a signed-in partner/customer. They already raise when no partner
-- row matches auth.uid(), but anon should never be able to invoke them at all:
--   * defence in depth behind the implicit "partners.id = auth.uid()" invariant
--   * apply_referral otherwise acts as a referral-code existence oracle for anon.
--
-- Revoke anon EXECUTE and add an explicit "must be signed in" guard so the privilege
-- boundary is enforced by a role check, not just by the id-mapping assumption.

revoke execute on function public.partner_update_site(jsonb) from anon;
revoke execute on function public.partner_update_brand_kit(jsonb) from anon;
revoke execute on function public.partner_update_legal(jsonb, jsonb) from anon;
revoke execute on function public.apply_referral(text) from anon;

-- Re-assert: these stay callable by the signed-in user only.
grant execute on function public.partner_update_site(jsonb) to authenticated;
grant execute on function public.partner_update_brand_kit(jsonb) to authenticated;
grant execute on function public.partner_update_legal(jsonb, jsonb) to authenticated;
grant execute on function public.apply_referral(text) to authenticated;

create or replace function public.partner_update_site(p_site jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s jsonb;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  update public.partners set site_config = coalesce(p_site, '{}'::jsonb)
    where id = auth.uid() returning site_config into s;
  if s is null then raise exception 'no partner for this user'; end if;
  return s;
end $$;

create or replace function public.partner_update_brand_kit(p_brand_kit jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare k jsonb;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  update public.partners set brand_kit = coalesce(p_brand_kit, '{}'::jsonb)
    where id = auth.uid() returning brand_kit into k;
  if k is null then raise exception 'no partner for this user'; end if;
  return k;
end $$;

create or replace function public.partner_update_legal(p_legal jsonb, p_legal_pages jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare out jsonb;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  update public.partners set
    legal = coalesce(p_legal, legal),
    legal_pages = coalesce(p_legal_pages, legal_pages)
  where id = auth.uid()
  returning jsonb_build_object('legal', legal, 'legal_pages', legal_pages) into out;
  if out is null then raise exception 'no partner for this user'; end if;
  return out;
end $$;

create or replace function public.apply_referral(p_code text)
returns boolean language plpgsql security definer set search_path = public as $$
declare ref uuid;
begin
  if auth.uid() is null then return false; end if;
  if p_code is null or length(trim(p_code)) = 0 then return false; end if;
  select id into ref from public.customers where referral_code = upper(trim(p_code)) limit 1;
  if ref is null or ref = auth.uid() then return false; end if;
  update public.customers set referred_by = ref
    where id = auth.uid() and referred_by is null;
  return found;
end $$;
