-- =============================================================================
-- Event batch 3 (added 2026-11-06), found with Claude in Chrome on Instagram
--   • CSEA x MESA Paint & Sip: Fri Nov 6, Hive Café
--   • 180 Degrees Consulting x PwC Case Competition: Sat Nov 7, JMSB
--   • JLCC Japanese Language & Culture Lounge: Tuesdays Nov 10 – Dec 8
--   • Queer Concordia Paint Night: Wed Nov 11, Hive Café
--   • Concordia Outdoors Fall Cabin Trip: Nov 13–15, Lac Morgan
--
-- HOW TO RUN: Supabase → SQL Editor → New query → paste → Run.
-- Needs both migration files to have been run first.
-- Safe to run twice: events that already exist are skipped.
-- =============================================================================

insert into public.organizations (name, verified, website_url) values
  ('CSEA Concordia',                   false, 'https://www.instagram.com/cseaconcordia/'),
  ('180 Degrees Consulting Concordia', false, 'https://www.instagram.com/180dconcordia/'),
  ('Concordia Japanese Language and Culture Community (JLCC)', false,
                                              'https://www.instagram.com/jlcc.official/'),
  ('Queer Concordia',                  false, 'https://www.instagram.com/queerconcordia/'),
  ('Concordia Outdoors',               false, 'https://www.instagram.com/concordiaoutdoors/')
on conflict (name) do nothing;


-- -----------------------------------------------------------------------------
-- One-off events. Each row: title, description, start, end, campus, location,
-- organization, category, poster, info link, price in cents (null = TBA).
-- -----------------------------------------------------------------------------
insert into public.events (
  title, description, starts_at, ends_at, campus, location, organization_id,
  category, image_url, signup_url, info_url, price_cents
)
select v.title, v.description, v.starts_at, v.ends_at, v.campus, v.location,
       (select id from public.organizations o where o.name = v.org),
       v.category, v.image_url, null, v.info_url, v.price_cents
from (values
  (
    'Paint & Sip Night',
    'CSEA and MESA are hosting a paint and sip! Grab your friends and come get '
      || 'creative with us. No painting experience needed, just bring your '
      || 'creativity. Register via the link in CSEA''s Instagram bio.',
    timestamptz '2026-11-06 18:00 America/Montreal',
    timestamptz '2026-11-06 21:00 America/Montreal',
    'SGW', 'The Hive Café Mezzanine, Hall Building',
    'CSEA Concordia', 'arts', null::text,
    'https://www.instagram.com/p/DfHrRrjxeRc/', null::integer
  ),
  (
    '180 DC x PwC Case Competition',
    'Ready to put your consulting skills to the test? Join 180 Degrees '
      || 'Consulting Concordia for a case competition in partnership with PwC. '
      || 'You''ll get a real-world business case and 4 hours with your team to '
      || 'develop a strategic solution, then pitch it to a panel of PwC judges '
      || 'and industry professionals. A prize goes to the winners. No team? '
      || 'Register individually and you''ll be placed on one. Register via the '
      || 'link in 180 DC''s Instagram bio.',
    timestamptz '2026-11-07 09:00 America/Montreal',
    null,                                      -- end time not announced
    'SGW', 'John Molson School of Business (MB Building)',
    '180 Degrees Consulting Concordia', 'career', null,   -- poster: see notes
    'https://www.instagram.com/p/DeevY1OR19J/', null
  ),
  (
    'Queer Concordia Paint Night',
    'Come get creative and spend an evening painting with us! It doesn''t '
      || 'matter if you''re an experienced artist or just here for vibes: '
      || 'everyone is welcome. Supplies included. Meet new friends and unleash '
      || 'your inner artist!',
    timestamptz '2026-11-11 18:30 America/Montreal',
    timestamptz '2026-11-11 21:30 America/Montreal',
    'SGW', 'The Hive Café co-op, Hall Building Mezzanine',
    'Queer Concordia', 'arts', '/events/queer-concordia-paint-night-nov-2026.webp',
    'https://www.instagram.com/p/DfX6lWiyBvF/', null
  ),
  (
    'Fall Cabin Trip',
    'The fall cabin trip is back! Escape the city and spend a weekend at Lac '
      || 'Morgan surrounded by nature, fun activities and amazing people. The '
      || 'bus leaves at 5:30 on Friday Nov 13 and heads back around noon on '
      || 'Sunday Nov 15. Price: $110. Ticket sales were Nov 2 and 3 at 5:30 PM; '
      || 'check Concordia Outdoors'' Instagram for availability.',
    timestamptz '2026-11-13 17:30 America/Montreal',
    timestamptz '2026-11-15 12:00 America/Montreal',
    'Off-campus', 'Lac Morgan (bus from Montreal)',
    'Concordia Outdoors', 'social', '/events/concordia-outdoors-cabin-trip-nov-2026.webp',
    'https://www.instagram.com/p/DfM3DLXRebZ/', 11000
  )
) as v(title, description, starts_at, ends_at, campus, location, org,
       category, image_url, info_url, price_cents)
where not exists (
  select 1 from public.events e
  where e.title = v.title and e.starts_at = v.starts_at
);


-- -----------------------------------------------------------------------------
-- JLCC Japanese Language & Culture Lounge: every Tuesday 5–6 p.m.
-- (runs Sep 29 – Dec 8; only the remaining sessions are added)
-- -----------------------------------------------------------------------------
insert into public.events (
  title, description, starts_at, ends_at, campus, location, organization_id,
  category, image_url, signup_url, info_url, price_cents
)
select
  'Japanese Language & Culture Lounge',
  'Practice Japanese through conversation and language games! Hosted by JLCC '
    || 'with support from the Centre for the Study of Learning and Performance '
    || '(CSLP). All levels welcome, including people who are simply curious '
    || 'about Japanese language and culture. Open to Concordia students, '
    || 'community members and students from other institutions. No '
    || 'registration required. Contact: concordia.jlcc@gmail.com',
  (day + time '17:00') at time zone 'America/Montreal',
  (day + time '18:00') at time zone 'America/Montreal',
  'SGW',
  'CSLP, Grey Nuns Annex (GA) Room 1.210, 1211 Saint-Mathieu St.',
  (select id from public.organizations
    where name = 'Concordia Japanese Language and Culture Community (JLCC)'),
  'cultural',
  '/events/jlcc-japanese-lounge-fall-2026.webp',
  null,
  'https://www.instagram.com/p/DdsSutxtctl/',
  0
from (
  select d::date as day
  from generate_series(date '2026-11-10', date '2026-12-08', interval '7 days') as d
) as days
where not exists (
  select 1 from public.events e
  where e.title = 'Japanese Language & Culture Lounge'
    and e.starts_at = (day + time '17:00') at time zone 'America/Montreal'
);


-- Check the result.
select title, starts_at at time zone 'America/Montreal' as starts_montreal,
       campus, price_cents
from public.events
where created_at > now() - interval '5 minutes'
order by starts_at;
