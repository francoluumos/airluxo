-- AIRLUXO — lock down booking writes (security review C1/C2)
--
-- The live RLS policy `bookings_insert_any` was `WITH CHECK (true)` for anon +
-- authenticated, so any client could INSERT a booking row with an arbitrary
-- total_amount, payment_status, stripe_payment_intent_id and partner_id — bypassing
-- the server-side price computation entirely. Every money-moving function (capture,
-- refund, webhook, invoice) then trusted that client-written row.
--
-- Bookings are now created exclusively by the `create-booking` edge function, which
-- runs under the service role (and so bypasses RLS). Remove the permissive insert
-- policy so no anon/authenticated client can write the table directly. SELECT/UPDATE
-- policies (partner-scoped) are unchanged.
--
-- NOTE: the base `bookings` table lives only in the hosted DB (not in this migrations
-- tree), so this migration just drops the offending policy by name.

alter table public.bookings enable row level security;

drop policy if exists bookings_insert_any on public.bookings;

-- Defensive: ensure no other broad insert grant lingers for anon.
revoke insert on table public.bookings from anon;
