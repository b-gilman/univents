import Image from "next/image";
import Link from "next/link";
import type { Badge, RepeatInfo } from "@/lib/event-list";
import {
  type EventListItem,
  dateBadge,
  formatDay,
  formatEventTime,
  formatPlace,
  formatPrice,
} from "@/lib/events";
import { type Locale, messages } from "@/lib/i18n";

// `event` is the next (soonest) occurrence. `repeat` is set when the same
// event happens several times (e.g. weekly meetings), shown as one card.
export default function EventCard({
  event,
  repeat = null,
  going = 0,
  badges = [],
  locale = "en",
}: {
  event: EventListItem;
  repeat?: RepeatInfo | null;
  going?: number; // how many people RSVP'd
  badges?: Badge[]; // "Happening now", "Starts in 40 min", "Popular"
  locale?: Locale;
}) {
  const t = messages(locale);
  const badge = dateBadge(event.starts_at, locale);
  const price = formatPrice(event.price_cents, locale);

  return (
    <article className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-black/5">
      {event.image_url && (
        // Shown at its natural shape (square/portrait posters aren't cropped).
        // width/height only reserve space until the real image loads.
        // unoptimized: show the image straight from its link, so posters can
        // be hosted anywhere (this site, Supabase Storage, etc.).
        <Image
          src={event.image_url}
          alt=""
          width={1080}
          height={1080}
          unoptimized
          className="h-auto max-h-[36rem] w-full bg-neutral-200 object-cover"
        />
      )}

      <div className="flex flex-col gap-3 p-4">
        {badges.length > 0 && (
          <div className="-mb-1 flex flex-wrap gap-1.5">
            {badges.map((b) => (
              <span
                key={b.label}
                className={
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold " +
                  (b.tone === "live"
                    ? "bg-emerald-50 text-emerald-700"
                    : b.tone === "soon"
                      ? "bg-amber-50 text-amber-800"
                      : "bg-orange-50 text-orange-700")
                }
              >
                {b.tone === "live" && (
                  <span
                    className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"
                    aria-hidden="true"
                  />
                )}
                {b.label}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-start gap-3">
          <div
            className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-brand py-1.5 text-white"
            aria-hidden="true"
          >
            <span className="text-[11px] font-semibold tracking-wider">
              {badge.month}
            </span>
            <span className="text-xl font-bold leading-none">{badge.day}</span>
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold leading-snug text-neutral-900">
              {event.title}
            </h3>
            {event.organization_name && (
              <p className="truncate text-sm text-neutral-500">
                {t.card.by}{" "}
                {event.organization_id ? (
                  // Tapping the club's name opens the club's page.
                  <Link
                    href={`/clubs/${event.organization_id}`}
                    className="font-medium text-neutral-700 underline decoration-neutral-300 underline-offset-2 active:text-brand"
                  >
                    {event.organization_name}
                  </Link>
                ) : (
                  event.organization_name
                )}
              </p>
            )}
          </div>
        </div>

        <dl className="space-y-1 text-sm text-neutral-700">
          <div className="flex gap-2">
            <dt className="sr-only">{t.card.when}</dt>
            <span aria-hidden="true">🕒</span>
            <dd>
              {repeat ? (
                repeat.schedule
              ) : (
                <time dateTime={event.starts_at}>
                  {formatEventTime(event.starts_at, event.ends_at, locale)}
                </time>
              )}
            </dd>
          </div>
          {repeat && (
            <div className="flex gap-2">
              <dt className="sr-only">{t.card.nextDate}</dt>
              <span aria-hidden="true">🔁</span>
              <dd>
                {t.card.next}{" "}
                <time dateTime={event.starts_at} className="font-medium">
                  {formatDay(event.starts_at, locale)}
                </time>{" "}
                <span className="text-neutral-500">
                  {t.card.until(repeat.until, repeat.count)}
                </span>
              </dd>
            </div>
          )}
          <div className="flex gap-2">
            <dt className="sr-only">{t.card.where}</dt>
            <span aria-hidden="true">📍</span>
            <dd>{formatPlace(event.campus, event.location, locale)}</dd>
          </div>
          {going > 0 && (
            <div className="flex gap-2">
              <dt className="sr-only">{t.card.going}</dt>
              <span aria-hidden="true">👥</span>
              <dd>{t.card.goingCount(going)}</dd>
            </div>
          )}
        </dl>

        {event.description && (
          <p className="line-clamp-3 text-sm leading-relaxed text-neutral-600">
            {event.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={
              event.price_cents === 0
                ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                : "rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-800"
            }
          >
            {price}
          </span>
          <span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold capitalize text-brand">
            {t.categoryNames[event.category] ?? event.category}
          </span>
        </div>

        {event.signup_url && (
          <a
            href={event.signup_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 flex min-h-11 items-center justify-center rounded-xl bg-brand px-4 text-base font-semibold text-white active:opacity-80"
          >
            {event.price_cents === 0 ? t.card.signUp : t.card.tickets}
          </a>
        )}

        {/* Opens this event's own page (full details, Instagram, sharing). */}
        <Link
          href={`/events/${event.id}`}
          className="mt-1 flex min-h-11 items-center justify-center rounded-xl border border-brand/30 px-4 text-base font-semibold text-brand active:bg-brand/5"
        >
          {t.card.moreInfo}
        </Link>
      </div>
    </article>
  );
}
