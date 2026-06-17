-- The async fleet crawl must not block the job: partner-ingest now sets 'ready' as soon
-- as the homepage scrape + car extraction finish (the data the founder reviews). The
-- crawl only *augments* car images later (via the poll) and is tracked by crawl_done, so
-- a missing/disabled poll cron can never leave a job stuck in 'crawling'.

alter table public.partner_ingest_jobs
  add column if not exists crawl_done boolean not null default false;

-- Unstick any job currently left in 'crawling' (homepage data is already there).
update public.partner_ingest_jobs set status = 'ready' where status = 'crawling';
