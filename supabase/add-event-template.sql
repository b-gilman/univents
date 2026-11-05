-- =============================================================================
-- TEMPLATE: add an event
--
-- Supabase dashboard → SQL Editor → New query → paste → edit the values → Run.
-- (You can also add rows by hand in Table Editor → events.)
-- =============================================================================

-- 1) Add the organizing club once (skip if it already exists).
insert into public.organizations (name, verified)
values ('Concordia Student Union', true)
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
  'Welcome Back Mixer',
  'Meet new people, free snacks and music. Bring a friend!',
  '2026-11-14 19:00 America/Montreal',     -- start (keep "America/Montreal")
  '2026-11-14 22:00 America/Montreal',     -- end (or null)
  'SGW',                                   -- SGW, Loyola, Off-campus or Online
  'Hall Building, H-110',
  (select id from public.organizations where name = 'Concordia Student Union'),
  'social',     -- party, academic, sports, arts, career, cultural, social, other
  null,         -- image link in quotes, or null
  null,         -- sign-up / ticket link in quotes, or null
  0             -- price in cents: 0 = free, 1500 = $15.00
);

-- To hide an event without deleting it:
--   update public.events set status = 'draft' where title = 'Welcome Back Mixer';
-- To delete it:
--   delete from public.events where title = 'Welcome Back Mixer';
