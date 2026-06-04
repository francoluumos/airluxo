-- Subscribed customers whose birthday (from the licence on file) is today, in
-- Europe/Zurich. SECURITY DEFINER + execute granted only to service_role, so only
-- the cron/edge function (never the browser) can read this PII list.
create or replace function public.marketing_birthday_recipients()
returns table (id uuid, full_name text, email text, unsubscribe_token uuid)
language sql security definer set search_path = public stable as $$
  select c.id, c.full_name, c.email, s.unsubscribe_token
  from public.customers c
  join public.newsletter_subscribers s on lower(s.email) = lower(c.email)
  where s.subscribed
    and c.licence->>'birth_date' ~ '^\d{4}-\d{2}-\d{2}$'
    and substr(c.licence->>'birth_date', 6, 5) = to_char((now() at time zone 'Europe/Zurich'), 'MM-DD');
$$;

revoke execute on function public.marketing_birthday_recipients() from public, anon, authenticated;
grant execute on function public.marketing_birthday_recipients() to service_role;
