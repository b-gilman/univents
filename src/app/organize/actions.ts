"use server";

// Organiser actions: post, edit and delete a club's events.
// Every action first checks (through the student's own login) that they
// organise the club. Writes then use the server's full-access client, so the
// event's status is decided HERE: verified clubs publish, others go to review.

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formatEventTime } from "@/lib/events";
import { allCampuses, getSchool } from "@/lib/schools";
import { UUID, organiserOf, orgEvents } from "@/lib/server/organisers";
import {
  parseEventFields,
  parseOccurrences,
  posterType,
} from "@/lib/server/submissions";
import { POSTER_BUCKET, supabaseAdmin } from "@/lib/server/supabase-admin";
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
    if (key === "poster" || key.startsWith("$")) continue;
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
  try {
    const db = supabaseAdmin();
    const image_url = poster ? await uploadPoster(poster) : null;
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

export async function updateOrgEvent(fd: FormData) {
  const { org, event } = await eventForOrganiser(fd);
  const page = `/organize/${org.id}/events/${event.id}`;
  const school = await getSchool(org.school_id);

  const errors: Record<string, string> = {};
  const fields = parseEventFields(
    fd,
    errors,
    school ? allCampuses(school) : [event.campus],
  );
  const [date] = parseOccurrences(fd, errors, new Date());
  const poster = await readPoster(fd, errors);
  if (Object.keys(errors).length > 0) {
    redirect(
      `${page}?error=${encodeURIComponent(Object.values(errors).join(" "))}`,
    );
  }

  const changes: Record<string, unknown> = {
    ...fields,
    ...date,
    // Verified clubs stay live; other clubs' edits go back for review.
    status: org.verified ? "published" : "pending",
  };
  if (poster) changes.image_url = await uploadPoster(poster);
  else if (fd.get("remove_poster") === "yes") changes.image_url = null;

  const { error } = await supabaseAdmin()
    .from("events")
    .update(changes)
    .eq("id", event.id);
  if (error) {
    console.error("Organiser event update failed:", error.message);
    redirect(
      `${page}?error=${encodeURIComponent("Couldn't save. Please try again.")}`,
    );
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
