-- =============================================================================
-- Event batch 2 (added 2026-11-06)
--   • ASN x CRSC Basketball Tournament: Sat Nov 7, Collège de Maisonneuve
--   • SAWA à Maison (ASN x SAWA): Sat Nov 14, Maison Athlétique
--   • Adds "More info" links (original Instagram posts) to batch 1 events
--
-- HOW TO RUN: Supabase → SQL Editor → New query → paste → Run.
-- Run 20261106000000_optional_price_and_info_url.sql FIRST.
-- Safe to run twice: events that already exist are skipped.
-- =============================================================================

insert into public.organizations (name, verified, website_url) values
  ('ASN Concordia', false, 'https://www.instagram.com/asnconcordia/')
on conflict (name) do nothing;


-- -----------------------------------------------------------------------------
-- ASN x CRSC Basketball Tournament
-- -----------------------------------------------------------------------------
insert into public.events (
  title, description, starts_at, ends_at, campus, location, organization_id,
  category, image_url, signup_url, info_url, price_cents
)
select
  'ASN x CRSC Basketball Tournament',
  'We''re bringing it back! The ASN x CRSC Basketball Tournament returns, and '
    || 'this time it''s switching things up: mixed teams, friendly competition, '
    || 'good vibes all night, and prizes to be won. 6 men''s teams and 6 mixed '
    || 'teams (at least 2 girls per team), 5 players + up to 2 subs per team. '
    || 'Grab your teammates and bring your A-game. Tickets via the link in '
    || 'ASN''s Instagram bio.',
  timestamptz '2026-11-07 17:15 America/Montreal',
  timestamptz '2026-11-07 21:30 America/Montreal',
  'Off-campus',
  'Collège de Maisonneuve Gym',
  (select id from public.organizations where name = 'ASN Concordia'),
  'sports',
  '/events/asn-basketball-tournament-nov-2026.webp',
  null,
  'https://www.instagram.com/p/DfFbYpSAWF2/',
  2500                                   -- $25 per person
where not exists (
  select 1 from public.events e
  where e.title = 'ASN x CRSC Basketball Tournament'
    and e.starts_at = timestamptz '2026-11-07 17:15 America/Montreal'
);


-- -----------------------------------------------------------------------------
-- SAWA à Maison
-- -----------------------------------------------------------------------------
insert into public.events (
  title, description, starts_at, ends_at, campus, location, organization_id,
  category, image_url, signup_url, info_url, price_cents
)
select
  'SAWA à Maison',
  'ASN teams up with SAWA for one of the biggest student experiences this '
    || 'November: sports, culture, music and community in one night. Football '
    || '(8-team tournament), padel (competitive tournament), a guided Pilates '
    || 'session, an afterparty with a live DJ, and good food. Come to compete, '
    || 'support your friends, meet new people, or just enjoy the party. '
    || 'Tickets via the link in ASN''s Instagram bio.',
  timestamptz '2026-11-14 17:00 America/Montreal',
  timestamptz '2026-11-15 00:00 America/Montreal',   -- midnight
  'Off-campus',
  'Maison Athlétique, Montréal',
  (select id from public.organizations where name = 'ASN Concordia'),
  'sports',
  '/events/sawa-a-maison-nov-2026.webp',
  null,
  'https://www.instagram.com/p/De63jLegTQP/',
  null                                   -- ticket price not announced → "Price TBA"
where not exists (
  select 1 from public.events e
  where e.title = 'SAWA à Maison'
    and e.starts_at = timestamptz '2026-11-14 17:00 America/Montreal'
);


-- -----------------------------------------------------------------------------
-- "More info" links for batch 1 events
-- -----------------------------------------------------------------------------
update public.events set info_url = 'https://www.instagram.com/p/DdRYBHlxNxf/'
where title = 'Chess Meetings' and info_url is null;

update public.events set info_url = 'https://www.instagram.com/p/DfYC1OkjSpS/'
where title = 'CSU By-Elections: Vote' and info_url is null;


-- Check the result: every upcoming event, soonest first.
select title, starts_at at time zone 'America/Montreal' as starts_montreal,
       price_cents, info_url is not null as has_info_link
from public.events
order by starts_at;
