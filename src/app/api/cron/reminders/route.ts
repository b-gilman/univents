import { NextResponse, type NextRequest } from "next/server";
import { TIME_ZONE, formatEventTime, formatPlace } from "@/lib/events";
import { escapeHtml, sendEmail, siteUrl } from "@/lib/server/email";
import { montrealTime } from "@/lib/server/submissions";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { SITE } from "@/lib/site";

// Daily job (see vercel.json): ONE email per student with
//   • the events they RSVP'd to that happen TOMORROW (Montreal time), and
//   • NEW events posted since the last email by clubs they follow.
// Vercel calls this with "Authorization: Bearer <CRON_SECRET>"; anyone else
// is turned away.

type Due = {
  event_id: string;
  user_id: string;
  email: string;
  full_name: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  campus: string;
  location: string | null;
};

// A new event from a club the student follows.
type News = {
  user_id: string;
  email: string;
  full_name: string;
  event_id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  campus: string;
  location: string | null;
  organization_name: string;
};

type Student = { email: string; name: string; tomorrow: Due[]; news: News[] };

const ymd = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Midnight at the start of tomorrow and of the day after (Montreal time).
function tomorrowWindow(now: Date) {
  const [y, m, d] = ymd.format(now).split("-").map(Number);
  const day = (offset: number) => {
    const dt = new Date(Date.UTC(y, m - 1, d + offset));
    return montrealTime(
      dt.getUTCFullYear(),
      dt.getUTCMonth() + 1,
      dt.getUTCDate(),
      0,
      0,
    );
  };
  return { start: day(1), end: day(2) };
}

function reminderEmail({ name, tomorrow, news }: Student) {
  const site = siteUrl();
  const first = name.split(" ")[0] || "there";
  const subject =
    tomorrow.length === 1
      ? `Tomorrow: ${tomorrow[0].title}`
      : tomorrow.length > 1
        ? `Tomorrow: ${tomorrow.length} events you're going to`
        : news.length === 1
          ? `New from ${news[0].organization_name}: ${news[0].title}`
          : `${news.length} new events from clubs you follow`;

  const item = (e: Due | News) => ({
    title: e.title,
    club: "organization_name" in e ? e.organization_name : null,
    when: formatEventTime(e.starts_at, e.ends_at),
    where: formatPlace(e.campus, e.location),
    url: `${site}/events/${e.event_id}`,
  });
  const sections = [
    {
      heading: "Here's what you're going to tomorrow:",
      items: tomorrow.map(item),
    },
    { heading: "New from clubs you follow:", items: news.map(item) },
  ].filter((s) => s.items.length > 0);

  const text = [
    `Coucou ${first}!`,
    "",
    ...sections.flatMap((s) => [
      s.heading,
      "",
      ...s.items.flatMap((i) => [
        `• ${i.title}${i.club ? ` (${i.club})` : ""}`,
        `  ${i.when}`,
        `  ${i.where}`,
        `  ${i.url}`,
        "",
      ]),
    ]),
    `Don't want these emails? Turn them off: ${site}/account`,
  ].join("\n");

  const card = (
    i: ReturnType<typeof item>,
  ) => `<a href="${escapeHtml(i.url)}" style="display:block;text-decoration:none;color:inherit;border:1px solid #e5e5e5;border-radius:12px;padding:14px 16px;margin-bottom:10px">
        <div style="font-weight:700;font-size:16px">${escapeHtml(i.title)}</div>
        ${i.club ? `<div style="color:#737373;font-size:13px">by ${escapeHtml(i.club)}</div>` : ""}
        <div style="color:#404040;font-size:14px;margin-top:4px">🕒 ${escapeHtml(i.when)}</div>
        <div style="color:#404040;font-size:14px">📍 ${escapeHtml(i.where)}</div>
        <div style="color:#4338ca;font-size:14px;font-weight:600;margin-top:6px">See details →</div>
      </a>`;

  const html = `<!doctype html><html><body style="margin:0;background:#f5f5f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#171717">
  <div style="max-width:520px;margin:0 auto;padding:24px 16px">
    <div style="background:#4338ca;color:#fff;border-radius:16px 16px 0 0;padding:20px 24px;font-size:22px;font-weight:800">${escapeHtml(SITE.name)}</div>
    <div style="background:#fff;border-radius:0 0 16px 16px;padding:24px">
      <p style="margin:0 0 4px;font-size:18px;font-weight:700">Coucou ${escapeHtml(first)}!</p>
      ${sections
        .map(
          (
            s,
          ) => `<p style="margin:16px 0 12px;color:#525252">${escapeHtml(s.heading)}</p>
      ${s.items.map(card).join("")}`,
        )
        .join("")}
      <p style="margin:20px 0 0;color:#737373;font-size:12px">You're getting this because you RSVP'd to events or follow clubs on ${escapeHtml(SITE.name)}.
        <a href="${escapeHtml(site)}/account" style="color:#737373">Turn off these emails</a>.</p>
    </div>
  </div></body></html>`;

  return { subject, html, text };
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return NextResponse.json(
      { error: "CRON_SECRET isn't set." },
      { status: 500 },
    );
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  }

  const db = supabaseAdmin();
  const now = new Date();
  const { start, end } = tomorrowWindow(now);
  const { data, error } = await db.rpc("due_reminders", {
    window_start: start.toISOString(),
    window_end: end.toISOString(),
  });
  if (error) {
    console.error("Reminders: query failed:", error.message);
    return NextResponse.json({ error: "Query failed." }, { status: 500 });
  }

  // New events from followed clubs. If this fails (e.g. the clubs update
  // hasn't been run in Supabase yet), the reminders still go out.
  const { data: newsData, error: newsError } = await db.rpc("due_club_news", {
    p_now: now.toISOString(),
  });
  if (newsError) console.error("Club news: query failed:", newsError.message);

  // One email per student, listing all their events.
  const students = new Map<string, Student>();
  const student = (row: {
    user_id: string;
    email: string;
    full_name: string;
  }) => {
    let s = students.get(row.user_id);
    if (!s) {
      s = { email: row.email, name: row.full_name, tomorrow: [], news: [] };
      students.set(row.user_id, s);
    }
    return s;
  };
  for (const row of data as Due[]) student(row).tomorrow.push(row);
  for (const row of (newsError ? [] : newsData) as News[]) {
    const s = student(row);
    // Already in "tomorrow" (they RSVP'd)? Don't list it twice.
    if (!s.tomorrow.some((e) => e.event_id === row.event_id)) s.news.push(row);
  }

  let sent = 0;
  let failed = 0;
  for (const [userId, s] of students) {
    if (s.tomorrow.length === 0 && s.news.length === 0) continue;
    const result = await sendEmail({ to: s.email, ...reminderEmail(s) });
    if (!result.ok) {
      failed++;
      console.error("Reminders: send failed:", result.error);
      continue;
    }
    sent++;
    if (s.tomorrow.length > 0) {
      const { error: markError } = await db
        .from("rsvps")
        .update({ reminded_at: new Date().toISOString() })
        .eq("user_id", userId)
        .in(
          "event_id",
          s.tomorrow.map((e) => e.event_id),
        );
      if (markError)
        console.error("Reminders: marking as sent failed:", markError.message);
    }
    if (!newsError) {
      // Up to `now`, this student has heard about every new event.
      const { error: newsMarkError } = await db
        .from("profiles")
        .update({ club_news_sent_at: now.toISOString() })
        .eq("id", userId);
      if (newsMarkError)
        console.error(
          "Club news: marking as sent failed:",
          newsMarkError.message,
        );
    }
    await new Promise((r) => setTimeout(r, 600)); // stay under Resend's rate limit
  }

  return NextResponse.json({
    window: { start: start.toISOString(), end: end.toISOString() },
    students: students.size,
    sent,
    failed,
  });
}
