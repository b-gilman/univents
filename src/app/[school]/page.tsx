import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import AccountLink from "@/components/AccountLink";
import EventCard from "@/components/EventCard";
import FilterBar from "@/components/FilterBar";
import ThemeColor from "@/components/ThemeColor";
import {
  applyFilters,
  groupEvents,
  hasFilters,
  parseFilters,
} from "@/lib/event-list";
import { getUpcomingEvents } from "@/lib/events";
import { getRsvpCounts } from "@/lib/rsvps";
import { type School, getSchool, schoolTheme } from "@/lib/schools";
import { SITE } from "@/lib/site";

// A school's home page, e.g. /concordia: its colours, its name, its events.
// Styles are "mobile first": plain classes are for phones, `sm:` for wider.

export async function generateMetadata({
  params,
}: PageProps<"/[school]">): Promise<Metadata> {
  const school = await getSchool((await params).school);
  if (!school) return { title: SITE.name };
  return {
    title: `${school.short_name} events · ${SITE.name}`,
    description: `Club events, talks and parties at ${school.name}.`,
  };
}

export default function SchoolHome(props: PageProps<"/[school]">) {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <SchoolHomeContent {...props} />
    </Suspense>
  );
}

async function SchoolHomeContent({
  params,
  searchParams,
}: PageProps<"/[school]">) {
  const school = await getSchool((await params).school);
  if (!school) notFound();
  const basePath = `/${school.id}`;
  const filters = parseFilters(await searchParams, school.campuses);

  return (
    <div
      style={schoolTheme(school)}
      className="flex min-h-dvh flex-1 flex-col bg-neutral-100 text-neutral-900"
    >
      <ThemeColor color={school.primary_color} />
      <header className="bg-brand px-5 pt-[max(env(safe-area-inset-top),1.5rem)] pb-7 text-white">
        <div className="mx-auto max-w-xl">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
              {SITE.name}
            </p>
            <div className="flex items-center gap-3">
              <Link
                href="/?change=1"
                className="flex min-h-10 items-center text-sm font-medium text-white/80 underline-offset-2 active:underline"
              >
                Change school
              </Link>
              <Suspense
                fallback={
                  <span className="h-10 w-20 rounded-full bg-white/15" />
                }
              >
                <AccountLink returnTo={basePath} />
              </Suspense>
            </div>
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            {school.name}
          </h1>
          <p className="mt-2 text-white/85">{SITE.tagline}</p>
          <Link
            href={`${basePath}/submit`}
            className="mt-4 inline-flex min-h-10 items-center rounded-full bg-white/15 px-4 text-sm font-semibold active:bg-white/25"
          >
            Hosting an event? Submit it →
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-[max(env(safe-area-inset-bottom),2rem)]">
        {/* Filter buttons stay pinned to the top while you scroll. */}
        <div className="sticky top-0 z-10 -mx-4 bg-neutral-100/95 px-4 pt-4 pb-3 backdrop-blur">
          <FilterBar
            filters={filters}
            campuses={school.campuses}
            basePath={basePath}
          />
        </div>

        <h2 className="mt-2 mb-4 text-lg font-semibold">Upcoming events</h2>

        {/* The skeleton shows instantly; the list swaps in when Supabase answers. */}
        <Suspense fallback={<EventListSkeleton />}>
          <EventList school={school} searchParams={searchParams} />
        </Suspense>

        <Link
          href={`${basePath}/submit`}
          className="mt-6 flex flex-col items-center rounded-2xl border-2 border-dashed border-brand/25 p-5 text-center active:bg-white"
        >
          <span className="font-semibold text-brand">Hosting an event?</span>
          <span className="text-sm text-neutral-600">
            Submit it to be listed here →
          </span>
        </Link>
      </main>
    </div>
  );
}

async function EventList({
  school,
  searchParams,
}: {
  school: School;
  searchParams: PageProps<"/[school]">["searchParams"];
}) {
  // Load fresh events on every visit, so new ones show up right away.
  await connection();
  const filters = parseFilters(await searchParams, school.campuses);
  const result = await getUpcomingEvents(school.id);

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
        <Link
          href={`/${school.id}`}
          scroll={false}
          className="font-semibold text-brand underline"
        >
          see all events
        </Link>
        .
      </Notice>
    );
  }

  const going = await getRsvpCounts(groups.map((g) => g.next.id));

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
            <EventCard
              event={group.next}
              repeat={group.repeat}
              going={going.get(group.next.id) ?? 0}
            />
          </li>
        ))}
      </ul>
    </>
  );
}

function Notice({ title, children }: { title: string; children: ReactNode }) {
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

// Shown for a split second while the school's details load.
function HomeSkeleton() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-neutral-100">
      <div className="h-48 animate-pulse bg-neutral-300" />
      <div className="mx-auto w-full max-w-xl px-4 pt-6">
        <EventListSkeleton />
      </div>
    </div>
  );
}
