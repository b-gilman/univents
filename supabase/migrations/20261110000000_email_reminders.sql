-- =============================================================================
-- Update 6: email reminders ("your event is tomorrow")
--
-- HOW TO RUN: Supabase → SQL Editor → New query → paste → Run. Run it once,
-- AFTER the five earlier migration files.
-- =============================================================================

-- When a reminder was sent for this RSVP (empty = not yet), so nobody gets
-- the same reminder twice.
alter table public.rsvps add column if not exists reminded_at timestamptz;

-- Each student can switch reminder emails off on their "My events" page.
alter table public.profiles
  add column if not exists email_reminders boolean not null default true;
grant update (email_reminders) on public.profiles to authenticated;


-- Who needs a reminder for events starting between window_start and
-- window_end. Includes email addresses, so ONLY the server (secret key) may
-- call it: never the website's public key.
create or replace function public.due_reminders(window_start timestamptz, window_end timestamptz)
returns table (
  event_id  uuid,
  user_id   uuid,
  email     text,
  full_name text,
  title     text,
  starts_at timestamptz,
  ends_at   timestamptz,
  campus    text,
  location  text,
  school_id text
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.event_id, r.user_id, u.email::text, p.full_name,
         e.title, e.starts_at, e.ends_at, e.campus, e.location, e.school_id
  from public.rsvps r
  join public.events e   on e.id = r.event_id and e.status = 'published'
  join public.profiles p on p.id = r.user_id and p.email_reminders
  join auth.users u      on u.id = r.user_id
  where r.reminded_at is null
    and e.starts_at >= window_start
    and e.starts_at <  window_end
  order by e.starts_at;
$$;

revoke all on function public.due_reminders(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.due_reminders(timestamptz, timestamptz) to service_role;
