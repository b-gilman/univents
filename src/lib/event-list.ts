import { type EventListItem, TIME_ZONE } from "@/lib/events";
import { type Locale, dateFormat, messages } from "@/lib/i18n";
import { CATEGORIES } from "@/lib/submission-rules";

// =============================================================================
// Filters (Today / This week / Free / SGW / Loyola)
//
// Filters live in the page address, e.g. /concordia?when=week&campus=SGW, so a
// filtered view can be shared or bookmarked.
// =============================================================================

export type Filters = {
  when?: "today" | "week";
  free?: boolean;
  campus?: string; // one of the school's campuses
  category?: (typeof CATEGORIES)[number];
  q?: string; // search text
};

type SearchParams = Record<string, string | string[] | undefined>;

// Read filters from the address, ignoring anything unexpected.
export function parseFilters(
  params: SearchParams,
  campuses: string[],
): Filters {
  const one = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const when = one("when");
  const campus = one("campus");
  const category = one("category") as Filters["category"];
  const q = (one("q") ?? "").trim().slice(0, 100);
  return {
    category: category && CATEGORIES.includes(category) ? category : undefined,
    q: q || undefined,
    when: when === "today" || when === "week" ? when : undefined,
    free: one("free") === "1" || undefined,
    campus: campus && campuses.includes(campus) ? campus : undefined,
  };
}

export function hasFilters(f: Filters) {
  return Boolean(f.when || f.free || f.campus || f.category || f.q);
}

// Build the address for a set of filters, e.g. "/concordia?when=today&free=1".
export function filtersHref(f: Filters, basePath: string) {
  const params = new URLSearchParams();
  if (f.when) params.set("when", f.when);
  if (f.free) params.set("free", "1");
  if (f.campus) params.set("campus", f.campus);
  if (f.category) params.set("category", f.category);
  if (f.q) params.set("q", f.q);
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
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
    if (f.category && e.category !== f.category) return false;
    if (f.q && !matchesSearch(e, f.q)) return false;
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

// Events with the same key are "the same event on different dates".
export function groupKey(e: {
  title: string;
  organization_name: string | null;
  campus: string;
  location: string | null;
}) {
  return [e.title, e.organization_name, e.campus, e.location].join("|");
}

export function groupEvents(
  events: EventListItem[],
  locale: Locale = "en",
): EventGroup[] {
  // Events arrive sorted by start time, so each group's first item is the
  // next occurrence, and groups end up ordered by their next date.
  const groups = new Map<string, EventListItem[]>();
  for (const e of events) {
    const key = groupKey(e);
    const list = groups.get(key);
    if (list) list.push(e);
    else groups.set(key, [e]);
  }

  return [...groups].map(([key, list]) => ({
    key,
    next: list[0],
    repeat: list.length > 1 ? describeRepeat(list, locale) : null,
  }));
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Used only to sort weekdays into calendar order.
const weekdayKey = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  weekday: "short",
});
const clockFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

function describeRepeat(list: EventListItem[], locale: Locale): RepeatInfo {
  const starts = list.map((e) => new Date(e.starts_at));
  const weekdayName = dateFormat(locale, {
    timeZone: TIME_ZONE,
    weekday: "short",
  });
  const time = dateFormat(locale, {
    timeZone: TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  });

  // Which weekdays it happens on, in calendar order: "Tue & Fri"
  const firstOfEachDay = new Map<string, Date>();
  for (const d of starts) {
    const key = weekdayKey.format(d);
    if (!firstOfEachDay.has(key)) firstOfEachDay.set(key, d);
  }
  const days = [...firstOfEachDay]
    .sort(([a], [b]) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b))
    .map(([, d]) => weekdayName.format(d));
  const dayText =
    days.length === 1
      ? days[0]
      : locale === "fr"
        ? new Intl.ListFormat("fr-CA", { type: "conjunction" }).format(days)
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
      ? `, ${time.formatRange(new Date(first.starts_at), new Date(first.ends_at))}`
      : `, ${time.format(new Date(first.starts_at))}`;

  return {
    schedule: `${weekly ? messages(locale).repeat.every : ""}${dayText}${timeText}`,
    until: dateFormat(locale, {
      timeZone: TIME_ZONE,
      month: "short",
      day: "numeric",
    }).format(starts[starts.length - 1]),
    count: list.length,
  };
}

// =============================================================================
// Search: every word must appear in the title, club, description, place or
// category. Ignores capitals and accents ("cafe" finds "Café").
// =============================================================================

const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export function matchesSearch(e: EventListItem, q: string) {
  const haystack = fold(
    [
      e.title,
      e.organization_name,
      e.description,
      e.location,
      e.campus,
      e.category,
      // Category and campus names in both languages ("carrière", "en ligne").
      messages("en").categoryNames[e.category],
      messages("fr").categoryNames[e.category],
      messages("fr").campuses[e.campus],
    ]
      .filter(Boolean)
      .join(" "),
  );
  return fold(q)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

// =============================================================================
// Day headings ("Happening now", "Today", "Tomorrow", "Saturday, November 14")
// =============================================================================

const dayKey = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
// `live` = the "Happening now" section (it gets a pulsing dot).
export type DaySection = { label: string; live: boolean; groups: EventGroup[] };

export function sectionsByDay(
  groups: EventGroup[],
  now: Date,
  locale: Locale = "en",
): DaySection[] {
  const t = messages(locale).days;
  const dayLabel = dateFormat(locale, {
    timeZone: TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const today = dayKey.format(now);
  const tomorrow = dayKey.format(new Date(now.getTime() + 864e5));
  const sections: DaySection[] = [];
  for (const g of groups) {
    const start = new Date(g.next.starts_at);
    const key = start <= now ? "now" : dayKey.format(start);
    const label =
      key === "now"
        ? t.now
        : key === today
          ? t.today
          : key === tomorrow
            ? t.tomorrow
            : dayLabel.format(start);
    const last = sections[sections.length - 1];
    if (last && last.label === label) last.groups.push(g);
    else sections.push({ label, live: key === "now", groups: [g] });
  }
  return sections;
}

// =============================================================================
// Badges on cards: "Happening now", "Starts in 40 min", "Popular"
// =============================================================================

export type Badge = { label: string; tone: "live" | "soon" | "popular" };

export const POPULAR_AT = 5; // RSVPs needed for the "Popular" badge

export function badgesFor(
  e: EventListItem,
  going: number,
  now: Date,
  locale: Locale = "en",
): Badge[] {
  const label = messages(locale).badges;
  const badges: Badge[] = [];
  const start = Date.parse(e.starts_at);
  const end = e.ends_at ? Date.parse(e.ends_at) : start + 4 * 3600e3;
  const t = now.getTime();
  if (start <= t && t < end) badges.push({ label: label.live, tone: "live" });
  else if (start > t && start - t <= 3 * 3600e3) {
    const mins = Math.max(1, Math.round((start - t) / 60000));
    badges.push({
      label:
        mins < 60
          ? label.startsMin(mins)
          : label.startsHours(Math.round(mins / 60)),
      tone: "soon",
    });
  }
  if (going >= POPULAR_AT)
    badges.push({ label: label.popular, tone: "popular" });
  return badges;
}
