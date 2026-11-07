"use server";

// Organiser actions: post, edit and delete a club's events.
// Every action first checks (through the student's own login) that they
// organise the club. Writes then use the server's full-access client, so the
// event's status is decided HERE: verified clubs publish, others go to review.

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { TIME_ZONE, formatEventTime, hasEnded } from "@/lib/events";
import { allCampuses, getSchool } from "@/lib/schools";
import { saveClubProfile } from "@/lib/server/club-profile";
import { escapeHtml, sendEmailBatch, siteUrl } from "@/lib/server/email";
import { UUID, organiserOf, orgEvents } from "@/lib/server/organisers";
import {
  parseEventFields,
  montrealTime,
  parseOccurrences,
  posterType,
} from "@/lib/server/submissions";
import { POSTER_BUCKET, supabaseAdmin } from "@/lib/server/supabase-admin";
import { SITE } from "@/lib/site";
import { LIMITS, type SubmitState } from "@/lib/submission-rules";

async function readPoster(fd: FormData, errors: Record<string, string>) {
  const poster = fd.get("poster");
  if (!(poster instanceof File) || poster.size === 0) return null;
  if (poster.size > LIMITS.posterBytes) {
    errors.poster = "The poster must be under 4 MB.";
    return null;
  }
  const bytes = new Uint8Array(await poster.arrayBuffer());
  const kind = posterType(bytes);
  if (!kind) {
    errors.poster = "The poster must be a JPG, PNG or WebP image.";
    return null;
  }
  return { bytes, kind };
}

async function uploadPoster(
  poster: NonNullable<Awaited<ReturnType<typeof readPoster>>>,
) {
  const db = supabaseAdmin();
  const path = `organisers/${randomUUID()}.${poster.kind.ext}`;
  const { error } = await db.storage
    .from(POSTER_BUCKET)
    .upload(path, poster.bytes, { contentType: poster.kind.mime });
  if (error) throw error;
  return db.storage.from(POSTER_BUCKET).getPublicUrl(path).data.publicUrl;
}

// --------------------------------------------------------------- new event

export async function createOrgEvent(
  _prev: SubmitState,
  fd: FormData,
): Promise<SubmitState> {
  const values: Record<string, string | string[]> = {};
  for (const key of new Set(fd.keys())) {
    if (key === "poster" || key === "copy_image_url" || key.startsWith("$"))
      continue;
    const all = fd
      .getAll(key)
      .filter((v): v is string => typeof v === "string");
    values[key] = key === "weekdays" ? all : (all[0] ?? "");
  }
  const fail = (
    message: string,
    errors: Record<string, string> = {},
  ): SubmitState => ({
    status: "error",
    message,
    errors,
    values,
  });

  const access = await organiserOf(String(fd.get("org_id") ?? ""));
  if (!access)
    return fail(
      "You're not an organiser of this club (or you've been logged out).",
    );
  const { user, org } = access;
  const school = await getSchool(org.school_id);
  if (!school) return fail("This club's school couldn't be found.");

  const errors: Record<string, string> = {};
  const fields = parseEventFields(fd, errors, allCampuses(school));
  const dates = parseOccurrences(fd, errors, new Date());
  const poster = await readPoster(fd, errors);
  if (Object.keys(errors).length > 0)
    return fail("Please fix the highlighted fields.", errors);

  const status = org.verified ? "published" : "pending";
  // "Use the same poster" when duplicating: only a poster this club already
  // uses, so nobody can attach an image from elsewhere.
  const copyUrl = String(fd.get("copy_image_url") ?? "");
  const copiedPoster =
    !poster && copyUrl
      ? ((await orgEvents(org.id)).find((e) => e.image_url === copyUrl)
          ?.image_url ?? null)
      : null;
  try {
    const db = supabaseAdmin();
    const image_url = poster ? await uploadPoster(poster) : copiedPoster;
    // A submission record links the dates of a repeating event together and
    // shows the admin who posted it.
    const { data: submission, error: subError } = await db
      .from("submissions")
      .insert({
        org_name: org.name,
        contact_email: user.email,
        school_id: school.id,
      })
      .select("id")
      .single();
    if (subError) throw subError;
    const { error } = await db.from("events").insert(
      dates.map((d) => ({
        ...fields,
        ...d,
        image_url,
        status,
        organization_id: org.id,
        school_id: school.id,
        submission_id: submission.id,
      })),
    );
    if (error) throw error;
  } catch (err) {
    console.error("Organiser event creation failed:", err);
    return fail(
      "Something went wrong saving the event. Please try again in a minute.",
    );
  }

  revalidatePath(`/organize/${org.id}`);
  return {
    status: "success",
    title: fields.title,
    dates: dates.map((d) => formatEventTime(d.starts_at, d.ends_at)),
    published: status === "published",
  };
}

// The event, if the logged-in student organises its club.
async function eventForOrganiser(fd: FormData) {
  const eventId = String(fd.get("event_id") ?? "");
  const access = await organiserOf(String(fd.get("org_id") ?? ""));
  if (!access || !UUID.test(eventId)) throw new Error("Not allowed.");
  const event = (await orgEvents(access.org.id)).find((e) => e.id === eventId);
  if (!event) throw new Error("Not allowed.");
  return { ...access, event };
}

// -------------------------------------------------------------- edit event

const ymd = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

// The same clock times on another day (Montreal time). An end at or before
// the start means the next day, e.g. 9 p.m.–2 a.m.
function sameTimesOn(
  dayIso: string,
  start: [number, number],
  end: [number, number] | null,
) {
  const [y, m, d] = ymd.format(new Date(dayIso)).split("-").map(Number);
  const startsAt = montrealTime(y, m, d, ...start);
  let endsAt = end ? montrealTime(y, m, d, ...end) : null;
  if (endsAt && endsAt <= startsAt) endsAt = montrealTime(y, m, d + 1, ...end!);
  return {
    starts_at: startsAt.toISOString(),
    ends_at: endsAt?.toISOString() ?? null,
  };
}

// Saves the edit form. `scope` = "one" (this date) or "series" (this and every
// other upcoming date of the same repeating event; each keeps its own day).
export async function updateOrgEvent(fd: FormData) {
  const { org, event } = await eventForOrganiser(fd);
  const page = `/organize/${org.id}/events/${event.id}`;
  const school = await getSchool(org.school_id);
  const series = fd.get("scope") === "series" && Boolean(event.submission_id);
  const fail = (message: string): never =>
    redirect(`${page}?error=${encodeURIComponent(message)}`);

  const errors: Record<string, string> = {};
  const fields = parseEventFields(
    fd,
    errors,
    school ? allCampuses(school) : [event.campus],
  );
  const [date] = parseOccurrences(fd, errors, new Date());
  const poster = await readPoster(fd, errors);
  if (Object.keys(errors).length > 0) fail(Object.values(errors).join(" "));

  // Shared changes (everything except the date and times).
  const shared: Record<string, unknown> = {
    ...fields,
    // Verified clubs stay live; other clubs' edits go back for review.
    status: org.verified ? "published" : "pending",
  };
  if (poster) shared.image_url = await uploadPoster(poster);
  else if (fd.get("remove_poster") === "yes") shared.image_url = null;

  const db = supabaseAdmin();
  if (!series) {
    const { error } = await db
      .from("events")
      .update({ ...shared, ...date })
      .eq("id", event.id);
    if (error) {
      console.error("Organiser event update failed:", error.message);
      fail("Couldn't save. Please try again.");
    }
  } else {
    // Moving one date to another day only makes sense for that date.
    if (
      ymd.format(new Date(date.starts_at)) !==
      ymd.format(new Date(event.starts_at))
    )
      fail(
        "To move a date to another day, choose “This date only”. Changing all dates keeps each one on its own day.",
      );
    const start = HHMM.exec(String(fd.get("start_time")))!;
    const endMatch = HHMM.exec(String(fd.get("end_time") ?? ""));
    const startHM: [number, number] = [Number(start[1]), Number(start[2])];
    const endHM: [number, number] | null = endMatch
      ? [Number(endMatch[1]), Number(endMatch[2])]
      : null;

    const now = new Date();
    const dates = (await orgEvents(org.id)).filter(
      (x) =>
        x.submission_id === event.submission_id &&
        (x.id === event.id || !hasEnded(x, now)),
    );
    for (const x of dates) {
      const { error } = await db
        .from("events")
        .update({ ...shared, ...sameTimesOn(x.starts_at, startHM, endHM) })
        .eq("id", x.id)
        .eq("organization_id", org.id);
      if (error) {
        console.error("Organiser series update failed:", error.message);
        fail("Couldn't save every date. Please check them and try again.");
      }
    }
    revalidatePath(`/organize/${org.id}`);
    redirect(`${page}?saved=${dates.length}`);
  }
  revalidatePath(`/organize/${org.id}`);
  redirect(`${page}?saved=1`);
}

// ------------------------------------------------------------ delete event

export async function deleteOrgEvent(fd: FormData) {
  const { org, event } = await eventForOrganiser(fd);
  const allDates = fd.get("scope") === "series" && event.submission_id;
  const query = supabaseAdmin()
    .from("events")
    .delete()
    .eq("organization_id", org.id);
  const { error } = allDates
    ? await query.eq("submission_id", event.submission_id!)
    : await query.eq("id", event.id);
  if (error) {
    console.error("Organiser event delete failed:", error.message);
    throw new Error("Couldn't delete the event. Please try again.");
  }
  revalidatePath(`/organize/${org.id}`);
  redirect(`/organize/${org.id}?deleted=1`);
}

// ------------------------------------------------------------- club page

// Description, logo, Instagram and website shown on the club's public page.
export async function updateClubProfile(fd: FormData) {
  const orgId = String(fd.get("org_id") ?? "");
  const access = await organiserOf(orgId);
  if (!access) redirect("/organize");
  const result = await saveClubProfile(orgId, fd);
  revalidatePath(`/clubs/${orgId}`);
  redirect(
    result.ok
      ? `/organize/${orgId}?profile=saved`
      : `/organize/${orgId}?profile_error=${encodeURIComponent(result.error)}`,
  );
}

// ------------------------------------------------------ message followers

const MESSAGE_GAP_HOURS = 24; // one message per club per day, so it never feels spammy

// Emails a short update ("Room changed!", "Sign-ups are open") to the club's
// followers who have emails switched on. Their addresses never leave the server.
export async function messageFollowers(fd: FormData) {
  const orgId = String(fd.get("org_id") ?? "");
  const access = await organiserOf(orgId);
  if (!access) redirect("/organize");
  const { user, org } = access;
  const page = `/organize/${org.id}`;
  const fail = (message: string): never =>
    redirect(`${page}?message_error=${encodeURIComponent(message)}#message`);

  const title = String(fd.get("title") ?? "").trim();
  const body = String(fd.get("body") ?? "").trim();
  if (title.length < 1 || title.length > 80)
    fail("Give your message a short title (up to 80 characters).");
  if (body.length < 1 || body.length > 1000)
    fail("Write your message (up to 1000 characters).");

  const db = supabaseAdmin();
  const since = new Date(Date.now() - MESSAGE_GAP_HOURS * 3600e3).toISOString();
  const { data: recent, error: recentError } = await db
    .from("club_messages")
    .select("created_at")
    .eq("organization_id", org.id)
    .gte("created_at", since)
    .limit(1);
  if (recentError) {
    console.error("Checking recent messages failed:", recentError.message);
    fail("Couldn't send right now. Please try again in a minute.");
  }
  if ((recent ?? []).length > 0)
    fail(
      "Your club already sent a message today. You can send one every 24 hours.",
    );

  const { data: followers, error: followersError } = await db.rpc(
    "club_follower_emails",
    { org: org.id },
  );
  if (followersError) {
    console.error("Loading followers failed:", followersError.message);
    fail("Couldn't send right now. Please try again in a minute.");
  }
  const people = (followers ?? []) as { email: string; full_name: string }[];
  if (people.length === 0)
    fail(
      "None of your followers can get emails yet. Try again once more students follow your club.",
    );

  const site = siteUrl();
  const clubUrl = `${site}/clubs/${org.id}`;
  const subject = `${org.name}: ${title}`;
  const messages = people.map((p) => {
    const first = p.full_name.split(" ")[0] || "there";
    const text = [
      `Coucou ${first}!`,
      "",
      `${org.name} posted an update:`,
      "",
      title,
      body,
      "",
      `See ${org.name}'s events: ${clubUrl}`,
      "",
      `You're getting this because you follow ${org.name} on ${SITE.name}. Unfollow on the club's page, or turn off emails: ${site}/account`,
    ].join("\n");
    const html = `<!doctype html><html><body style="margin:0;background:#f5f5f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#171717">
  <div style="max-width:520px;margin:0 auto;padding:24px 16px">
    <div style="background:#4338ca;color:#fff;border-radius:16px 16px 0 0;padding:20px 24px;font-size:22px;font-weight:800">${escapeHtml(SITE.name)}</div>
    <div style="background:#fff;border-radius:0 0 16px 16px;padding:24px">
      <p style="margin:0 0 4px;font-size:18px;font-weight:700">Coucou ${escapeHtml(first)}!</p>
      <p style="margin:0 0 16px;color:#525252">${escapeHtml(org.name)} posted an update:</p>
      <div style="border:1px solid #e5e5e5;border-radius:12px;padding:14px 16px">
        <div style="font-weight:700;font-size:16px">${escapeHtml(title)}</div>
        <div style="color:#404040;font-size:15px;margin-top:6px;white-space:pre-line">${escapeHtml(body)}</div>
      </div>
      <a href="${escapeHtml(clubUrl)}" style="display:inline-block;margin-top:16px;background:#4338ca;color:#fff;text-decoration:none;font-weight:600;border-radius:10px;padding:10px 16px">See ${escapeHtml(org.name)}'s events</a>
      <p style="margin:20px 0 0;color:#737373;font-size:12px">You're getting this because you follow ${escapeHtml(org.name)} on ${escapeHtml(SITE.name)}. Unfollow on the club's page, or
        <a href="${escapeHtml(site)}/account" style="color:#737373">turn off emails</a>.</p>
    </div>
  </div></body></html>`;
    return { to: p.email, subject, html, text };
  });

  const result = await sendEmailBatch(messages);
  if (result.error) console.error("Follower message failed:", result.error);
  if (result.sent === 0)
    fail("Couldn't send the emails. Please try again in a minute.");

  const { error: logError } = await db.from("club_messages").insert({
    organization_id: org.id,
    sent_by: user.id,
    title,
    body,
    recipients: result.sent,
  });
  if (logError)
    console.error("Saving the message record failed:", logError.message);
  revalidatePath(page);
  redirect(`${page}?message_sent=${result.sent}#message`);
}
