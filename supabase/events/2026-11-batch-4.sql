-- =============================================================================
-- Event batch 4 (added 2026-11-07), from Instagram posts Brett sent
--   • GCES Entrepreneurship Talks with Siegfried Tremblay: Tue Nov 10, MB 14.250
--   • ASAC Mic Drop Night: Wed Nov 11, Reggie's Bar (Hall Building)
--   • LASO WTF Fiesta: Una Noche en Nueva York: Fri Nov 13, 60 Rue Saint-Jacques
--
-- HOW TO RUN: Supabase → SQL Editor → New query → paste → Run.
-- Needs the migration files to have been run first.
-- Safe to run twice: clubs and events that already exist are skipped.
-- =============================================================================

insert into public.organizations (name, verified, website_url, instagram_url) values
  ('GCES Concordia', false, null, 'https://www.instagram.com/gces.concordia/'),
  ('ASAC Concordia', false, null, 'https://www.instagram.com/asacconcordia/'),
  ('LASO Concordia', false, null, 'https://www.instagram.com/lasoconcordia/')
on conflict (name) do nothing;


-- -----------------------------------------------------------------------------
-- Each row: title, description, start, end, campus, location, organization,
-- category, poster, info link, price in cents (null = not announced).
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
    'Entrepreneurship Talks with Siegfried Tremblay',
    'Big ideas start with a little curiosity. Get a glimpse into the realities '
      || 'of entrepreneurship with Siegfried Tremblay at GCES''s next '
      || 'Entrepreneurship Talks. Come for the insights, stay for the '
      || 'conversation (and pizza). Save your spot through the link in GCES''s '
      || 'Instagram bio.',
    timestamptz '2026-11-10 12:30 America/Montreal',
    timestamptz '2026-11-10 13:30 America/Montreal',
    'SGW', 'MB 14.250, John Molson Building',
    'GCES Concordia', 'career', null::text,       -- the post is a video, no poster
    'https://www.instagram.com/p/DfVbxojxFEr/', null::integer
  ),
  (
    'Mic Drop Night',
    'Do you have a special talent that has yet to shine on a stage? ASAC is '
      || 'hosting a night just for you, together with five other student '
      || 'associations. Whether you can sing, dance or have the best jokes, '
      || 'come enjoy one of the most entertaining nights with the ASAC family. '
      || 'Free entry. All performers AND attendees must fill in the '
      || 'registration form (link in ASAC''s Instagram bio). See you on stage!',
    timestamptz '2026-11-11 18:00 America/Montreal',
    timestamptz '2026-11-11 21:00 America/Montreal',
    'SGW', 'Reggie''s Bar, Hall Building (H-231), 1455 De Maisonneuve Blvd. W.',
    'ASAC Concordia', 'arts', '/events/asac-mic-drop-night-nov-2026.webp',
    'https://www.instagram.com/p/DfXIHv5prl1/', 0
  ),
  (
    'WTF Fiesta: Una Noche en Nueva York',
    'The wait is over: WTFIESTA is back! Get ready for Una Noche en Nueva York, '
      || 'a night full of music, dancing and Latino vibes, with music by '
      || 'Valekitta. Grab your friends, bring your best moves, and get ready '
      || 'for a night to remember. Tickets through the link in LASO''s '
      || 'Instagram bio.',
    timestamptz '2026-11-13 22:00 America/Montreal',
    null,                                       -- end time not announced
    'Off-campus', '60 Rue Saint-Jacques, Montréal',
    'LASO Concordia', 'party', '/events/laso-wtf-fiesta-nov-2026.webp',
    'https://www.instagram.com/p/DfSEAsCP_FA/', null   -- ticket price not shown
  )
) as v(title, description, starts_at, ends_at, campus, location, org,
       category, image_url, info_url, price_cents)
where not exists (
  select 1 from public.events e
  where e.title = v.title and e.starts_at = v.starts_at
);


-- Check the result.
select title, starts_at at time zone 'America/Montreal' as starts_montreal,
       campus, price_cents
from public.events
where title in ('Entrepreneurship Talks with Siegfried Tremblay',
                'Mic Drop Night', 'WTF Fiesta: Una Noche en Nueva York')
order by starts_at;
