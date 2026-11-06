import { NextResponse, type NextRequest } from "next/server";
import { TIME_ZONE, formatEventTime, formatPlace } from "@/lib/events";
import { escapeHtml, sendEmail, siteUrl } from "@/lib/server/email";
import { montrealTime } from "@/lib/server/submissions";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { SITE } from "@/lib/site";

// Daily job (see vercel.json): emails each student about the events they
// RSVP'd to that happen TOMORROW (Montreal time). Vercel calls this with
// "Authorization: Bearer <CRON_SECRET>"; anyone else is turned away.

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

function reminderEmail(name: string, events: Due[]) {
  const site = siteUrl();
  const first = name.split(" ")[0] || "there";
  const subject =
    events.length === 1
      ? `Tomorrow: ${events[0].title}`
      : `Tomorrow: ${events.length} events you're going to`;

  const items = events.map((e) => ({
    title: e.title,
    when: formatEventTime(e.starts_at, e.ends_at),
    where: formatPlace(e.campus, e.location),
    url: `${site}/events/${e.event_id}`,
  }));

  const text = [
    `Coucou ${first}!`,
    "",
    "Here's what you're going to tomorrow:",
    "",
    ...items.flatMap((i) => [
      `• ${i.title}`,
      `  ${i.when}`,
      `  ${i.where}`,
      `  ${i.url}`,
      "",
    ]),
    `Don't want reminders? Turn them off: ${site}/account`,
  ].join("\n");

  const html = `<!doctype html><html><body style="margin:0;background:#f5f5f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#171717">
  <div style="max-width:520px;margin:0 auto;padding:24px 16px">
    <div style="background:#4338ca;color:#fff;border-radius:16px 16px 0 0;padding:20px 24px;font-size:22px;font-weight:800">${escapeHtml(SITE.name)}</div>
    <div style="background:#fff;border-radius:0 0 16px 16px;padding:24px">
      <p style="margin:0 0 4px;font-size:18px;font-weight:700">Coucou ${escapeHtml(first)}!</p>
      <p style="margin:0 0 16px;color:#525252">Here's what you're going to tomorrow:</p>
      ${items
        .map(
          (
            i,
          ) => `<a href="${escapeHtml(i.url)}" style="display:block;text-decoration:none;color:inherit;border:1px solid #e5e5e5;border-radius:12px;padding:14px 16px;margin-bottom:10px">
        <div style="font-weight:700;font-size:16px">${escapeHtml(i.title)}</div>
        <div style="color:#404040;font-size:14px;margin-top:4px">🕒 ${escapeHtml(i.when)}</div>
        <div style="color:#404040;font-size:14px">📍 ${escapeHtml(i.where)}</div>
        <div style="color:#4338ca;font-size:14px;font-weight:600;margin-top:6px">See details →</div>
      </a>`,
        )
        .join("")}
      <p style="margin:20px 0 0;color:#737373;font-size:12px">You're getting this because you RSVP'd on ${escapeHtml(SITE.name)}.
        <a href="${escapeHtml(site)}/account" style="color:#737373">Turn off reminders</a>.</p>
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
  const { start, end } = tomorrowWindow(new Date());
  const { data, error } = await db.rpc("due_reminders", {
    window_start: start.toISOString(),
    window_end: end.toISOString(),
  });
  if (error) {
    console.error("Reminders: query failed:", error.message);
    return NextResponse.json({ error: "Query failed." }, { status: 500 });
  }

  // One email per student, listing all their events tomorrow.
  const byStudent = new Map<string, Due[]>();
  for (const row of data as Due[]) {
    byStudent.set(row.user_id, [...(byStudent.get(row.user_id) ?? []), row]);
  }

  let sent = 0;
  let failed = 0;
  for (const [userId, events] of byStudent) {
    const message = reminderEmail(events[0].full_name, events);
    const result = await sendEmail({ to: events[0].email, ...message });
    if (!result.ok) {
      failed++;
      console.error("Reminders: send failed:", result.error);
      continue;
    }
    sent++;
    const { error: markError } = await db
      .from("rsvps")
      .update({ reminded_at: new Date().toISOString() })
      .eq("user_id", userId)
      .in(
        "event_id",
        events.map((e) => e.event_id),
      );
    if (markError)
      console.error("Reminders: marking as sent failed:", markError.message);
    await new Promise((r) => setTimeout(r, 600)); // stay under Resend's rate limit
  }

  return NextResponse.json({
    window: { start: start.toISOString(), end: end.toISOString() },
    students: byStudent.size,
    sent,
    failed,
  });
}
