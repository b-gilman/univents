import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import EventFeed, { EventFeedSkeleton } from "@/components/EventFeed";
import EventPageShell from "@/components/EventPageShell";
import FilterBar, { CATEGORY_ORDER } from "@/components/FilterBar";
import SearchBox from "@/components/SearchBox";
import { filtersHref, hasFilters, parseFilters } from "@/lib/event-list";
import { campusName, messages } from "@/lib/i18n";
import { getSchool } from "@/lib/schools";
import { getLocale } from "@/lib/server/locale";
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
  const locale = await getLocale();
  const t = messages(locale);
  // Keep the other filters when a new search is typed.
  const keep = Object.fromEntries(
    new URLSearchParams(
      filtersHref({ ...filters, q: undefined }, "").replace(/^\?/, ""),
    ),
  );

  return (
    <EventPageShell school={school} locale={locale}>
      <h1 className="mb-3 text-2xl font-bold">{t.search.title}</h1>
      <SearchBox
        action={basePath}
        placeholder={t.search.placeholder}
        label={t.search.label}
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
              locale={locale}
            />
          </div>
          <Suspense fallback={<EventFeedSkeleton />}>
            <EventFeed school={school} filters={filters} clearHref={basePath} />
          </Suspense>
        </>
      ) : (
        <section className="mt-6">
          <h2 className="mb-3 font-semibold">{t.search.browse}</h2>
          <ul className="grid grid-cols-2 gap-3">
            {CATEGORY_ORDER.map((category) => (
              <li key={category}>
                <Link
                  href={filtersHref({ category }, basePath)}
                  className="flex min-h-16 items-center rounded-2xl bg-card px-4 font-semibold shadow-sm ring-1 ring-black/5 active:bg-neutral-50"
                >
                  {t.categories[category]}
                </Link>
              </li>
            ))}
          </ul>
          <h2 className="mt-6 mb-3 font-semibold">{t.search.quickPicks}</h2>
          <div className="flex flex-wrap gap-2">
            {[
              { label: t.filters.today, f: { when: "today" as const } },
              { label: t.filters.thisWeek, f: { when: "week" as const } },
              { label: t.filters.free, f: { free: true } },
              ...school.campuses.map((c) => ({
                label: campusName(c, locale),
                f: { campus: c },
              })),
            ].map((pick) => (
              <Link
                key={pick.label}
                href={filtersHref(pick.f, basePath)}
                className="flex min-h-10 items-center rounded-full bg-card px-4 text-sm font-semibold ring-1 ring-black/10 active:bg-neutral-100"
              >
                {pick.label}
              </Link>
            ))}
          </div>
          <Link
            href={`/${school.id}/clubs`}
            className="mt-6 flex min-h-14 items-center justify-between rounded-2xl bg-card px-4 font-semibold shadow-sm ring-1 ring-black/5 active:bg-neutral-50"
          >
            <span>
              <span aria-hidden="true">🏛️</span> {t.search.browseClubs}
            </span>
            <span aria-hidden="true" className="text-neutral-400">
              ›
            </span>
          </Link>
        </section>
      )}
    </EventPageShell>
  );
}
