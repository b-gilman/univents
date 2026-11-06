"use server";

// Runs on the server when someone presses "Submit event".

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { formatEventTime } from "@/lib/events";
import { POSTER_BUCKET, supabaseAdmin } from "@/lib/server/supabase-admin";
import {
  parseEventFields,
  parseOccurrences,
  parseSubmitter,
  posterType,
  submitterHash,
} from "@/lib/server/submissions";
import { LIMITS, type SubmitState } from "@/lib/submission-rules";

const MAX_PER_HOUR = 5;

export async function submitEvent(
  _previous: SubmitState,
  fd: FormData,
): Promise<SubmitState> {
  // Keep what they typed, so the form can be refilled if something's wrong.
  const values: Record<string, string | string[]> = {};
  for (const key of new Set(fd.keys())) {
    if (key === "poster" || key.startsWith("$")) continue;
    const all = fd.getAll(key).filter((v): v is string => typeof v === "string");
    values[key] = key === "weekdays" ? all : (all[0] ?? "");
  }

  // Spam trap: a hidden field humans never see. Bots fill it in; pretend it
  // worked so they don't learn anything.
  if (typeof fd.get("website") === "string" && fd.get("website") !== "") {
    return { status: "success", title: String(fd.get("title") ?? ""), dates: [] };
  }

  const errors: Record<string, string> = {};
  const submitter = parseSubmitter(fd, errors);
  const fields = parseEventFields(fd, errors);
  const dates = parseOccurrences(fd, errors, new Date());

  // Poster (optional): size and real image type.
  const poster = fd.get("poster");
  let posterBytes: Uint8Array | null = null;
  let posterKind: ReturnType<typeof posterType> = null;
  if (poster instanceof File && poster.size > 0) {
    if (poster.size > LIMITS.posterBytes) errors.poster = "The poster must be under 4 MB.";
    else {
      posterBytes = new Uint8Array(await poster.arrayBuffer());
      posterKind = posterType(posterBytes);
      if (!posterKind) errors.poster = "The poster must be a JPG, PNG or WebP image.";
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      errors,
      values,
    };
  }

  const fail = (message: string): SubmitState => ({ status: "error", message, errors: {}, values });

  try {
    const db = supabaseAdmin();

    // Rate limit: at most MAX_PER_HOUR submissions per sender per hour.
    const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const hash = submitterHash(ip);
    const { count, error: countError } = await db
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("submitter_hash", hash)
      .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
    if (countError) throw countError;
    if ((count ?? 0) >= MAX_PER_HOUR) {
      return fail("You've sent a lot of events in the last hour. Please try again later.");
    }

    // Upload the poster to Supabase Storage.
    let image_url: string | null = null;
    if (posterBytes && posterKind) {
      const path = `submissions/${randomUUID()}.${posterKind.ext}`;
      const { error } = await db.storage
        .from(POSTER_BUCKET)
        .upload(path, posterBytes, { contentType: posterKind.mime });
      if (error) throw error;
      image_url = db.storage.from(POSTER_BUCKET).getPublicUrl(path).data.publicUrl;
    }

    // Save who sent it (private), then the event date(s) as "pending".
    const { data: submission, error: subError } = await db
      .from("submissions")
      .insert({ org_name: submitter.orgName, contact_email: submitter.email, submitter_hash: hash })
      .select("id")
      .single();
    if (subError) throw subError;

    const { error: eventsError } = await db.from("events").insert(
      dates.map((d) => ({
        ...fields,
        ...d,
        image_url,
        status: "pending",
        submission_id: submission.id,
      })),
    );
    if (eventsError) throw eventsError;
  } catch (err) {
    console.error("Event submission failed:", err);
    return fail("Something went wrong saving your event. Please try again in a few minutes.");
  }

  return {
    status: "success",
    title: fields.title,
    dates: dates.map((d) => formatEventTime(d.starts_at, d.ends_at)),
  };
}
