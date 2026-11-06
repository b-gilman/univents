import { supabase } from "@/lib/supabase";

// The shape of one row from the `upcoming_events` view in Supabase
// (see supabase/migrations/…_create_events.sql).
export type EventListItem = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  campus: "SGW" | "Loyola" | "Off-campus" | "Online";
  location: string | null;
  category: string;
  image_url: string | null;
  signup_url: string | null;
  info_url: string | null;
  price_cents: number | null; // null = price not announced yet
  organization_name: string | null;
};

type Result =
  | { ok: true; events: EventListItem[] }
  | { ok: false; events: [] };

// Fetches upcoming published events, soonest first.
// Never throws: if Supabase can't be reached we return ok: false so the page
// can show a friendly message instead of crashing.
export async function getUpcomingEvents(): Promise<Result> {
  const { data, error } = await supabase
    .from("upcoming_events")
    .select("*")
    .limit(100);

  if (error) {
    // Shows up in your terminal (locally) or in Vercel → Logs.
    console.error("Failed to load events from Supabase:", error.message);
    return { ok: false, events: [] };
  }

  return { ok: true, events: data as EventListItem[] };
}

// Concordia is in Montreal, so always show times in Montreal time, no matter
// where the server (or the visitor's phone) is.
export const TIME_ZONE = "America/Montreal";

const dateTime = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const monthShort = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  month: "short",
});

const dayOfMonth = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  day: "numeric",
});

// e.g. "Fri, Nov 14, 7:00 – 10:00 p.m."
export function formatEventTime(startsAt: string, endsAt: string | null) {
  const start = new Date(startsAt);
  if (!endsAt) return dateTime.format(start);
  return dateTime.formatRange(start, new Date(endsAt));
}

// The small calendar badge on each card, e.g. { month: "NOV", day: "14" }
export function dateBadge(startsAt: string) {
  const d = new Date(startsAt);
  return {
    month: monthShort.format(d).replace(".", "").toUpperCase(),
    day: dayOfMonth.format(d),
  };
}

// null → "Price TBA", 0 → "Free", 1500 → "$15", 1250 → "$12.50"
export function formatPrice(cents: number | null) {
  if (cents === null) return "Price TBA";
  if (cents === 0) return "Free";
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export function formatPlace(campus: string, location: string | null) {
  return location ? `${location} · ${campus}` : campus;
}

const dayOnly = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  weekday: "short",
  month: "short",
  day: "numeric",
});

// e.g. "Fri, Nov 6"
export function formatDay(iso: string) {
  return dayOnly.format(new Date(iso));
}
