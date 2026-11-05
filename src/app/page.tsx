import { Suspense } from "react";
import { connection } from "next/server";
import EventCard from "@/components/EventCard";
import { getUpcomingEvents } from "@/lib/events";

// The homepage. Styles are written "mobile first": the plain Tailwind classes
// apply to phones, and prefixed ones like `sm:` only kick in on wider screens.
export default function Home() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-neutral-100 text-neutral-900">
      {/* This header doesn't need the database, so it's sent instantly. */}
      <header className="bg-concordia px-5 pt-[max(env(safe-area-inset-top),2rem)] pb-7 text-white">
        <div className="mx-auto max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
            Concordia University
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Concordia Events
          </h1>
          <p className="mt-2 text-white/85">
            Every club meetup, talk and party on campus — in one place.
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-6 pb-[max(env(safe-area-inset-bottom),2rem)]">
        <h2 className="mb-4 text-lg font-semibold">Upcoming events</h2>

        {/* Suspense shows the skeleton immediately, then swaps in the real
            list as soon as Supabase answers. */}
        <Suspense fallback={<EventListSkeleton />}>
          <EventList />
        </Suspense>
      </main>
    </div>
  );
}

async function EventList() {
  // Tells Next.js to load fresh events on every visit (not once at build
  // time), so new events show up as soon as you add them in Supabase.
  await connection();
  const result = await getUpcomingEvents();

  if (!result.ok) {
    return (
      <Notice
        title="Couldn't load events"
        body="Something went wrong on our end. Please try again in a minute."
      />
    );
  }

  if (result.events.length === 0) {
    return (
      <Notice
        title="No upcoming events yet"
        body="New events are on the way — check back soon!"
      />
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {result.events.map((event) => (
        <li key={event.id}>
          <EventCard event={event} />
        </li>
      ))}
    </ul>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-black/5">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-neutral-600">{body}</p>
    </div>
  );
}

function EventListSkeleton() {
  return (
    <ul className="flex flex-col gap-4" aria-label="Loading events">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="h-40 animate-pulse rounded-2xl bg-white ring-1 ring-black/5"
        />
      ))}
    </ul>
  );
}
