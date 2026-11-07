-- =============================================================================
-- Update 9: club stats and messages to followers
--
-- • Counts how many times each event page is viewed (a number per day only:
--   nothing about who viewed it).
-- • Organisers see their events' views on their dashboard.
-- • Organisers can email a short update to their club's followers.
--
-- HOW TO RUN: Supabase → SQL Editor → New query → paste → Run. Run it once,
-- AFTER the earlier migration files. Safe to run again.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Event page views, one row per event per day.
--    Only the server (secret key) can add to it.
-- -----------------------------------------------------------------------------
create table if not exists public.event_views (
  event_id uuid not null references public.events (id) on delete cascade,
  day      date not null,
  views    integer not null default 0,
  primary key (event_id, day)
);
alter table public.event_views enable row level security;
-- (No policies: the website's public key can't read or write it directly.)

create or replace function public.record_event_view(p_event uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.event_views (event_id, day, views)
  select e.id, (now() at time zone 'America/Montreal')::date, 1
  from public.events e
  where e.id = p_event and e.status = 'published'
  on conflict (event_id, day) do update set views = public.event_views.views + 1;
$$;
revoke all on function public.record_event_view(uuid) from public, anon, authenticated;
grant execute on function public.record_event_view(uuid) to service_role;

-- Views of a club's events (all time and last 7 days), ONLY for its organisers.
create or replace function public.club_event_views(org uuid)
returns table (event_id uuid, views_total bigint, views_7d bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select v.event_id,
         sum(v.views),
         sum(v.views) filter (
           where v.day > (now() at time zone 'America/Montreal')::date - 7
         )
  from public.event_views v
  join public.events e on e.id = v.event_id
  where e.organization_id = org
    and public.is_org_member(org)
  group by v.event_id;
$$;
revoke all on function public.club_event_views(uuid) from public, anon;
grant execute on function public.club_event_views(uuid) to authenticated;


-- -----------------------------------------------------------------------------
-- 2. Messages from clubs to their followers.
--    A record of what was sent (and how many it went to); organisers can see
--    their own club's messages. Sending happens on the server.
-- -----------------------------------------------------------------------------
create table if not exists public.club_messages (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  sent_by         uuid references auth.users (id) on delete set null,
  title           text not null check (char_length(title) between 1 and 80),
  body            text not null check (char_length(body) between 1 and 1000),
  recipients      integer not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists club_messages_org_idx
  on public.club_messages (organization_id, created_at desc);

alter table public.club_messages enable row level security;
drop policy if exists "Organisers can see their club's messages" on public.club_messages;
create policy "Organisers can see their club's messages"
  on public.club_messages for select to authenticated
  using (public.is_org_member(organization_id));
grant select on public.club_messages to authenticated;

-- Who to email: a club's followers who have emails switched on.
-- Includes email addresses, so ONLY the server (secret key) may call it.
create or replace function public.club_follower_emails(org uuid)
returns table (email text, full_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select u.email::text, p.full_name
  from public.follows f
  join public.profiles p on p.id = f.user_id and p.email_reminders
  join auth.users u      on u.id = f.user_id
  where f.organization_id = org;
$$;
revoke all on function public.club_follower_emails(uuid) from public, anon, authenticated;
grant execute on function public.club_follower_emails(uuid) to service_role;
