# Kuku

A mobile-first site for student club events, built with
[Next.js](https://nextjs.org) (App Router), TypeScript, Tailwind CSS and Supabase.

> Status: homepage lists upcoming events from Supabase. Events are added by
> the admin in the Supabase dashboard (no accounts yet).

## Run it locally

1. Install [Node.js](https://nodejs.org) 20.9 or newer.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create your env file and fill in your Supabase project values
   (Supabase dashboard → Project Settings → API):
   ```bash
   cp .env.example .env.local
   ```
4. Start the dev server and open http://localhost:3000:
   ```bash
   npm run dev
   ```

## Database (Supabase)

One-time setup: in the Supabase dashboard open **SQL Editor → New query**,
paste each file in `supabase/migrations/` (oldest first, each only once) and
click **Run**. This creates the `organizations` and `events` tables, the
`upcoming_events` view used by the homepage, read-only security rules, and an
`event-images` storage bucket.

To add an event, copy `supabase/add-event-template.sql` into the SQL Editor,
edit the values and run it, or add a row in **Table Editor → events**.
Posters go in **Storage → event-images**; paste the file's public URL into
`image_url`.

Batches of real club events live in `supabase/events/` (one SQL file per
batch, safe to run twice). Their posters are in `public/events/` and are
referenced as `/events/<file>.webp`.

## Schools

Kuku supports several schools. Each row in the `schools` table (Supabase)
has a name, a colour and campuses; its pages live at `/<school-id>` (e.g.
`/concordia`) in that colour. Visitors pick a school on `/` (remembered in a
cookie for a year; "Change school" switches it). To add a school, run the
`insert into public.schools …` example at the end of
`supabase/migrations/20261108000000_schools.sql`.

## Finding events

- **Bottom bar (phones):** Events · Search · Post · My events. It's hidden on bigger screens.
- **Search** (`/<school>/search?q=…`): matches the title, description, club and place, and ignores accents and capitals ("soiree" finds "Soirée").
- **Filters:** Today, This week, Free, campus, and a row of categories. Each filter is a link, so filtered pages can be shared.
- **Day headings:** "Happening now", "Today", "Tomorrow", then the date. Cards get badges: *Happening now*, *Starts in 2 h*, and *🔥 Popular* once 5+ people are going.
- **Event page:** "Add to calendar" (Apple/Outlook download a `.ics` file from `/events/<id>/calendar`; Google opens a pre-filled event), "Directions" (Google Maps; hidden for online events), and decorative circles next to the "going" count. The circles never show names or initials.

## Clubs and following

Needs `supabase/migrations/20261113000000_clubs_and_follows.sql` (run once).

- **Club pages** (`/clubs/<id>`): logo, description, Instagram, website, verified tick, and the club's upcoming events. Tap a club's name on any event card or event page to open it. Each school has a club list at `/<school>/clubs` (linked from Search).
- **Editing a club page:** organisers use **Club page → Edit** on their dashboard; the admin uses **Club page** under each club on the Clubs tab. Logos are JPG/PNG/WebP under 2 MB, stored in `event-images/clubs/`.
- **Following:** logged-in students tap **Follow** on a club page. *My events* then shows "Coming up from your clubs" and the clubs they follow. Only a follower **count** is public; nobody (not even the club) sees who follows.
- **Emails:** the daily email (`/api/cron/reminders`) now also lists events that clubs you follow published since the last email, including events the admin approves later. Each event is announced once. The *Reminder emails* switch on *My events* turns both off.

## French / English

- A **FR / EN** button sits in the school page's header, and **Français / English** in every page's footer. The choice is saved in the `lang` cookie for a year. Before anyone chooses, the phone's language decides.
- All student pages are translated: event list, search, event and club pages, My events, log in and sign up, and error messages. Dates, times and prices follow Quebec French style ("sam. 7 nov., 18 h 40", "5 $").
- Event titles and descriptions stay as the clubs wrote them. Search understands category names in both languages ("carrière").
- **Still English only:** the submit form, organiser dashboard, admin, privacy policy and emails.
- Every piece of text is in `src/lib/i18n.ts`, in English and French side by side. TypeScript flags any French text that's missing.

## Dark mode

The site follows the phone's light/dark setting automatically. Instead of a dark version of every element, `src/app/globals.css` swaps the colours themselves when the phone is in dark mode: the greys flip, cards (`bg-card`) turn charcoal, and the green/amber/red labels become dark tints. School colours stay, with brand-coloured text lightened so it's readable. Use `bg-card` (not `bg-white`) for boxes, and `bg-ink` for dark buttons with white text.

## Student accounts and RSVPs

Students sign up at `/signup` (full name, email, password, school) and log in
at `/login`; this uses Supabase Auth. On an event page they tap **I'm going**;
everyone sees the count, only the student sees their own RSVPs (`/account`,
"My events"). Profiles and RSVPs are protected by row-level security; see
`supabase/migrations/20261109000000_accounts_and_rsvps.sql` (it also has a
query for the admin to list who is going to an event). `src/proxy.ts` renews
logins before they expire.

Email (via Resend on `kukucanada.dev`): forgot password (`/forgot-password`),
email confirmation, and daily reminders for tomorrow's RSVP'd events
(`/api/cron/reminders`, scheduled in `vercel.json`, needs `RESEND_API_KEY`,
`EMAIL_FROM`, `CRON_SECRET`). Supabase sends auth emails through Resend SMTP
using the templates in `supabase/email-templates/`. Students can turn
reminders off on "My events".

## Organiser accounts

Club organisers are normal student accounts linked to a club. The admin adds
them on `/admin/organisers` (by the email they signed up with) and can mark a
club **verified**. Organisers use `/organize`: post events (verified clubs go
live instantly, others go to the admin review queue), edit/delete their club's
events, and see the names of students who RSVP'd (never emails). Enforced by
row-level security; see `supabase/migrations/20261111000000_organisers.sql`.

## Event submissions and admin

- **`/<school>/submit`**: public form where clubs send in events (with poster upload).
  Submissions are saved as `pending` and are hidden from the site.
- **`/admin`**: password-protected page to Approve / Edit / Reject them.
  Approving publishes the event (and creates the club in `organizations` if
  it's new).

Needs two server-only environment variables (in `.env.local` and on Vercel,
**without** the `NEXT_PUBLIC_` prefix):

- `SUPABASE_SECRET_KEY`: Supabase → Project Settings → API Keys → Secret key
- `ADMIN_PASSWORD`: the admin login password (12+ characters)

Contact emails live in the private `submissions` table, which the public key
can't read.

## Admin tabs

`/admin` has three tabs: **Review** (pending submissions; expired ones can be
cleared), **Live events** (edit, hide/show or delete any published event,
upcoming or past) and **Clubs** (organisers and verification).

## Installable app and privacy

- `src/app/manifest.ts` + icons in `src/app/` and `public/icons/` make the
  site installable ("Add to Home Screen"); school pages show a dismissible
  install tip (`src/components/InstallPrompt.tsx`).
- `/privacy` explains what's collected and who sees it. Set
  `privacyEmail` in `src/lib/site.ts` to an address you check.

## Useful commands

| Command         | What it does                            |
| --------------- | --------------------------------------- |
| `npm run dev`   | Start the dev server with live reload   |
| `npm run lint`  | Check the code for common mistakes      |
| `npm run build` | Build an optimized production version   |
| `npm start`     | Serve the production build              |

## Project layout

- `src/app/page.tsx` — the homepage
- `src/app/layout.tsx` — shared wrapper for every page (title, theme colour)
- `src/app/globals.css` — global styles and the `concordia` colour
- `src/components/EventCard.tsx` — one event card
- `src/lib/events.ts` — loads events and formats dates/prices
- `src/lib/supabase.ts` — the shared Supabase client (public, read-only)
- `src/lib/server/` — server-only code: full-access client, admin login, submission checks
- `src/app/submit/` — the submit form · `src/app/admin/` — the admin pages
- `supabase/` — database setup SQL and the add-an-event template
