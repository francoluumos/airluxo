-- AIRLUXO — licence-session bearer tokens (security review C3)
--
-- The desktop↔mobile licence hand-off keyed everything off the session id alone:
-- anyone who learned/guessed an id could READ the extracted driver's-licence PII
-- (get) or OVERWRITE a victim's session (submit). Add two unguessable tokens so
-- possession — not mere knowledge of the id — is required:
--   * read_token   — held only by the desktop that created the session; required on `get`.
--   * submit_token — carried in the QR to the phone; required on `submit`.
-- Plus created_at for a short TTL so stale sessions/PII expire.

alter table public.licence_sessions
  add column if not exists read_token   uuid not null default gen_random_uuid(),
  add column if not exists submit_token uuid not null default gen_random_uuid(),
  add column if not exists created_at    timestamptz not null default now();
