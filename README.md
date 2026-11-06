# univents — Concordia Events

A mobile-first events site for Concordia University, built with
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

## Event submissions and admin

- **`/submit`**: public form where clubs send in events (with poster upload).
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
