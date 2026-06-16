-- Founder Security section: automated catalog-based security checks (RLS, policies,
-- SECURITY DEFINER search_path, extension placement) + a few manual config checks,
-- stored per run and re-run daily by pg_cron. Surfaced read-only via admin RPCs.

create table if not exists public.security_runs (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  passed int not null default 0,
  warnings int not null default 0,
  failures int not null default 0,
  manual int not null default 0,
  findings jsonb not null default '[]'
);
alter table public.security_runs enable row level security;  -- no client policy: read via admin RPC only

-- Compute the current findings array (one object per check).
create or replace function public.security_audit_compute()
returns jsonb language plpgsql security definer set search_path = public, pg_catalog stable as $$
declare
  rls_off text[]; rls_nopol text[]; sp_mut text[]; ext_pub text[];
begin
  select coalesce(array_agg(c.relname order by c.relname), '{}') into rls_off
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

  select coalesce(array_agg(c.relname order by c.relname), '{}') into rls_nopol
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
    and not exists (select 1 from pg_policy p where p.polrelid = c.oid);

  select coalesce(array_agg(p.proname order by p.proname), '{}') into sp_mut
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef
    and not exists (select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) cfg where cfg like 'search_path=%');

  select coalesce(array_agg(e.extname order by e.extname), '{}') into ext_pub
  from pg_extension e join pg_namespace n on n.oid = e.extnamespace
  where n.nspname = 'public' and e.extname <> 'plpgsql';

  return jsonb_build_array(
    jsonb_build_object('key', 'rls_enabled', 'title', 'Row Level Security on all public tables',
      'severity', 'high', 'status', case when array_length(rls_off, 1) is null then 'pass' else 'fail' end,
      'items', to_jsonb(rls_off),
      'detail', case when array_length(rls_off, 1) is null then 'Every public table has RLS enabled.'
        else array_length(rls_off, 1) || ' table(s) have RLS disabled — readable/writable through the API without a policy.' end,
      'remediation', 'alter table public.<table> enable row level security; then add the right policies.'),
    jsonb_build_object('key', 'rls_policies', 'title', 'RLS tables define policies',
      'severity', 'medium', 'status', case when array_length(rls_nopol, 1) is null then 'pass' else 'warn' end,
      'items', to_jsonb(rls_nopol),
      'detail', case when array_length(rls_nopol, 1) is null then 'All RLS tables define at least one policy.'
        else array_length(rls_nopol, 1) || ' table(s) have RLS on but no policy (deny-all). Confirm that is intended.' end,
      'remediation', 'Add explicit policies, or confirm the table is intentionally locked to service-role only.'),
    jsonb_build_object('key', 'func_search_path', 'title', 'SECURITY DEFINER functions pin search_path',
      'severity', 'medium', 'status', case when array_length(sp_mut, 1) is null then 'pass' else 'warn' end,
      'items', to_jsonb(sp_mut),
      'detail', case when array_length(sp_mut, 1) is null then 'All SECURITY DEFINER functions set a fixed search_path.'
        else array_length(sp_mut, 1) || ' definer function(s) run without a pinned search_path (privilege-escalation risk).' end,
      'remediation', 'Add: set search_path = public to each SECURITY DEFINER function.'),
    jsonb_build_object('key', 'ext_schema', 'title', 'Extensions outside the public schema',
      'severity', 'low', 'status', case when array_length(ext_pub, 1) is null then 'pass' else 'warn' end,
      'items', to_jsonb(ext_pub),
      'detail', case when array_length(ext_pub, 1) is null then 'No extensions installed in public.'
        else array_length(ext_pub, 1) || ' extension(s) live in public; best practice is a dedicated schema.' end,
      'remediation', 'Move extensions to an "extensions" schema.'),
    jsonb_build_object('key', 'leaked_pw', 'title', 'Leaked-password protection enabled',
      'severity', 'medium', 'status', 'manual', 'items', '[]'::jsonb,
      'detail', 'Supabase Auth can reject passwords found in known breaches (HaveIBeenPwned). Verify it is ON.',
      'remediation', 'Supabase → Authentication → Policies → enable “Leaked password protection”.'),
    jsonb_build_object('key', 'mfa', 'title', 'MFA available (at least for admins)',
      'severity', 'low', 'status', 'manual', 'items', '[]'::jsonb,
      'detail', 'Offer TOTP multi-factor auth, especially for the founder/admin accounts.',
      'remediation', 'Supabase → Authentication → enable MFA (TOTP).'),
    jsonb_build_object('key', 'admin_fn_jwt', 'title', 'Admin edge functions enforce is_admin + verify_jwt',
      'severity', 'high', 'status', 'manual', 'items', '[]'::jsonb,
      'detail', 'Every admin-* edge function must verify the JWT and check app_admins before acting.',
      'remediation', 'Confirm verify_jwt is ON and the is_admin/app_admins check exists in each admin function.')
  );
end $$;

-- Run + persist a snapshot (no auth gate; only callable by cron / the admin wrapper).
create or replace function public._run_security_audit()
returns jsonb language plpgsql security definer set search_path = public as $$
declare f jsonb; p int; w int; fa int; m int; rid uuid;
begin
  f := public.security_audit_compute();
  select count(*) filter (where x->>'status' = 'pass'),
         count(*) filter (where x->>'status' = 'warn'),
         count(*) filter (where x->>'status' = 'fail'),
         count(*) filter (where x->>'status' = 'manual')
    into p, w, fa, m
  from jsonb_array_elements(f) x;
  insert into public.security_runs (findings, passed, warnings, failures, manual)
    values (f, coalesce(p, 0), coalesce(w, 0), coalesce(fa, 0), coalesce(m, 0))
    returning id into rid;
  return (select to_jsonb(s) from public.security_runs s where s.id = rid);
end $$;
revoke all on function public._run_security_audit() from anon, authenticated;
revoke all on function public.security_audit_compute() from anon, authenticated;

create or replace function public.admin_run_security_audit()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return public._run_security_audit();
end $$;

create or replace function public.admin_latest_security()
returns jsonb language plpgsql security definer set search_path = public stable as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return jsonb_build_object(
    'latest', (select to_jsonb(s) from public.security_runs s order by s.ran_at desc limit 1),
    'history', (select coalesce(jsonb_agg(to_jsonb(h) order by h.ran_at desc), '[]'::jsonb)
                from (select ran_at, passed, warnings, failures, manual
                      from public.security_runs order by ran_at desc limit 14) h)
  );
end $$;

-- Seed one run now, and schedule a daily re-run (03:00 UTC). Idempotent.
select public._run_security_audit();
do $$ begin perform cron.unschedule('security-audit-daily'); exception when others then null; end $$;
select cron.schedule('security-audit-daily', '0 3 * * *', $$ select public._run_security_audit(); $$);
