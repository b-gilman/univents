import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import EventFeed, { EventFeedSkeleton } from "@/components/EventFeed";
import EventPageShell from "@/components/EventPageShell";
import FilterBar, { CATEGORY_LABELS } from "@/components/FilterBar";
import SearchBox from "@/components/SearchBox";
import { filtersHref, hasFilters, parseFilters } from "@/lib/event-list";
import { getSchool } from "@/lib/schools";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: `Search · ${SITE.name}` };

export default function SearchPage(props: PageProps<"/[school]/search">) {
  return (
    <Suspense
      fallback={
        <EventPageShell>
          <EventFeedSkeleton />
        </EventPageShell>
      }
    >
      <Content {...props} />
    </Suspense>
  );
}

async function Content({
  params,
  searchParams,
}: PageProps<"/[school]/search">) {
  const school = await getSchool((await params).school);
  if (!school) notFound();
  const basePath = `/${school.id}/search`;
  const filters = parseFilters(await searchParams, school.campuses);
  // Keep the other filters when a new search is typed.
  const keep = Object.fromEntries(
    new URLSearchParams(
      filtersHref({ ...filters, q: undefined }, "").replace(/^\?/, ""),
    ),
  );

  return (
    <EventPageShell school={school}>
      <h1 className="mb-3 text-2xl font-bold">Search</h1>
      <SearchBox
        action={basePath}
        placeholder="Event, club, place…"
        defaultValue={filters.q ?? ""}
        autoFocus={!hasFilters(filters)}
        hidden={keep}
      />

      {hasFilters(filters) ? (
        <>
          <div className="my-4">
            <FilterBar
              filters={filters}
              campuses={school.campuses}
              basePath={basePath}
            />
          </div>
          <Suspense fallback={<EventFeedSkeleton />}>
            <EventFeed school={school} filters={filters} clearHref={basePath} />
          </Suspense>
        </>
      ) : (
        <section className="mt-6">
          <h2 className="mb-3 font-semibold">Browse by category</h2>
          <ul className="grid grid-cols-2 gap-3">
            {Object.entries(CATEGORY_LABELS).map(([category, label]) => (
              <li key={category}>
                <Link
                  href={filtersHref(
                    { category: category as keyof typeof CATEGORY_LABELS },
                    basePath,
                  )}
                  className="flex min-h-16 items-center rounded-2xl bg-white px-4 font-semibold shadow-sm ring-1 ring-black/5 active:bg-neutral-50"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <h2 className="mt-6 mb-3 font-semibold">Quick picks</h2>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Today", f: { when: "today" as const } },
              { label: "This week", f: { when: "week" as const } },
              { label: "Free", f: { free: true } },
              ...school.campuses.map((c) => ({ label: c, f: { campus: c } })),
            ].map((pick) => (
              <Link
                key={pick.label}
                href={filtersHref(pick.f, basePath)}
                className="flex min-h-10 items-center rounded-full bg-white px-4 text-sm font-semibold ring-1 ring-black/10 active:bg-neutral-100"
              >
                {pick.label}
              </Link>
            ))}
          </div>
        </section>
      )}
    </EventPageShell>
  );
}
