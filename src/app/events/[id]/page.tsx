import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import EventPageShell from "@/components/EventPageShell";
import ShareButton from "@/components/ShareButton";
import { groupKey } from "@/lib/event-list";
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
    <EventPageShell>
      <Suspense fallback={<DetailSkeleton />}>
        <EventDetails params={params} />
      </Suspense>
    </EventPageShell>
  );
}

async function EventDetails({
  params,
}: {
  params: PageProps<"/events/[id]">["params"];
}) {
  await connection(); // always load fresh data
  const { id } = await params;
  const result = await getEventById(id);

  if (!result.ok) {
    return (
      <p className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-black/5">
        Couldn&apos;t load this event. Please try again in a minute.
      </p>
    );
  }
  if (!result.event) notFound();

  const e = result.event;
  const ended = hasEnded(e, new Date());
  const price = formatPrice(e.price_cents);
  const isInstagram = e.info_url?.includes("instagram.com") ?? false;

  // Other upcoming dates of the same event (e.g. weekly meetings).
  const upcoming = await getUpcomingEvents();
  const otherDates = upcoming.ok
    ? upcoming.events.filter(
        (u) => u.id !== e.id && groupKey(u) === groupKey(e),
      )
    : [];

  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      {e.image_url && (
        <Image
          src={e.image_url}
          alt={`Poster for ${e.title}`}
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
            This event has already happened.
          </p>
        )}

        <div>
          <h1 className="text-2xl font-bold leading-tight">{e.title}</h1>
          {e.organization_name && (
            <p className="mt-1 text-neutral-500">by {e.organization_name}</p>
          )}
        </div>

        <dl className="space-y-2 text-neutral-700">
          <div className="flex gap-2">
            <dt className="sr-only">When</dt>
            <span aria-hidden="true">🕒</span>
            <dd>
              <time dateTime={e.starts_at}>
                {formatEventTime(e.starts_at, e.ends_at)}
              </time>
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="sr-only">Where</dt>
            <span aria-hidden="true">📍</span>
            <dd>{formatPlace(e.campus, e.location)}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-2">
          <span
            className={
              price === "Free"
                ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                : "rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-800"
            }
          >
            {price}
          </span>
          <span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold capitalize text-brand">
            {e.category}
          </span>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2">
          {e.signup_url && !ended && (
            <a
              href={e.signup_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 items-center justify-center rounded-xl bg-brand px-4 text-base font-semibold text-white active:opacity-80"
            >
              {price === "Free" ? "Sign up" : "Get tickets"}
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
                  ? "bg-white text-brand ring-1 ring-brand/30"
                  : "bg-brand text-white")
              }
            >
              {isInstagram && <InstagramIcon />}
              {isInstagram ? "View on Instagram" : "View original post"}
            </a>
          )}
          <div className="flex">
            <ShareButton title={e.title} />
          </div>
        </div>

        {e.description && (
          <section>
            <h2 className="mb-1 font-semibold">About</h2>
            <p className="whitespace-pre-line leading-relaxed text-neutral-700">
              {e.description}
            </p>
          </section>
        )}

        {otherDates.length > 0 && (
          <section>
            <h2 className="mb-2 font-semibold">
              {ended ? "Upcoming dates" : "Also on"}
            </h2>
            <ul className="divide-y divide-neutral-100 rounded-xl ring-1 ring-black/5">
              {otherDates.slice(0, 12).map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/events/${d.id}`}
                    className="flex min-h-11 items-center justify-between px-4 py-2 text-sm active:bg-neutral-50"
                  >
                    <time dateTime={d.starts_at}>
                      {formatEventTime(d.starts_at, d.ends_at)}
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
    <div className="animate-pulse overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
      <div className="aspect-[4/5] bg-neutral-200" />
      <div className="space-y-3 p-5">
        <div className="h-7 w-3/4 rounded bg-neutral-200" />
        <div className="h-4 w-1/2 rounded bg-neutral-200" />
        <div className="h-4 w-2/3 rounded bg-neutral-200" />
      </div>
    </div>
  );
}
