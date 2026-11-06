-- =============================================================================
-- Update 3: "Submit an event" form + admin approval
--
-- HOW TO RUN: Supabase → SQL Editor → New query → paste → Run. Run it once,
-- AFTER the two earlier migration files.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Submissions: who sent an event in. PRIVATE: the website's public key can
--    never read this table (contact emails stay private). Only the server,
--    using the secret key, can read or write it.
-- -----------------------------------------------------------------------------
create table if not exists public.submissions (
  id             uuid primary key default gen_random_uuid(),
  org_name       text not null,    -- club name exactly as the submitter typed it
  contact_email  text not null,
  submitter_hash text,             -- anonymous fingerprint, only used to limit spam
  created_at     timestamptz not null default now()
);

alter table public.submissions enable row level security;
-- No policies on purpose: with RLS on and no policies, the public key sees nothing.
revoke all on public.submissions from anon, authenticated;

create index if not exists submissions_spam_idx
  on public.submissions (submitter_hash, created_at);


-- -----------------------------------------------------------------------------
-- 2. Events get two new statuses:
--      pending  = submitted, waiting for your review (hidden from the site)
--      rejected = you said no (kept for your records, hidden from the site)
--    The existing security rule only shows 'published' events, so nothing
--    else needs to change for pending/rejected events to stay hidden.
-- -----------------------------------------------------------------------------
alter table public.events drop constraint if exists events_status_check;
alter table public.events add constraint events_status_check
  check (status in ('draft', 'published', 'pending', 'rejected'));

-- Links each event to the submission it came from. A weekly event submitted
-- once becomes several event rows that share one submission_id.
alter table public.events
  add column if not exists submission_id uuid
  references public.submissions (id) on delete set null;

create index if not exists events_submission_id_idx on public.events (submission_id);
create index if not exists events_status_idx on public.events (status);
