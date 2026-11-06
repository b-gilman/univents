-- =============================================================================
-- Update 5: student accounts and RSVPs
--
-- Logins themselves are handled by Supabase Auth (the built-in auth.users
-- table). This adds each student's profile (full name, school) and their RSVPs.
--
-- HOW TO RUN: Supabase → SQL Editor → New query → paste → Run. Run it once,
-- AFTER the four earlier migration files.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Profiles: one per account. Created automatically when someone signs up.
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null check (char_length(full_name) between 1 and 100),
  school_id  text references public.schools (id),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Students can see and edit ONLY their own profile.
drop policy if exists "Students can view their own profile" on public.profiles;
create policy "Students can view their own profile"
  on public.profiles for select to authenticated using (id = (select auth.uid()));
drop policy if exists "Students can update their own profile" on public.profiles;
create policy "Students can update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
grant select, update (full_name, school_id) on public.profiles to authenticated;

-- When an account is created, copy the name and school given at sign-up into
-- a profile. (security definer = runs with permission to write profiles.)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, school_id)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'Student'), 100),
    (select s.id from public.schools s where s.id = new.raw_user_meta_data ->> 'school_id')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- -----------------------------------------------------------------------------
-- 2. RSVPs: "I'm going" to an event. One per student per event date.
-- -----------------------------------------------------------------------------
create table if not exists public.rsvps (
  event_id   uuid not null references public.events (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index if not exists rsvps_user_idx on public.rsvps (user_id);

alter table public.rsvps enable row level security;

-- Students see only their OWN RSVPs (nobody can list who else is going).
drop policy if exists "Students can view their own RSVPs" on public.rsvps;
create policy "Students can view their own RSVPs"
  on public.rsvps for select to authenticated using (user_id = (select auth.uid()));

-- Students can RSVP for themselves, to published events only.
drop policy if exists "Students can RSVP to published events" on public.rsvps;
create policy "Students can RSVP to published events"
  on public.rsvps for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.events e where e.id = event_id and e.status = 'published')
  );

-- Students can cancel their own RSVPs.
drop policy if exists "Students can cancel their own RSVPs" on public.rsvps;
create policy "Students can cancel their own RSVPs"
  on public.rsvps for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, delete on public.rsvps to authenticated;


-- -----------------------------------------------------------------------------
-- 3. "N going" counts, visible to everyone. Returns only numbers, never names.
-- -----------------------------------------------------------------------------
create or replace function public.rsvp_counts(event_ids uuid[])
returns table (event_id uuid, going bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select r.event_id, count(*) as going
  from public.rsvps r
  join public.events e on e.id = r.event_id and e.status = 'published'
  where r.event_id = any (event_ids)
  group by r.event_id;
$$;

revoke all on function public.rsvp_counts(uuid[]) from public;
grant execute on function public.rsvp_counts(uuid[]) to anon, authenticated;


-- -----------------------------------------------------------------------------
-- To see WHO is going to an event (admin only, here in the SQL Editor):
--
--   select p.full_name, u.email, r.created_at
--   from public.rsvps r
--   join public.profiles p on p.id = r.user_id
--   join auth.users u on u.id = r.user_id
--   where r.event_id = 'PASTE-EVENT-ID-HERE'
--   order by r.created_at;
-- -----------------------------------------------------------------------------
