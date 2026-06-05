-- First-run setup guide for partners. Null = never finished/skipped the tour, so it
-- auto-starts once; stamped on finish or skip. Partners can replay from Settings.
alter table public.partners add column if not exists onboarded_at timestamptz;
