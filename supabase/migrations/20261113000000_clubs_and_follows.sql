-- =============================================================================
-- Update 8: club pages and following clubs
--
-- • Clubs get a profile: description, logo and Instagram link.
-- • Students can follow clubs. The daily email then also lists NEW events
--   from the clubs they follow.
--
-- HOW TO RUN: Supabase → SQL Editor → New query → paste → Run. Run it once,
-- AFTER the earlier migration files. Safe to run again.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Club profile fields (everyone can already read clubs).
--    Organisers and the admin edit them through the website (server side).
-- -----------------------------------------------------------------------------
alter table public.organizations
  add column if not exists description   text check (char_length(description) <= 1000),
  add column if not exists logo_url      text,
  add column if not exists instagram_url text;


-- -----------------------------------------------------------------------------
-- 2. When an event went live. Set automatically whenever an event becomes
--    'published' (posted by a verified club, or approved by the admin), so
--    "new events from clubs you follow" works for both.
-- -----------------------------------------------------------------------------
alter table public.events add column if not exists published_at timestamptz;
update public.events set published_at = created_at
  where status = 'published' and published_at is null;

create or replace function public.set_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published'
     and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.published_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists events_set_published_at on public.events;
create trigger events_set_published_at
  before insert or update of status on public.events
  for each row execute function public.set_published_at();


-- -----------------------------------------------------------------------------
-- 3. Following clubs. Each student sees and changes ONLY their own follows.
--    Nobody else (not even the club) can see who follows it: only a count.
-- -----------------------------------------------------------------------------
create table if not exists public.follows (
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (user_id, organization_id)
);
create index if not exists follows_org_idx on public.follows (organization_id);

alter table public.follows enable row level security;

drop policy if exists "Students can see their own follows" on public.follows;
create policy "Students can see their own follows"
  on public.follows for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists "Students can follow clubs" on public.follows;
create policy "Students can follow clubs"
  on public.follows for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists "Students can unfollow clubs" on public.follows;
create policy "Students can unfollow clubs"
  on public.follows for delete to authenticated
  using (user_id = (select auth.uid()));
grant select, insert, delete on public.follows to authenticated;

-- How many students follow a club (a number only, never names).
create or replace function public.follower_count(org uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) from public.follows f where f.organization_id = org;
$$;
revoke all on function public.follower_count(uuid) from public;
grant execute on function public.follower_count(uuid) to anon, authenticated;


-- -----------------------------------------------------------------------------
-- 4. The event list now also includes the club's id (added at the end), so
--    tapping a club's name can open its page.
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
  e.school_id,
  e.organization_id
from public.events e
left join public.organizations o on o.id = e.organization_id
where coalesce(e.ends_at, e.starts_at + interval '4 hours') >= now()
order by e.starts_at;

grant select on public.upcoming_events to anon, authenticated;


-- -----------------------------------------------------------------------------
-- 5. Daily email: new events from followed clubs.
--    club_news_sent_at = up to when we've already told the student, so the
--    same event is never announced twice.
-- -----------------------------------------------------------------------------
alter table public.profiles add column if not exists club_news_sent_at timestamptz;

-- New upcoming events (published after the last email, and after the student
-- followed the club) for students who have emails switched on. Includes email
-- addresses, so ONLY the server (secret key) may call it.
create or replace function public.due_club_news(p_now timestamptz)
returns table (
  user_id           uuid,
  email             text,
  full_name         text,
  event_id          uuid,
  title             text,
  starts_at         timestamptz,
  ends_at           timestamptz,
  campus            text,
  location          text,
  organization_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select f.user_id, u.email::text, p.full_name,
         e.id, e.title, e.starts_at, e.ends_at, e.campus, e.location, o.name
  from public.follows f
  join public.profiles p      on p.id = f.user_id and p.email_reminders
  join auth.users u           on u.id = f.user_id
  join public.organizations o on o.id = f.organization_id
  join public.events e        on e.organization_id = f.organization_id
                             and e.status = 'published'
  where e.published_at > greatest(f.created_at, coalesce(p.club_news_sent_at, '-infinity'))
    and e.published_at <= p_now
    and e.starts_at > p_now
  order by e.starts_at;
$$;

revoke all on function public.due_club_news(timestamptz) from public, anon, authenticated;
grant execute on function public.due_club_news(timestamptz) to service_role;
