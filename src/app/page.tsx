import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { connection } from "next/server";
import EventCard from "@/components/EventCard";
import FilterBar from "@/components/FilterBar";
import { getUpcomingEvents } from "@/lib/events";
import {
  applyFilters,
  groupEvents,
  hasFilters,
  parseFilters,
} from "@/lib/event-list";

// The homepage. Styles are written "mobile first": the plain Tailwind classes
// apply to phones, and prefixed ones like `sm:` only kick in on wider screens.
export default function Home({ searchParams }: PageProps<"/">) {
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

      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-[max(env(safe-area-inset-bottom),2rem)]">
        {/* Filter buttons stay pinned to the top while you scroll. */}
        <div className="sticky top-0 z-10 -mx-4 bg-neutral-100/95 px-4 pt-4 pb-3 backdrop-blur">
          {/* The address (?when=…) is only known per visit, so the active
              state streams in; until then the plain buttons are shown. */}
          <Suspense fallback={<FilterBar filters={{}} />}>
            <ActiveFilterBar searchParams={searchParams} />
          </Suspense>
        </div>

        <h2 className="mt-2 mb-4 text-lg font-semibold">Upcoming events</h2>

        {/* Suspense shows the skeleton immediately, then swaps in the real
            list as soon as Supabase answers. */}
        <Suspense fallback={<EventListSkeleton />}>
          <EventList searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}

async function ActiveFilterBar({
  searchParams,
}: {
  searchParams: PageProps<"/">["searchParams"];
}) {
  return <FilterBar filters={parseFilters(await searchParams)} />;
}

async function EventList({
  searchParams,
}: {
  searchParams: PageProps<"/">["searchParams"];
}) {
  // Tells Next.js to load fresh events on every visit (not once at build
  // time), so new events show up as soon as you add them in Supabase.
  await connection();
  const filters = parseFilters(await searchParams);
  const result = await getUpcomingEvents();

  if (!result.ok) {
    return (
      <Notice title="Couldn't load events">
        Something went wrong on our end. Please try again in a minute.
      </Notice>
    );
  }

  if (result.events.length === 0) {
    return (
      <Notice title="No upcoming events yet">
        New events are on the way — check back soon!
      </Notice>
    );
  }

  // Filter individual dates first, then merge repeats into one card each.
  const groups = groupEvents(applyFilters(result.events, filters, new Date()));

  if (groups.length === 0) {
    return (
      <Notice title="Nothing matches these filters">
        Try removing a filter, or{" "}
        <Link href="/" scroll={false} className="font-semibold text-concordia underline">
          see all events
        </Link>
        .
      </Notice>
    );
  }

  return (
    <>
      {hasFilters(filters) && (
        <p className="-mt-2 mb-3 text-sm text-neutral-500">
          {groups.length} {groups.length === 1 ? "event" : "events"}
        </p>
      )}
      <ul className="flex flex-col gap-4">
        {groups.map((group) => (
          <li key={group.key}>
            <EventCard event={group.next} repeat={group.repeat} />
          </li>
        ))}
      </ul>
    </>
  );
}

function Notice({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-black/5">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-neutral-600">{children}</p>
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
