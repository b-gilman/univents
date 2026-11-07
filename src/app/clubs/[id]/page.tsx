import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import ClubLogo from "@/components/ClubLogo";
import EventCard from "@/components/EventCard";
import EventPageShell from "@/components/EventPageShell";
import FollowPanel from "@/components/FollowPanel";
import { getClub } from "@/lib/clubs";
import { badgesFor, groupEvents } from "@/lib/event-list";
import { getUpcomingEvents } from "@/lib/events";
import { messages } from "@/lib/i18n";
import { getRsvpCounts } from "@/lib/rsvps";
import { getSchool } from "@/lib/schools";
import { getLocale } from "@/lib/server/locale";
import { SITE } from "@/lib/site";

// A club's page: /clubs/<id>. Opened by tapping a club's name anywhere.

export async function generateMetadata({
  params,
}: PageProps<"/clubs/[id]">): Promise<Metadata> {
  const result = await getClub((await params).id);
  if (!result.ok || !result.club) return { title: SITE.name };
  const c = result.club;
  return {
    title: `${c.name} · ${SITE.name}`,
    description: c.description?.slice(0, 200) ?? undefined,
    openGraph: {
      title: c.name,
      siteName: SITE.name,
      images: c.logo_url ? [c.logo_url] : undefined,
    },
  };
}

export default function ClubPage({ params }: PageProps<"/clubs/[id]">) {
  return (
    <Suspense
      fallback={
        <EventPageShell>
          <div className="h-72 animate-pulse rounded-2xl bg-card ring-1 ring-black/5" />
        </EventPageShell>
      }
    >
      <Content params={params} />
    </Suspense>
  );
}

async function Content({
  params,
}: {
  params: PageProps<"/clubs/[id]">["params"];
}) {
  await connection(); // always fresh
  const { id } = await params;
  const [result, locale] = await Promise.all([getClub(id), getLocale()]);
  const t = messages(locale);

  if (!result.ok) {
    return (
      <EventPageShell locale={locale}>
        <p className="rounded-2xl bg-card p-6 text-center shadow-sm ring-1 ring-black/5">
          {t.feed.loadErrorBody}
        </p>
      </EventPageShell>
    );
  }
  if (!result.club) notFound();
  const club = result.club;

  const [school, upcoming] = await Promise.all([
    getSchool(club.school_id),
    getUpcomingEvents(club.school_id),
  ]);
  const events = upcoming.ok
    ? upcoming.events.filter((e) => e.organization_id === club.id)
    : [];
  const groups = groupEvents(events, locale);
  const going = await getRsvpCounts(groups.map((g) => g.next.id));
  const now = new Date();

  return (
    <EventPageShell school={school} locale={locale}>
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center gap-4">
            <ClubLogo name={club.name} logoUrl={club.logo_url} size="lg" />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold leading-tight">{club.name}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-neutral-500">
                {club.verified && (
                  <span className="font-semibold text-brand">
                    ✓ {t.clubs.verified}
                  </span>
                )}
                {school && <span>{school.short_name}</span>}
              </p>
            </div>
          </div>

          {club.description && (
            <p className="whitespace-pre-line leading-relaxed text-neutral-700">
              {club.description}
            </p>
          )}

          {(club.instagram_url || club.website_url) && (
            <div className="flex flex-wrap gap-2">
              {club.instagram_url && (
                <a
                  href={club.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={LINK_BUTTON}
                >
                  <InstagramIcon /> {t.clubs.instagram}
                </a>
              )}
              {club.website_url && (
                <a
                  href={club.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={LINK_BUTTON}
                >
                  <span aria-hidden="true">🌐</span> {t.clubs.website}
                </a>
              )}
            </div>
          )}

          <Suspense
            fallback={
              <div className="h-16 animate-pulse rounded-xl bg-neutral-100" />
            }
          >
            <FollowPanel clubId={club.id} />
          </Suspense>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-neutral-500">
            {t.clubs.upcomingEvents}
          </h2>
          {groups.length === 0 ? (
            <p className="rounded-2xl bg-card p-5 text-center text-sm text-neutral-600 shadow-sm ring-1 ring-black/5">
              {t.clubs.noUpcoming}
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {groups.map((g) => {
                const n = going.get(g.next.id) ?? 0;
                return (
                  <li key={g.key}>
                    <EventCard
                      event={g.next}
                      repeat={g.repeat}
                      going={n}
                      badges={badgesFor(g.next, n, now, locale)}
                      locale={locale}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </EventPageShell>
  );
}

const LINK_BUTTON =
  "flex min-h-11 items-center gap-1.5 rounded-full bg-neutral-100 px-4 text-sm font-semibold text-neutral-800 active:bg-neutral-200";

function InstagramIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
