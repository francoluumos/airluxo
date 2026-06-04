-- AI-assisted car description shown on the booking detail popup.
alter table public.listings add column if not exists description text;
