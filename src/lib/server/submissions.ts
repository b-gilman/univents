import "server-only";
import { createHash } from "node:crypto";
import { TIME_ZONE } from "@/lib/events";
import { CATEGORIES, LIMITS } from "@/lib/submission-rules";

// Turns raw form data into clean, checked event details. Everything here
// assumes the input could be anything: it comes from the public internet.

export type EventFields = {
  title: string;
  description: string | null;
  category: (typeof CATEGORIES)[number];
  campus: string;
  location: string | null;
  price_cents: number | null;
  signup_url: string | null;
  info_url: string | null;
};

type Errors = Record<string, string>;

const text = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
};

function checkUrl(value: string, field: string, errors: Errors) {
  if (!value) return null;
  if (value.length > LIMITS.url) {
    errors[field] = "That link is too long.";
    return null;
  }
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
    return u.toString();
  } catch {
    errors[field] = "Enter a full link starting with https://";
    return null;
  }
}

// Fields shared by the public form and the admin edit form.
// `campuses` = the school's campuses plus Off-campus/Online.
export function parseEventFields(fd: FormData, errors: Errors, campuses: string[]): EventFields {
  const title = text(fd, "title");
  if (title.length < 3) errors.title = "Enter the event's name.";
  else if (title.length > LIMITS.title) errors.title = `Keep it under ${LIMITS.title} characters.`;

  const description = text(fd, "description");
  if (description.length > LIMITS.description)
    errors.description = `Keep it under ${LIMITS.description} characters.`;

  const category = text(fd, "category") as EventFields["category"];
  if (!CATEGORIES.includes(category)) errors.category = "Pick a category.";

  const campus = text(fd, "campus");
  if (!campuses.includes(campus)) errors.campus = "Pick a campus.";

  const location = text(fd, "location");
  if (location.length > LIMITS.location) errors.location = "That location is too long.";

  // Price: "free", "paid" (+ amount) or "unknown" → 0, cents, or null (TBA)
  let price_cents: number | null = null;
  const priceType = text(fd, "price_type");
  if (priceType === "free") price_cents = 0;
  else if (priceType === "paid") {
    const amount = Number(text(fd, "price").replace(/[$,\s]/g, ""));
    if (!Number.isFinite(amount) || amount <= 0 || amount > LIMITS.maxPriceDollars)
      errors.price = `Enter a price between $0.01 and $${LIMITS.maxPriceDollars}.`;
    else price_cents = Math.round(amount * 100);
  } else if (priceType !== "unknown") errors.price_type = "Choose a price option.";

  return {
    title,
    description: description || null,
    category,
    campus,
    location: location || null,
    price_cents,
    signup_url: checkUrl(text(fd, "signup_url"), "signup_url", errors),
    info_url: checkUrl(text(fd, "info_url"), "info_url", errors),
  };
}

// -----------------------------------------------------------------------------
// Dates: "2026-11-14" + "19:00" (Montreal) → exact moments in time
// -----------------------------------------------------------------------------

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

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

function wallClockMs(ms: number) {
  const p = Object.fromEntries(
    partsFormat.formatToParts(ms).map((x) => [x.type, Number(x.value)]),
  );
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

// Montreal wall-clock time → Date (handles daylight saving time).
export function montrealTime(y: number, m: number, d: number, h: number, min: number) {
  const guess = Date.UTC(y, m - 1, d, h, min);
  let result = guess - (wallClockMs(guess) - guess);
  result = guess - (wallClockMs(result) - result); // second pass near DST changes
  return new Date(result);
}

const ymdFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

type Day = { y: number; m: number; d: number };

function parseDay(value: string): Day | null {
  const match = DATE.exec(value);
  if (!match) return null;
  const [y, m, d] = match.slice(1).map(Number);
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null; // e.g. Feb 31
  return { y, m, d };
}

const dayNumber = (day: Day) => Date.UTC(day.y, day.m - 1, day.d) / 864e5;

function dayFromNumber(n: number): Day {
  const dt = new Date(n * 864e5);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

export type Occurrence = { starts_at: string; ends_at: string | null };

// Works out every date of the event (one, or several if it repeats weekly).
export function parseOccurrences(fd: FormData, errors: Errors, now: Date): Occurrence[] {
  const first = parseDay(text(fd, "date"));
  const start = TIME.exec(text(fd, "start_time"));
  const endRaw = text(fd, "end_time");
  const end = endRaw ? TIME.exec(endRaw) : null;

  if (!first) errors.date = "Pick the date.";
  if (!start) errors.start_time = "Pick the start time.";
  if (endRaw && !end) errors.end_time = "Pick a valid end time.";
  if (!first || !start || (endRaw && !end)) return [];

  const today = parseDay(ymdFormat.format(now))!;
  if (dayNumber(first) < dayNumber(today)) errors.date = "That date has already passed.";
  if (dayNumber(first) > dayNumber(today) + LIMITS.maxDaysAhead)
    errors.date = "That's more than a year away.";

  let days: Day[] = [first];
  if (text(fd, "repeats") === "weekly") {
    const until = parseDay(text(fd, "repeat_until"));
    if (!until) {
      errors.repeat_until = "Pick the last date.";
      return [];
    }
    const span = dayNumber(until) - dayNumber(first);
    if (span < 0) errors.repeat_until = "The last date must be after the first date.";
    else if (span > LIMITS.maxRepeatDays)
      errors.repeat_until = `Repeating events can run up to ${LIMITS.maxRepeatDays} days.`;

    let weekdays = fd
      .getAll("weekdays")
      .map((v) => Number(v))
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
    // No day ticked? Use the first date's weekday.
    if (weekdays.length === 0) weekdays = [new Date(dayNumber(first) * 864e5).getUTCDay()];

    if (span >= 0 && span <= LIMITS.maxRepeatDays) {
      days = [];
      for (let n = dayNumber(first); n <= dayNumber(until); n++) {
        if (weekdays.includes(new Date(n * 864e5).getUTCDay())) days.push(dayFromNumber(n));
      }
      if (days.length === 0) errors.weekdays = "None of those days fall in that date range.";
      if (days.length > LIMITS.maxDates) errors.repeat_until = "That's too many dates.";
    }
  }

  const [sh, sm] = [Number(start[1]), Number(start[2])];
  return days.map((day) => {
    const startsAt = montrealTime(day.y, day.m, day.d, sh, sm);
    let endsAt: Date | null = null;
    if (end) {
      const [eh, em] = [Number(end[1]), Number(end[2])];
      endsAt = montrealTime(day.y, day.m, day.d, eh, em);
      // Ends at or before it starts → it ends the next day (e.g. 9 p.m.–2 a.m.)
      if (endsAt <= startsAt) {
        const next = dayFromNumber(dayNumber(day) + 1);
        endsAt = montrealTime(next.y, next.m, next.d, eh, em);
      }
    }
    return { starts_at: startsAt.toISOString(), ends_at: endsAt?.toISOString() ?? null };
  });
}

// -----------------------------------------------------------------------------
// Submitter details and spam protection
// -----------------------------------------------------------------------------

export function parseSubmitter(fd: FormData, errors: Errors) {
  const orgName = text(fd, "club_name");
  if (orgName.length < 2) errors.club_name = "Enter your club or organization's name.";
  else if (orgName.length > LIMITS.clubName) errors.club_name = "That name is too long.";

  const email = text(fd, "contact_email").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > LIMITS.email)
    errors.contact_email = "Enter a valid email address.";

  if (fd.get("permission") !== "yes")
    errors.permission = "Please confirm you're allowed to post this event.";

  return { orgName, email };
}

// An anonymous fingerprint of the sender (their IP address, scrambled with a
// secret), used only to cap how many events one person can send per hour.
export function submitterHash(ip: string) {
  return createHash("sha256")
    .update(`${ip}|${process.env.SUPABASE_SECRET_KEY ?? ""}`)
    .digest("hex")
    .slice(0, 32);
}

// Checks the poster really is a JPEG/PNG/WebP image by its first bytes,
// not just by its name.
export function posterType(bytes: Uint8Array): { ext: string; mime: string } | null {
  const b = bytes;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
    return { ext: "png", mime: "image/png" };
  if (
    String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...b.slice(8, 12)) === "WEBP"
  )
    return { ext: "webp", mime: "image/webp" };
  return null;
}
