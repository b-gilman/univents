-- =============================================================================
-- Update 7: organiser accounts
--
-- A club's organisers are students' accounts linked to the club. They can
-- post and manage the club's events and see who RSVP'd. Events from VERIFIED
-- clubs go live right away; others wait for admin review.
-- Organisers are added by the admin on /admin/organisers.
--
-- HOW TO RUN: Supabase → SQL Editor → New query → paste → Run. Run it once,
-- AFTER the earlier migration files.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Who organises which club
-- -----------------------------------------------------------------------------
create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index if not exists organization_members_user_idx on public.organization_members (user_id);

alter table public.organization_members enable row level security;

-- Students can see which clubs THEY organise. Adding/removing is admin-only.
drop policy if exists "Organisers can see their own memberships" on public.organization_members;
create policy "Organisers can see their own memberships"
  on public.organization_members for select to authenticated
  using (user_id = (select auth.uid()));
grant select on public.organization_members to authenticated;

-- Is the logged-in student an organiser of this club?
create or replace function public.is_org_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org and m.user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_org_member(uuid) from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated;


-- -----------------------------------------------------------------------------
-- 2. Organisers can see ALL their club's events (also pending / rejected),
--    in addition to the published events everyone sees.
-- -----------------------------------------------------------------------------
drop policy if exists "Organisers can view their club's events" on public.events;
create policy "Organisers can view their club's events"
  on public.events for select to authenticated
  using (public.is_org_member(organization_id));


-- -----------------------------------------------------------------------------
-- 3. Who's coming: names of students who RSVP'd, ONLY for organisers of the
--    event's club. Names only, never emails.
-- -----------------------------------------------------------------------------
create or replace function public.event_attendees(p_event uuid)
returns table (full_name text, rsvped_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.full_name, r.created_at
  from public.rsvps r
  join public.profiles p on p.id = r.user_id
  join public.events e on e.id = r.event_id
  where r.event_id = p_event
    and public.is_org_member(e.organization_id)
  order by r.created_at;
$$;
revoke all on function public.event_attendees(uuid) from public, anon;
grant execute on function public.event_attendees(uuid) to authenticated;


-- -----------------------------------------------------------------------------
-- 4. Admin helpers (server only, with the secret key): find an account by
--    email, and list every club's organisers with their emails.
-- -----------------------------------------------------------------------------
create or replace function public.admin_find_user(p_email text)
returns table (user_id uuid, full_name text, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, p.full_name, u.email::text
  from auth.users u
  left join public.profiles p on p.id = u.id
  where lower(u.email) = lower(trim(p_email));
$$;
revoke all on function public.admin_find_user(text) from public, anon, authenticated;
grant execute on function public.admin_find_user(text) to service_role;

create or replace function public.admin_org_members()
returns table (organization_id uuid, user_id uuid, full_name text, email text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select m.organization_id, m.user_id, p.full_name, u.email::text, m.created_at
  from public.organization_members m
  join auth.users u on u.id = m.user_id
  left join public.profiles p on p.id = m.user_id
  order by m.created_at;
$$;
revoke all on function public.admin_org_members() from public, anon, authenticated;
grant execute on function public.admin_org_members() to service_role;
