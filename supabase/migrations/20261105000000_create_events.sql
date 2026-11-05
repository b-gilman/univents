-- =============================================================================
-- Concordia Events: organizations + events
--
-- HOW TO RUN: Supabase dashboard → SQL Editor → New query → paste this whole
-- file → Run. Run it once only.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Organizations (clubs, associations, departments…)
-- -----------------------------------------------------------------------------
create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  -- Later, only verified organizations will be allowed to post events.
  verified    boolean not null default false,
  website_url text,
  created_at  timestamptz not null default now()
);


-- -----------------------------------------------------------------------------
-- 2. Events
-- -----------------------------------------------------------------------------
create table public.events (
  id              uuid primary key default gen_random_uuid(),
  title           text not null check (char_length(title) between 1 and 120),
  description     text,

  -- Times are stored with a time zone. When typing one in, add the zone,
  -- e.g. '2026-11-14 21:00 America/Montreal'.
  starts_at       timestamptz not null,
  ends_at         timestamptz,

  campus          text not null default 'SGW'
                  check (campus in ('SGW', 'Loyola', 'Off-campus', 'Online')),
  location        text,           -- building / room, e.g. 'Hall H-110'

  organization_id uuid references public.organizations (id) on delete set null,

  category        text not null default 'social'
                  check (category in ('party', 'academic', 'sports', 'arts',
                                      'career', 'cultural', 'social', 'other')),

  image_url       text,           -- link to the poster / photo
  signup_url      text,           -- link to sign up or buy tickets

  -- Price in cents (CAD) to avoid rounding problems. 0 = free; 1500 = $15.00
  price_cents     integer not null default 0 check (price_cents >= 0),

  -- 'draft' events are hidden from the website until you publish them.
  status          text not null default 'published'
                  check (status in ('draft', 'published')),

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint ends_after_start check (ends_at is null or ends_at >= starts_at)
);

-- Makes "upcoming events, soonest first" fast.
create index events_starts_at_idx on public.events (starts_at);
create index events_organization_id_idx on public.events (organization_id);

-- Keep updated_at current automatically whenever an event is edited.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 3. Security (Row Level Security)
--
-- With RLS on, the website (which uses the public "publishable"/anon key) can
-- only do what a policy allows. We allow READING only. Nobody can add, edit or
-- delete through the website yet; you do that from the Supabase dashboard,
-- which has admin rights. Organizer accounts will get their own policies later.
-- -----------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.events        enable row level security;

create policy "Anyone can view organizations"
  on public.organizations for select
  to anon, authenticated
  using (true);

create policy "Anyone can view published events"
  on public.events for select
  to anon, authenticated
  using (status = 'published');


-- -----------------------------------------------------------------------------
-- 4. A ready-made list of upcoming events for the homepage
--
-- security_invoker = true makes this view respect the RLS rules above
-- (so draft events stay hidden).
-- -----------------------------------------------------------------------------
create view public.upcoming_events
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
  o.name as organization_name
from public.events e
left join public.organizations o on o.id = e.organization_id
-- Keep an event listed until it has finished (or 4 hours after it started,
-- if it has no end time).
where coalesce(e.ends_at, e.starts_at + interval '4 hours') >= now()
order by e.starts_at;


-- -----------------------------------------------------------------------------
-- 5. Storage bucket for event posters/photos
--
-- Upload images in the dashboard: Storage → event-images → Upload. Then click
-- the file → "Get URL" and paste that link into the event's image_url.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do nothing;
