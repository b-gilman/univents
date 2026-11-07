"use server";

// "Import from a screenshot" (admin only): read screenshots with Claude, then
// publish the checked event. Both actions check the admin login FIRST.

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { formatEventTime } from "@/lib/events";
import { allCampuses, getSchool } from "@/lib/schools";
import { assertAdmin } from "@/lib/server/admin-auth";
import { findOrCreateOrg } from "@/lib/server/admin-data";
import { type ImportDraft, extractEventDraft } from "@/lib/server/event-import";
import {
  parseEventFields,
  parseOccurrences,
  posterType,
} from "@/lib/server/submissions";
import { POSTER_BUCKET, supabaseAdmin } from "@/lib/server/supabase-admin";
import { LIMITS } from "@/lib/submission-rules";

export type ReadState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "draft"; draft: ImportDraft; schoolId: string; link: string };

const files = (fd: FormData, key: string) =>
  fd.getAll(key).filter((f): f is File => f instanceof File && f.size > 0);

// Step 1: screenshots (+ optional caption and post link) → a draft.
export async function readScreenshots(
  _prev: ReadState,
  fd: FormData,
): Promise<ReadState> {
  await assertAdmin();
  const school = await getSchool(String(fd.get("school") ?? ""));
  if (!school) return { status: "error", error: "Pick a school." };
  const link = String(fd.get("link") ?? "")
    .trim()
    .slice(0, 500);
  if (link && !/^https?:\/\/\S+$/i.test(link))
    return {
      status: "error",
      error: "The post link should start with https://",
    };
  const caption = String(fd.get("caption") ?? "")
    .trim()
    .slice(0, 4000);

  const result = await extractEventDraft({
    images: files(fd, "screenshots"),
    caption,
    link,
    school,
  });
  if (!result.ok) return { status: "error", error: result.error };
  return { status: "draft", draft: result.draft, schoolId: school.id, link };
}

export type PublishState =
  | { status: "idle" }
  | { status: "error"; error: string; errors: Record<string, string> }
  | { status: "published"; title: string; dates: string[]; eventId: string };

// Step 2: the admin checked (and maybe fixed) the draft → publish it.
export async function publishImport(
  _prev: PublishState,
  fd: FormData,
): Promise<PublishState> {
  await assertAdmin();
  const fail = (error: string, errors: Record<string, string> = {}) =>
    ({ status: "error", error, errors }) as const;

  const school = await getSchool(String(fd.get("school") ?? ""));
  if (!school) return fail("Pick a school.");
  const clubName = String(fd.get("club_name") ?? "").trim();

  const errors: Record<string, string> = {};
  if (clubName.length < 2 || clubName.length > LIMITS.clubName)
    errors.club_name = "Enter the club's name.";
  const fields = parseEventFields(fd, errors, allCampuses(school));
  const dates = parseOccurrences(fd, errors, new Date());

  const poster = fd.get("poster");
  let posterBytes: Uint8Array | null = null;
  let posterKind: ReturnType<typeof posterType> = null;
  if (poster instanceof File && poster.size > 0) {
    if (poster.size > LIMITS.posterBytes)
      errors.poster = "The poster is too big.";
    else {
      posterBytes = new Uint8Array(await poster.arrayBuffer());
      posterKind = posterType(posterBytes);
      if (!posterKind)
        errors.poster = "The poster must be a JPG, PNG or WebP image.";
    }
  }
  if (Object.keys(errors).length > 0)
    return fail("Please fix the highlighted fields.", errors);

  try {
    const db = supabaseAdmin();
    const organization_id = await findOrCreateOrg(clubName, school.id);
    let image_url: string | null = null;
    if (posterBytes && posterKind) {
      const path = `imports/${randomUUID()}.${posterKind.ext}`;
      const { error } = await db.storage
        .from(POSTER_BUCKET)
        .upload(path, posterBytes, { contentType: posterKind.mime });
      if (error) throw error;
      image_url = db.storage.from(POSTER_BUCKET).getPublicUrl(path)
        .data.publicUrl;
    }
    // A submission record links the dates of a repeating event together.
    const { data: submission, error: subError } = await db
      .from("submissions")
      .insert({
        org_name: clubName,
        contact_email: "(imported by admin)",
        school_id: school.id,
      })
      .select("id")
      .single();
    if (subError) throw subError;
    const { data: inserted, error } = await db
      .from("events")
      .insert(
        dates.map((d) => ({
          ...fields,
          ...d,
          image_url,
          status: "published",
          organization_id,
          school_id: school.id,
          submission_id: submission.id,
        })),
      )
      .select("id, starts_at")
      .order("starts_at");
    if (error) throw error;
    revalidatePath(`/${school.id}`);
    return {
      status: "published",
      title: fields.title,
      dates: dates.map((d) => formatEventTime(d.starts_at, d.ends_at)),
      eventId: inserted?.[0]?.id ?? "",
    };
  } catch (err) {
    console.error("Publishing an import failed:", err);
    return fail("Couldn't save the event. Please try again in a minute.");
  }
}
