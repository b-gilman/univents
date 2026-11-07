import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import ClubLogo from "@/components/ClubLogo";
import EventPageShell from "@/components/EventPageShell";
import { getClubs } from "@/lib/clubs";
import { getUpcomingEvents } from "@/lib/events";
import { messages } from "@/lib/i18n";
import { getSchool } from "@/lib/schools";
import { getLocale } from "@/lib/server/locale";
import { SITE } from "@/lib/site";

// All of a school's clubs, A to Z: /concordia/clubs

export const metadata: Metadata = { title: `Clubs · ${SITE.name}` };

export default function ClubsPage(props: PageProps<"/[school]/clubs">) {
  return (
    <Suspense
      fallback={
        <EventPageShell>
          <div className="h-72 animate-pulse rounded-2xl bg-card ring-1 ring-black/5" />
        </EventPageShell>
      }
    >
      <Content {...props} />
    </Suspense>
  );
}

async function Content({ params }: PageProps<"/[school]/clubs">) {
  await connection();
  const school = await getSchool((await params).school);
  if (!school) notFound();
  const [clubs, upcoming, locale] = await Promise.all([
    getClubs(school.id),
    getUpcomingEvents(school.id),
    getLocale(),
  ]);
  const t = messages(locale);

  // How many upcoming events each club has.
  const counts = new Map<string, number>();
  for (const e of upcoming.ok ? upcoming.events : []) {
    if (e.organization_id)
      counts.set(e.organization_id, (counts.get(e.organization_id) ?? 0) + 1);
  }

  return (
    <EventPageShell school={school} locale={locale}>
      <h1 className="text-2xl font-bold">{t.clubs.title(school.short_name)}</h1>
      <p className="mt-1 mb-4 text-neutral-600">{t.clubs.intro}</p>

      {clubs === null ? (
        <p className="rounded-2xl bg-card p-6 text-center shadow-sm ring-1 ring-black/5">
          {t.feed.loadErrorBody}
        </p>
      ) : clubs.length === 0 ? (
        <p className="rounded-2xl bg-card p-6 text-center text-neutral-600 shadow-sm ring-1 ring-black/5">
          {t.clubs.none}
        </p>
      ) : (
        <ul className="divide-y divide-neutral-100 overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-black/5">
          {clubs.map((club) => {
            const n = counts.get(club.id) ?? 0;
            return (
              <li key={club.id}>
                <Link
                  href={`/clubs/${club.id}`}
                  className="flex min-h-16 items-center gap-3 p-3 active:bg-neutral-50"
                >
                  <ClubLogo name={club.name} logoUrl={club.logo_url} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {club.name}
                      {club.verified && (
                        <span
                          className="ml-1 text-brand"
                          title={t.clubs.verified}
                        >
                          ✓
                        </span>
                      )}
                    </span>
                    {n > 0 && (
                      <span className="block text-sm text-neutral-600">
                        {t.clubs.upcoming(n)}
                      </span>
                    )}
                  </span>
                  <span aria-hidden="true" className="text-neutral-400">
                    ›
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </EventPageShell>
  );
}
