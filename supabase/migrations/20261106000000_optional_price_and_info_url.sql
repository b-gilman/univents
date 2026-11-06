-- =============================================================================
-- Update 2: price can be unknown + a "More info" link per event
--
-- HOW TO RUN: Supabase → SQL Editor → New query → paste → Run. Run it once,
-- AFTER 20261105000000_create_events.sql.
-- =============================================================================

-- price_cents: 0 = free, a number = price, NULL = not announced yet
-- (the website shows "Price TBA").
alter table public.events alter column price_cents drop not null;

-- Link to the original post / page with details (e.g. the Instagram post).
-- The website shows it as a "More info" button when there's no sign-up link.
alter table public.events add column if not exists info_url text;

-- Re-create the homepage view with the new column (added at the end).
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
  e.info_url
from public.events e
left join public.organizations o on o.id = e.organization_id
where coalesce(e.ends_at, e.starts_at + interval '4 hours') >= now()
order by e.starts_at;

grant select on public.upcoming_events to anon, authenticated;
