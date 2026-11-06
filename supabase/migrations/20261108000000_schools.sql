-- =============================================================================
-- Update 4: multiple schools
--
-- Each school has its own name, colour and campuses. Every event, club and
-- submission belongs to a school. Existing data is assigned to Concordia.
--
-- HOW TO RUN: Supabase → SQL Editor → New query → paste → Run. Run it once,
-- AFTER the three earlier migration files.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Schools
-- -----------------------------------------------------------------------------
create table if not exists public.schools (
  -- Short id used in web addresses: univents…/concordia
  id            text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name          text not null,                 -- "Concordia University"
  short_name    text not null,                 -- "Concordia"
  primary_color text not null check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  -- The school's own campuses, shown as filters and in the submit form.
  -- ("Off-campus" and "Online" are always available too.)
  campuses      text[] not null default '{}',
  time_zone     text not null default 'America/Montreal',
  active        boolean not null default true,  -- false = hidden from the picker
  created_at    timestamptz not null default now()
);

alter table public.schools enable row level security;
drop policy if exists "Anyone can view active schools" on public.schools;
create policy "Anyone can view active schools"
  on public.schools for select to anon, authenticated using (active);
grant select on public.schools to anon, authenticated;

insert into public.schools (id, name, short_name, primary_color, campuses)
values ('concordia', 'Concordia University', 'Concordia', '#912338', '{SGW,Loyola}')
on conflict (id) do nothing;


-- -----------------------------------------------------------------------------
-- 2. Every event, club and submission belongs to a school.
--    The default is 'concordia' so existing data and the batch SQL files
--    keep working unchanged.
-- -----------------------------------------------------------------------------
alter table public.events
  add column if not exists school_id text not null default 'concordia'
  references public.schools (id);
alter table public.organizations
  add column if not exists school_id text not null default 'concordia'
  references public.schools (id);
alter table public.submissions
  add column if not exists school_id text not null default 'concordia'
  references public.schools (id);

create index if not exists events_school_starts_idx on public.events (school_id, starts_at);

-- Campuses now depend on the school (checked by the website instead).
alter table public.events drop constraint if exists events_campus_check;


-- -----------------------------------------------------------------------------
-- 3. The homepage list now includes school_id (added at the end).
-- -----------------------------------------------------------------------------
create or replace view public.upcoming_events
with (security_invoker = true)
as
select
  e.id,
  e.title,
  e.description,
  e.starts_at,
  e.ends_at,
  e.campus,
  e.location,
  e.category,
  e.image_url,
  e.signup_url,
  e.price_cents,
  o.name as organization_name,
  e.info_url,
  e.school_id
from public.events e
left join public.organizations o on o.id = e.organization_id
where coalesce(e.ends_at, e.starts_at + interval '4 hours') >= now()
order by e.starts_at;

grant select on public.upcoming_events to anon, authenticated;


-- -----------------------------------------------------------------------------
-- TO ADD ANOTHER SCHOOL LATER (example, edit the values and run on its own):
--
--   insert into public.schools (id, name, short_name, primary_color, campuses)
--   values ('school-id', 'Full School Name', 'Short Name', '#123456', '{Main Campus}');
-- -----------------------------------------------------------------------------
