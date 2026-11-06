import { type EventListItem, TIME_ZONE } from "@/lib/events";

// =============================================================================
// Filters (Today / This week / Free / SGW / Loyola)
//
// Filters live in the page address, e.g. /?when=week&free=1&campus=SGW, so a
// filtered view can be shared or bookmarked.
// =============================================================================

export type Filters = {
  when?: "today" | "week";
  free?: boolean;
  campus?: "SGW" | "Loyola";
};

type SearchParams = Record<string, string | string[] | undefined>;

// Read filters from the address, ignoring anything unexpected.
export function parseFilters(params: SearchParams): Filters {
  const one = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const when = one("when");
  const campus = one("campus");
  return {
    when: when === "today" || when === "week" ? when : undefined,
    free: one("free") === "1" || undefined,
    campus: campus === "SGW" || campus === "Loyola" ? campus : undefined,
  };
}

export function hasFilters(f: Filters) {
  return Boolean(f.when || f.free || f.campus);
}

// Build the address for a set of filters, e.g. "/?when=today&free=1".
export function filtersHref(f: Filters) {
  const params = new URLSearchParams();
  if (f.when) params.set("when", f.when);
  if (f.free) params.set("free", "1");
  if (f.campus) params.set("campus", f.campus);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export function applyFilters(
  events: EventListItem[],
  f: Filters,
  now: Date,
): EventListItem[] {
  // Events in the list haven't finished yet, so "today" just means
  // "starts before midnight tonight (Montreal time)".
  const cutoff =
    f.when === "today"
      ? nextMidnightInMontreal(now)
      : f.when === "week"
        ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        : null;

  return events.filter((e) => {
    if (cutoff && new Date(e.starts_at) >= cutoff) return false;
    if (f.free && e.price_cents !== 0) return false;
    if (f.campus && e.campus !== f.campus) return false;
    return true;
  });
}

// The exact moment of the next midnight in Montreal (handles daylight saving).
function nextMidnightInMontreal(now: Date): Date {
  const [y, m, d] = ymdFormat.format(now).split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d + 1); // midnight UTC, tomorrow
  const offset = wallClockMs(guess) - guess; // Montreal minus UTC, e.g. -5h
  return new Date(guess - offset);
}

const ymdFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const partsFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hourCycle: "h23",
});

// What a Montreal wall clock shows at a given instant, as if it were UTC.
function wallClockMs(ms: number) {
  const p = Object.fromEntries(
    partsFormat.formatToParts(ms).map((x) => [x.type, Number(x.value)]),
  );
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

// =============================================================================
// Grouping repeating events
//
// Events with the same title, club and place (e.g. 9 chess meetings) are shown
// as ONE card: "Every Tue & Fri, 5:00–8:00 p.m. · Next: Fri, Nov 6".
// =============================================================================

export type RepeatInfo = {
  schedule: string; // "Every Tue & Fri, 5:00–8:00 p.m."
  until: string; //    "Dec 4"
  count: number; //    9
};

export type EventGroup = {
  key: string;
  next: EventListItem; // the soonest occurrence (shown on the card)
  repeat: RepeatInfo | null; // null = one-off event
};

export function groupEvents(events: EventListItem[]): EventGroup[] {
  // Events arrive sorted by start time, so each group's first item is the
  // next occurrence, and groups end up ordered by their next date.
  const groups = new Map<string, EventListItem[]>();
  for (const e of events) {
    const key = [e.title, e.organization_name, e.campus, e.location].join("|");
    const list = groups.get(key);
    if (list) list.push(e);
    else groups.set(key, [e]);
  }

  return [...groups].map(([key, list]) => ({
    key,
    next: list[0],
    repeat: list.length > 1 ? describeRepeat(list) : null,
  }));
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const weekdayFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  weekday: "short",
});
const clockFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});
const timeRangeFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});
const monthDayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  month: "short",
  day: "numeric",
});

function describeRepeat(list: EventListItem[]): RepeatInfo {
  const starts = list.map((e) => new Date(e.starts_at));

  // Which weekdays it happens on, in calendar order: "Tue & Fri"
  const days = [...new Set(starts.map((d) => weekdayFormat.format(d)))].sort(
    (a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b),
  );
  const dayText =
    days.length === 1
      ? days[0]
      : `${days.slice(0, -1).join(", ")} & ${days[days.length - 1]}`;

  // At most a week between sessions → "Every …"
  const weekly = starts.every(
    (d, i) => i === 0 || d.getTime() - starts[i - 1].getTime() <= 7.1 * 864e5,
  );

  // Same start time and length every time → add "5:00–8:00 p.m."
  const first = list[0];
  const length = (e: EventListItem) =>
    e.ends_at ? Date.parse(e.ends_at) - Date.parse(e.starts_at) : null;
  const sameTime = list.every(
    (e) =>
      clockFormat.format(new Date(e.starts_at)) ===
        clockFormat.format(new Date(first.starts_at)) &&
      length(e) === length(first),
  );
  const timeText = !sameTime
    ? ""
    : first.ends_at
      ? `, ${timeRangeFormat.formatRange(new Date(first.starts_at), new Date(first.ends_at))}`
      : `, ${timeRangeFormat.format(new Date(first.starts_at))}`;

  return {
    schedule: `${weekly ? "Every " : ""}${dayText}${timeText}`,
    until: monthDayFormat.format(starts[starts.length - 1]),
    count: list.length,
  };
}
