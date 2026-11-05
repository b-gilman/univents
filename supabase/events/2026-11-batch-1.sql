-- =============================================================================
-- Event batch 1 (added 2026-11-05)
--   • Chess at Concordia: weekly chess meetings (Tue & Fri, Nov 6 – Dec 4)
--   • Concordia Student Union: by-election voting (Nov 9–11, online)
--
-- HOW TO RUN: Supabase → SQL Editor → New query → paste this file → Run.
-- Safe to run twice: events that already exist are skipped.
-- Posters are stored in the website itself (public/events/), not Supabase.
-- =============================================================================

-- Make sure the website is allowed to read events (harmless if already done;
-- this was added to the setup file after it was first shared).
grant select on public.organizations, public.events, public.upcoming_events
  to anon, authenticated;

-- Organizations (skipped if they already exist).
-- verified = false: they haven't joined the site as approved organizers yet.
insert into public.organizations (name, verified, website_url) values
  ('Chess at Concordia',      false, 'https://www.instagram.com/chessatconcordia/'),
  ('Concordia Student Union', false, 'https://www.instagram.com/csumtl/')
on conflict (name) do nothing;


-- -----------------------------------------------------------------------------
-- Chess meetings: one event per Tuesday and Friday, 5–8 p.m., Nov 6 – Dec 4
-- -----------------------------------------------------------------------------
insert into public.events (
  title, description, starts_at, ends_at, campus, location,
  organization_id, category, image_url, signup_url, price_cents
)
select
  'Chess Meetings',
  'Your weekly reminder to make your next move. Join us for our weekly chess '
    || 'meetings! Whether you''re an advanced player in the making or still '
    || 'figuring out how the knight moves, everyone''s welcome. All levels '
    || 'welcome, no sign-up needed, all chess materials provided. Bring your '
    || 'friends, bring your strategy, and most importantly… don''t blunder.',
  (day + time '17:00') at time zone 'America/Montreal',
  (day + time '20:00') at time zone 'America/Montreal',
  'SGW',
  'Hall Building, 7th floor',
  (select id from public.organizations where name = 'Chess at Concordia'),
  'social',
  '/events/chess-meetings.webp',
  null,
  0
-- ::date keeps these as plain calendar days, so 17:00 means 5 p.m. Montreal.
from (
  select d::date as day
  from generate_series(date '2026-11-06', date '2026-12-04', interval '1 day') as d
) as days
where extract(isodow from day) in (2, 5)   -- 2 = Tuesday, 5 = Friday
  and not exists (
    select 1 from public.events e
    where e.title = 'Chess Meetings'
      and e.starts_at = (day + time '17:00') at time zone 'America/Montreal'
  );


-- -----------------------------------------------------------------------------
-- CSU by-elections: online voting, Nov 9–11
-- -----------------------------------------------------------------------------
insert into public.events (
  title, description, starts_at, ends_at, campus, location,
  organization_id, category, image_url, signup_url, price_cents
)
select
  'CSU By-Elections: Vote',
  'From November 9 to 11, Concordia undergrads vote on who represents you on '
    || 'the CSU Council and how on-campus groups get funded. On the ballot: '
    || 'CSU Council seats for the Gina Cody School of Engineering and Computer '
    || 'Science (5) and Fine Arts (2), plus four fee levy proposals: Art '
    || 'Matters, the CSU Legal Information Clinic, Honey''s Soupe Populaire, and '
    || 'The Concordian. Voting happens online: watch your Concordia email for '
    || 'your official ballot from SimplyVoting. Questions? Email ceo@csu.qc.ca',
  timestamptz '2026-11-09 00:00 America/Montreal',
  timestamptz '2026-11-11 23:59 America/Montreal',
  'Online',
  'Ballot sent to your Concordia email (SimplyVoting)',
  (select id from public.organizations where name = 'Concordia Student Union'),
  'other',
  '/events/csu-by-elections-nov-2026.webp',
  null,
  0
where not exists (
  select 1 from public.events e where e.title = 'CSU By-Elections: Vote'
);


-- Check the result: should list 9 chess meetings and 1 by-election.
select title, starts_at at time zone 'America/Montreal' as starts_montreal, campus
from public.events
order by starts_at;
