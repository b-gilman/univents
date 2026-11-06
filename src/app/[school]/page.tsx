import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import AccountLink from "@/components/AccountLink";
import BottomNav from "@/components/BottomNav";
import EventFeed, { EventFeedSkeleton } from "@/components/EventFeed";
import FilterBar from "@/components/FilterBar";
import InstallPrompt from "@/components/InstallPrompt";
import SearchBox from "@/components/SearchBox";
import SiteFooter from "@/components/SiteFooter";
import ThemeColor from "@/components/ThemeColor";
import { filtersHref, parseFilters } from "@/lib/event-list";
import { getSchool, schoolTheme } from "@/lib/schools";
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
      <header className="bg-brand px-5 pt-[max(env(safe-area-inset-top),1.5rem)] pb-6 text-white">
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
          <SearchBox
            action={`${basePath}/search`}
            placeholder={`Search ${school.short_name} events`}
            className="mt-4"
          />
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-[calc(env(safe-area-inset-bottom)+6rem)] sm:pb-8">
        {/* Filter buttons stay pinned to the top while you scroll. */}
        <div className="sticky top-0 z-10 -mx-4 bg-neutral-100/95 px-4 pt-3 pb-3 backdrop-blur">
          <FilterBar
            filters={filters}
            campuses={school.campuses}
            basePath={basePath}
          />
        </div>

        <InstallPrompt appName={SITE.name} />

        <Suspense fallback={<EventFeedSkeleton />}>
          <EventFeed
            school={school}
            filters={filters}
            clearHref={filtersHref({}, basePath)}
          />
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
        <SiteFooter />
      </main>
      <BottomNav schoolId={school.id} />
    </div>
  );
}

// Shown for a split second while the school's details load.
function HomeSkeleton() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-neutral-100">
      <div className="h-56 animate-pulse bg-neutral-300" />
      <div className="mx-auto w-full max-w-xl px-4 pt-6">
        <EventFeedSkeleton />
      </div>
    </div>
  );
}
