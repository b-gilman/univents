import Image from "next/image";
import type { RepeatInfo } from "@/lib/event-list";
import {
  type EventListItem,
  dateBadge,
  formatDay,
  formatEventTime,
  formatPlace,
  formatPrice,
} from "@/lib/events";

// `event` is the next (soonest) occurrence. `repeat` is set when the same
// event happens several times (e.g. weekly meetings), shown as one card.
export default function EventCard({
  event,
  repeat = null,
}: {
  event: EventListItem;
  repeat?: RepeatInfo | null;
}) {
  const badge = dateBadge(event.starts_at);
  const price = formatPrice(event.price_cents);

  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
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
        <div className="flex items-start gap-3">
          <div
            className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-concordia py-1.5 text-white"
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
                by {event.organization_name}
              </p>
            )}
          </div>
        </div>

        <dl className="space-y-1 text-sm text-neutral-700">
          <div className="flex gap-2">
            <dt className="sr-only">When</dt>
            <span aria-hidden="true">🕒</span>
            <dd>
              {repeat ? (
                repeat.schedule
              ) : (
                <time dateTime={event.starts_at}>
                  {formatEventTime(event.starts_at, event.ends_at)}
                </time>
              )}
            </dd>
          </div>
          {repeat && (
            <div className="flex gap-2">
              <dt className="sr-only">Next date</dt>
              <span aria-hidden="true">🔁</span>
              <dd>
                Next:{" "}
                <time dateTime={event.starts_at} className="font-medium">
                  {formatDay(event.starts_at)}
                </time>{" "}
                <span className="text-neutral-500">
                  · until {repeat.until} ({repeat.count} dates)
                </span>
              </dd>
            </div>
          )}
          <div className="flex gap-2">
            <dt className="sr-only">Where</dt>
            <span aria-hidden="true">📍</span>
            <dd>{formatPlace(event.campus, event.location)}</dd>
          </div>
        </dl>

        {event.description && (
          <p className="line-clamp-3 text-sm leading-relaxed text-neutral-600">
            {event.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={
              price === "Free"
                ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                : "rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-800"
            }
          >
            {price}
          </span>
          <span className="rounded-full bg-concordia/10 px-2.5 py-1 text-xs font-semibold capitalize text-concordia">
            {event.category}
          </span>
        </div>

        {event.signup_url && (
          <a
            href={event.signup_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 flex min-h-11 items-center justify-center rounded-xl bg-concordia px-4 text-base font-semibold text-white active:opacity-80"
          >
            {price === "Free" ? "Sign up" : "Get tickets"}
          </a>
        )}

        {/* No sign-up link? Point to the original post for details/tickets. */}
        {!event.signup_url && event.info_url && (
          <a
            href={event.info_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 flex min-h-11 items-center justify-center rounded-xl border border-concordia/30 px-4 text-base font-semibold text-concordia active:bg-concordia/5"
          >
            More info
          </a>
        )}
      </div>
    </article>
  );
}
