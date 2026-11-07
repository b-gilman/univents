import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import EventPageShell from "@/components/EventPageShell";
import RsvpPanel from "@/components/RsvpPanel";
import ShareButton from "@/components/ShareButton";
import ViewPing from "@/components/ViewPing";
import { groupKey } from "@/lib/event-list";
import { type Locale, messages } from "@/lib/i18n";
import { getSchool } from "@/lib/schools";
import { getLocale } from "@/lib/server/locale";
import { SITE } from "@/lib/site";
import {
  formatEventTime,
  formatPlace,
  formatPrice,
  getEventById,
  getUpcomingEvents,
  hasEnded,
} from "@/lib/events";

// One event's own page: /events/<id>. Opened from the "More info" button.

// The title, description and poster that show up when the link is pasted
// into iMessage, WhatsApp, Instagram DMs, etc.
export async function generateMetadata({
  params,
}: PageProps<"/events/[id]">): Promise<Metadata> {
  const { id } = await params;
  const result = await getEventById(id);
  if (!result.ok || !result.event) return { title: "Event not found" };

  const e = result.event;
  const when = formatEventTime(e.starts_at, e.ends_at);
  const description = `${when} · ${formatPlace(e.campus, e.location)}`;
  return {
    title: `${e.title} · ${SITE.name}`,
    description,
    openGraph: {
      title: e.title,
      description,
      siteName: SITE.name,
      images: e.image_url ? [e.image_url] : undefined,
    },
  };
}

export default function EventPage({ params }: PageProps<"/events/[id]">) {
  return (
    <Suspense
      fallback={
        <EventPageShell>
          <DetailSkeleton />
        </EventPageShell>
      }
    >
      <EventDetails params={params} />
    </Suspense>
  );
}

async function EventDetails({
  params,
}: {
  params: PageProps<"/events/[id]">["params"];
}) {
  await connection(); // always load fresh data
  const { id } = await params;
  const [result, locale] = await Promise.all([getEventById(id), getLocale()]);
  const t = messages(locale);

  if (!result.ok) {
    return (
      <EventPageShell locale={locale}>
        <p className="rounded-2xl bg-card p-6 text-center shadow-sm ring-1 ring-black/5">
          {t.event.loadError}
        </p>
      </EventPageShell>
    );
  }
  if (!result.event) notFound();

  const e = result.event;
  const ended = hasEnded(e, new Date());
  const price = formatPrice(e.price_cents, locale);
  const isInstagram = e.info_url?.includes("instagram.com") ?? false;
  const place = formatPlace(e.campus, e.location); // for calendars: English

  // Other upcoming dates of the same event (e.g. weekly meetings).
  const school = await getSchool(e.school_id);
  const upcoming = await getUpcomingEvents(e.school_id);
  const otherDates = upcoming.ok
    ? upcoming.events.filter(
        (u) => u.id !== e.id && groupKey(u) === groupKey(e),
      )
    : [];

  // Directions open Google Maps (or Apple Maps on iPhone via the web link).
  // Online events have no place to go to. Off-campus addresses are searched
  // as written; campus rooms get the campus and school added.
  const offCampus = e.campus === "Off-campus";
  const mapsHref =
    e.campus === "Online" || (offCampus && !e.location)
      ? null
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          (offCampus ? [e.location] : [e.location, e.campus, school?.name])
            .filter(Boolean)
            .join(", "),
        )}`;

  return (
    <EventPageShell school={school} locale={locale}>
      <ViewPing eventId={e.id} />
      <article className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-black/5">
        {e.image_url && (
          <Image
            src={e.image_url}
            alt={t.event.posterFor(e.title)}
            width={1080}
            height={1080}
            unoptimized
            priority
            className="h-auto w-full bg-neutral-200"
          />
        )}

        <div className="flex flex-col gap-4 p-5">
          {ended && (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              {t.event.ended}
            </p>
          )}

          <div>
            <h1 className="text-2xl font-bold leading-tight">{e.title}</h1>
            {e.organization_name && (
              <p className="mt-1 text-neutral-500">
                {t.card.by}{" "}
                {e.organization_id ? (
                  <Link
                    href={`/clubs/${e.organization_id}`}
                    className="font-medium text-neutral-700 underline decoration-neutral-300 underline-offset-2 active:text-brand"
                  >
                    {e.organization_name}
                  </Link>
                ) : (
                  e.organization_name
                )}
              </p>
            )}
          </div>

          <dl className="space-y-2 text-neutral-700">
            <div className="flex gap-2">
              <dt className="sr-only">{t.card.when}</dt>
              <span aria-hidden="true">🕒</span>
              <dd>
                <time dateTime={e.starts_at}>
                  {formatEventTime(e.starts_at, e.ends_at, locale)}
                </time>
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="sr-only">{t.card.where}</dt>
              <span aria-hidden="true">📍</span>
              <dd>{formatPlace(e.campus, e.location, locale)}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2">
            <span
              className={
                e.price_cents === 0
                  ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                  : "rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-800"
              }
            >
              {price}
            </span>
            <span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold capitalize text-brand">
              {t.categoryNames[e.category] ?? e.category}
            </span>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-2">
            <Suspense
              fallback={
                <div className="h-16 animate-pulse rounded-xl bg-neutral-100" />
              }
            >
              <RsvpPanel eventId={e.id} ended={ended} />
            </Suspense>
            {e.signup_url && !ended && (
              <a
                href={e.signup_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-12 items-center justify-center rounded-xl bg-brand px-4 text-base font-semibold text-white active:opacity-80"
              >
                {e.price_cents === 0 ? t.card.signUp : t.card.tickets}
              </a>
            )}
            {e.info_url && (
              <a
                href={e.info_url}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  "flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold active:opacity-80 " +
                  (e.signup_url && !ended
                    ? "bg-card text-brand ring-1 ring-brand/30"
                    : "bg-brand text-white")
                }
              >
                {isInstagram && <InstagramIcon />}
                {isInstagram ? t.event.viewInstagram : t.event.viewOriginal}
              </a>
            )}
            <div className="flex">
              <ShareButton title={e.title} locale={locale} />
            </div>
            <div className="flex flex-wrap items-start justify-center gap-2">
              {mapsHref && (
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={SMALL_BUTTON}
                >
                  <span aria-hidden="true">🧭</span> {t.event.directions}
                </a>
              )}
              {!ended && (
                <AddToCalendar
                  icsHref={`/events/${e.id}/calendar`}
                  googleHref={googleCalendarUrl(e, place)}
                  locale={locale}
                />
              )}
            </div>
          </div>

          {e.description && (
            <section>
              <h2 className="mb-1 font-semibold">{t.event.about}</h2>
              <p className="whitespace-pre-line leading-relaxed text-neutral-700">
                {e.description}
              </p>
            </section>
          )}

          {otherDates.length > 0 && (
            <section>
              <h2 className="mb-2 font-semibold">
                {ended ? t.event.upcomingDates : t.event.alsoOn}
              </h2>
              <ul className="divide-y divide-neutral-100 rounded-xl ring-1 ring-black/5">
                {otherDates.slice(0, 12).map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/events/${d.id}`}
                      className="flex min-h-11 items-center justify-between px-4 py-2 text-sm active:bg-neutral-50"
                    >
                      <time dateTime={d.starts_at}>
                        {formatEventTime(d.starts_at, d.ends_at, locale)}
                      </time>
                      <span aria-hidden="true" className="text-neutral-400">
                        ›
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </article>
    </EventPageShell>
  );
}

const SMALL_BUTTON =
  "flex min-h-11 items-center gap-1.5 rounded-full bg-neutral-100 px-4 text-sm font-semibold text-neutral-800 active:bg-neutral-200";

// Google Calendar's "new event" page, pre-filled. Times are in UTC.
function googleCalendarUrl(
  e: {
    title: string;
    starts_at: string;
    ends_at: string | null;
    description: string | null;
  },
  place: string,
) {
  const utc = (iso: string) =>
    new Date(iso)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const end =
    e.ends_at ?? new Date(Date.parse(e.starts_at) + 2 * 3600e3).toISOString();
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${utc(e.starts_at)}/${utc(end)}`,
    details: e.description ?? "",
    location: place,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

// "Add to calendar" button that opens a small menu. <details> works without
// any JavaScript: tapping the summary shows or hides the choices.
function AddToCalendar({
  icsHref,
  googleHref,
  locale,
}: {
  icsHref: string;
  googleHref: string;
  locale: Locale;
}) {
  const t = messages(locale).event;
  const item =
    "flex min-h-11 items-center px-4 text-sm font-medium active:bg-neutral-50";
  return (
    <details className="group relative">
      <summary
        className={
          SMALL_BUTTON +
          " cursor-pointer list-none [&::-webkit-details-marker]:hidden"
        }
      >
        <span aria-hidden="true">📅</span> {t.addToCalendar}
      </summary>
      <div className="mt-2 w-56 overflow-hidden rounded-xl bg-card py-1 shadow-lg ring-1 ring-black/10">
        <a href={icsHref} className={item}>
          Apple Calendar
        </a>
        <a
          href={googleHref}
          target="_blank"
          rel="noopener noreferrer"
          className={item}
        >
          Google Calendar
        </a>
        <a href={icsHref} className={item}>
          {t.outlookOther}
        </a>
      </div>
    </details>
  );
}

// Simple camera glyph used on the "View on Instagram" button.
function InstagramIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
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

function DetailSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl bg-card ring-1 ring-black/5">
      <div className="aspect-[4/5] bg-neutral-200" />
      <div className="space-y-3 p-5">
        <div className="h-7 w-3/4 rounded bg-neutral-200" />
        <div className="h-4 w-1/2 rounded bg-neutral-200" />
        <div className="h-4 w-2/3 rounded bg-neutral-200" />
      </div>
    </div>
  );
}
