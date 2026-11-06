-- =============================================================================
-- TEMPLATE: add an event
--
-- Supabase dashboard → SQL Editor → New query → paste → edit the values → Run.
-- (You can also add rows by hand in Table Editor → events.)
--
-- Replace EVERY value in CAPITALS. If you run it unedited, the dates are
-- invalid so Supabase shows an error and nothing is added.
-- =============================================================================

-- 1) Add the organizing club once (skip if it already exists).
insert into public.organizations (name, verified)
values ('CLUB NAME', false)
on conflict (name) do nothing;

-- 2) Add the event.
insert into public.events (
  title, description,
  starts_at, ends_at,
  campus, location,
  organization_id,
  category, image_url, signup_url, price_cents
)
values (
  'EVENT TITLE',
  'DESCRIPTION',
  'YYYY-MM-DD HH:MM America/Montreal',     -- start, e.g. 2026-11-20 19:00 (keep "America/Montreal")
  'YYYY-MM-DD HH:MM America/Montreal',     -- end, or null
  'SGW',                                   -- SGW, Loyola, Off-campus or Online
  'BUILDING AND ROOM',
  (select id from public.organizations where name = 'CLUB NAME'),
  'social',     -- party, academic, sports, arts, career, cultural, social, other
  null,         -- image link in quotes, or null
  null,         -- sign-up / ticket link in quotes, or null
  0             -- price in cents: 0 = free, 1500 = $15.00, null = not announced
);

-- To hide an event without deleting it:
--   update public.events set status = 'draft' where title = 'EVENT TITLE';
-- To delete it:
--   delete from public.events where title = 'EVENT TITLE';
