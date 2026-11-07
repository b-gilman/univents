import { cache } from "react";
import { logLoadError } from "@/lib/log";
import {
  type Locale,
  campusName,
  dateFormat,
  intlLocale,
  messages,
} from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

// The shape of one row from the `upcoming_events` view in Supabase
// (see supabase/migrations/…_create_events.sql).
export type EventListItem = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  campus: string;
  location: string | null;
  category: string;
  image_url: string | null;
  signup_url: string | null;
  info_url: string | null;
  price_cents: number | null; // null = price not announced yet
  organization_name: string | null;
  organization_id?: string | null; // missing until the clubs update is run
  school_id: string;
};

type Result = { ok: true; events: EventListItem[] } | { ok: false; events: [] };

// Fetches upcoming published events, soonest first.
// Never throws: if Supabase can't be reached we return ok: false so the page
// can show a friendly message instead of crashing.
export async function getUpcomingEvents(schoolId: string): Promise<Result> {
  const { data, error } = await supabase
    .from("upcoming_events")
    .select("*")
    .eq("school_id", schoolId)
    .limit(200);

  if (error) {
    // Shows up in your terminal (locally) or in Vercel → Logs.
    logLoadError("Failed to load events from Supabase:", error.message);
    return { ok: false, events: [] };
  }

  return { ok: true, events: data as EventListItem[] };
}

// All listed events are in Montreal for now, so always show Montreal time, no matter
// where the server (or the visitor's phone) is.
export const TIME_ZONE = "America/Montreal";

const DATE_TIME: Intl.DateTimeFormatOptions = {
  timeZone: TIME_ZONE,
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

// e.g. "Fri, Nov 14, 7:00 – 10:00 p.m." / "ven. 14 nov., 19 h 00 à 22 h 00"
export function formatEventTime(
  startsAt: string,
  endsAt: string | null,
  locale: Locale = "en",
) {
  const f = dateFormat(locale, DATE_TIME);
  const start = new Date(startsAt);
  if (!endsAt) return f.format(start);
  return f.formatRange(start, new Date(endsAt));
}

// The small calendar badge on each card, e.g. { month: "NOV", day: "14" }
export function dateBadge(startsAt: string, locale: Locale = "en") {
  const d = new Date(startsAt);
  return {
    month: dateFormat(locale, { timeZone: TIME_ZONE, month: "short" })
      .format(d)
      .replace(".", "")
      .toUpperCase(),
    day: dateFormat(locale, { timeZone: TIME_ZONE, day: "numeric" }).format(d),
  };
}

// null → "Price TBA", 0 → "Free", 1500 → "$15" (French: "15 $"), 1250 → "$12.50"
export function formatPrice(cents: number | null, locale: Locale = "en") {
  const t = messages(locale).price;
  if (cents === null) return t.tba;
  if (cents === 0) return t.free;
  const dollars = cents / 100;
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: "CAD",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: Number.isInteger(dollars) ? 0 : 2,
  }).format(dollars);
}

export function formatPlace(
  campus: string,
  location: string | null,
  locale: Locale = "en",
) {
  const c = campusName(campus, locale);
  return location ? `${location} · ${c}` : c;
}

// e.g. "Fri, Nov 6" / "ven. 6 nov."
export function formatDay(iso: string, locale: Locale = "en") {
  return dateFormat(locale, {
    timeZone: TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

// -----------------------------------------------------------------------------
// One event, for its own page (/events/<id>)
// -----------------------------------------------------------------------------

export type EventDetail = Omit<EventListItem, "organization_name"> & {
  organization_name: string | null;
  organization_url: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Looks up one published event, including past ones (so a link shared in a
// group chat still works after the event). `cache` makes the page and its
// link preview share a single database request.
export const getEventById = cache(
  async (
    id: string,
  ): Promise<{ ok: true; event: EventDetail | null } | { ok: false }> => {
    if (!UUID.test(id)) return { ok: true, event: null };

    const { data, error } = await supabase
      .from("events")
      .select(
        "id, title, description, starts_at, ends_at, campus, location, category, " +
          "image_url, signup_url, info_url, price_cents, school_id, " +
          "organization:organizations(id, name, website_url)",
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      logLoadError("Failed to load event from Supabase:", error.message);
      return { ok: false };
    }
    if (!data) return { ok: true, event: null };

    const { organization, ...rest } = data as unknown as EventListItem & {
      organization: {
        id: string;
        name: string;
        website_url: string | null;
      } | null;
    };
    return {
      ok: true,
      event: {
        ...rest,
        organization_name: organization?.name ?? null,
        organization_id: organization?.id ?? null,
        organization_url: organization?.website_url ?? null,
      },
    };
  },
);

// An event counts as over once it ends (or 4 hours after it starts, if it has
// no end time); same rule as the homepage list.
export function hasEnded(
  e: { starts_at: string; ends_at: string | null },
  now: Date,
) {
  const end = e.ends_at
    ? Date.parse(e.ends_at)
    : Date.parse(e.starts_at) + 4 * 60 * 60 * 1000;
  return end < now.getTime();
}
