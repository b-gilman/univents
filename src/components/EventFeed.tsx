import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";
import EventCard from "@/components/EventCard";
import {
  type Filters,
  applyFilters,
  badgesFor,
  groupEvents,
  hasFilters,
  sectionsByDay,
} from "@/lib/event-list";
import { getUpcomingEvents } from "@/lib/events";
import { getRsvpCounts } from "@/lib/rsvps";
import { getLocale } from "@/lib/server/locale";
import { messages } from "@/lib/i18n";
import type { School } from "@/lib/schools";

// The list of event cards, grouped under day headings ("Today", "Tomorrow"…).
// Used by a school's homepage and its search page.
export default async function EventFeed({
  school,
  filters,
  clearHref,
}: {
  school: School;
  filters: Filters;
  clearHref: string; // where "see all events" goes when nothing matches
}) {
  // Load fresh events on every visit, so new ones show up right away.
  await connection();
  const [result, locale] = await Promise.all([
    getUpcomingEvents(school.id),
    getLocale(),
  ]);
  const t = messages(locale).feed;

  if (!result.ok) {
    return <Notice title={t.loadErrorTitle}>{t.loadErrorBody}</Notice>;
  }
  if (result.events.length === 0) {
    return <Notice title={t.noneTitle}>{t.noneBody}</Notice>;
  }

  const now = new Date();
  // Filter individual dates first, then merge repeats into one card each.
  const groups = groupEvents(applyFilters(result.events, filters, now), locale);

  if (groups.length === 0) {
    return (
      <Notice title={filters.q ? t.noMatchSearch(filters.q) : t.noMatch}>
        {t.tryAnother}{" "}
        <Link
          href={clearHref}
          scroll={false}
          className="font-semibold text-brand underline"
        >
          {t.seeAll}
        </Link>
        .
      </Notice>
    );
  }

  const going = await getRsvpCounts(groups.map((g) => g.next.id));
  const sections = sectionsByDay(groups, now, locale);

  return (
    <>
      {hasFilters(filters) && (
        <p className="-mt-2 mb-3 text-sm text-neutral-500">
          {t.count(groups.length)}
        </p>
      )}
      <div className="flex flex-col gap-6">
        {sections.map((section) => (
          <section key={section.label} aria-label={section.label}>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-neutral-500">
              {section.live && (
                <span
                  className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"
                  aria-hidden="true"
                />
              )}
              {section.label}
            </h3>
            <ul className="flex flex-col gap-4">
              {section.groups.map((group) => {
                const n = going.get(group.next.id) ?? 0;
                return (
                  <li key={group.key}>
                    <EventCard
                      event={group.next}
                      repeat={group.repeat}
                      going={n}
                      badges={badgesFor(group.next, n, now, locale)}
                      locale={locale}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-card p-6 text-center shadow-sm ring-1 ring-black/5">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-neutral-600">{children}</p>
    </div>
  );
}

export function EventFeedSkeleton() {
  return (
    <ul className="flex flex-col gap-4" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="h-40 animate-pulse rounded-2xl bg-card ring-1 ring-black/5"
        />
      ))}
    </ul>
  );
}
