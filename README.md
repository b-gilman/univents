# univents — Concordia Events

A mobile-first events site for Concordia University, built with
[Next.js](https://nextjs.org) (App Router), TypeScript, Tailwind CSS and Supabase.

> Status: placeholder "coming soon" page only.

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
- `src/lib/supabase.ts` — the shared Supabase client
