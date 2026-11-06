"use server";

// Admin actions. Each one checks the admin login FIRST, because these can be
// called directly by anyone who knows how, not only from the admin page.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  adminPasswordConfigured,
  assertAdmin,
  endAdminSession,
  passwordIsCorrect,
  startAdminSession,
} from "@/lib/server/admin-auth";
import {
  findOrCreateOrg,
  groupFilter,
  loadGroup,
} from "@/lib/server/admin-data";
import { parseEventFields, parseOccurrences } from "@/lib/server/submissions";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { allCampuses, getSchool } from "@/lib/schools";

// ---------------------------------------------------------------- login/out

export async function login(_prev: { error: string }, fd: FormData) {
  if (!adminPasswordConfigured()) {
    const set = (process.env.ADMIN_PASSWORD ?? "").length > 0;
    return {
      error: set
        ? "ADMIN_PASSWORD is set on Vercel but is shorter than 12 characters. Choose a longer one, save, and redeploy."
        : "This deployment can't see ADMIN_PASSWORD. Add it in Vercel → Settings → Environment Variables (Production ticked), then redeploy.",
    };
  }
  const password =
    typeof fd.get("password") === "string"
      ? (fd.get("password") as string)
      : "";
  if (!passwordIsCorrect(password)) {
    await new Promise((r) => setTimeout(r, 1000)); // slows down password guessing
    return { error: "Wrong password." };
  }
  await startAdminSession();
  redirect("/admin");
}

export async function logout() {
  await endAdminSession();
  redirect("/admin/login");
}

// ------------------------------------------------------ approve / reject

async function groupFromForm(fd: FormData) {
  await assertAdmin();
  const id = String(fd.get("submission_id") ?? "");
  const group = await loadGroup(id);
  if (!group)
    throw new Error(
      "This submission no longer exists or was already reviewed.",
    );
  return group;
}

export async function approveSubmission(fd: FormData) {
  const group = await groupFromForm(fd);
  const organization_id = group.submission
    ? await findOrCreateOrg(
        group.submission.org_name,
        group.events[0].school_id,
      )
    : null;
  const { column, value } = groupFilter(group);
  const { error } = await supabaseAdmin()
    .from("events")
    .update({
      status: "published",
      ...(organization_id ? { organization_id } : {}),
    })
    .eq(column, value)
    .eq("status", "pending");
  if (error) throw error;
  revalidatePath("/admin");
}

export async function rejectSubmission(fd: FormData) {
  const group = await groupFromForm(fd);
  const { column, value } = groupFilter(group);
  const { error } = await supabaseAdmin()
    .from("events")
    .update({ status: "rejected" })
    .eq(column, value)
    .eq("status", "pending");
  if (error) throw error;
  revalidatePath("/admin");
}

// ------------------------------------------------------------------- edit

export async function updateSubmission(fd: FormData) {
  const group = await groupFromForm(fd);
  const back = (msg: string) =>
    redirect(`/admin/${group.key}?error=${encodeURIComponent(msg)}`);

  const errors: Record<string, string> = {};
  const school = await getSchool(group.events[0].school_id);
  const fields = parseEventFields(
    fd,
    errors,
    school ? allCampuses(school) : [group.events[0].campus],
  );

  const clubName = String(fd.get("club_name") ?? "").trim();
  if (group.submission && (clubName.length < 2 || clubName.length > 100))
    errors.club_name = "Enter the club's name.";

  // Dates can only be edited for single-date events.
  let dates: { starts_at: string; ends_at: string | null }[] = [];
  if (group.events.length === 1) {
    dates = parseOccurrences(fd, errors, new Date());
  }
  if (Object.keys(errors).length > 0) back(Object.values(errors).join(" "));

  const db = supabaseAdmin();
  if (fd.get("remove_poster") === "yes")
    Object.assign(fields, { image_url: null });

  const { column, value } = groupFilter(group);
  const { error } = await db
    .from("events")
    .update({ ...fields, ...(dates[0] ?? {}) })
    .eq(column, value)
    .eq("status", "pending");
  if (error) throw error;

  if (group.submission && clubName !== group.submission.org_name) {
    const { error: subError } = await db
      .from("submissions")
      .update({ org_name: clubName })
      .eq("id", group.submission.id);
    if (subError) throw subError;
  }

  revalidatePath("/admin");
  redirect("/admin");
}

// -------------------------------------------------------------- organisers

const ORG_PAGE = "/admin/organisers";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function orgIdFrom(fd: FormData) {
  const id = String(fd.get("org_id") ?? "");
  if (!UUID_RE.test(id)) throw new Error("Unknown club.");
  return id;
}

// Makes an existing account an organiser of a club, by the email they log in with.
export async function addOrganiser(fd: FormData) {
  await assertAdmin();
  const orgId = orgIdFrom(fd);
  const email = String(fd.get("email") ?? "").trim();
  const back = (msg: string, kind: "msg" | "error" = "error") =>
    redirect(`${ORG_PAGE}?${kind}=${encodeURIComponent(msg)}#org-${orgId}`);

  const db = supabaseAdmin();
  const { data: found, error } = await db.rpc("admin_find_user", {
    p_email: email,
  });
  if (error) throw error;
  const person = (found as { user_id: string; full_name: string | null }[])[0];
  if (!person)
    back(`No account uses ${email}. Ask them to sign up first, then add them.`);

  const { error: insertError } = await db
    .from("organization_members")
    .insert({ organization_id: orgId, user_id: person.user_id });
  if (insertError && insertError.code !== "23505") throw insertError; // 23505 = already added
  revalidatePath(ORG_PAGE);
  back(`${person.full_name ?? email} is now an organiser.`, "msg");
}

export async function removeOrganiser(fd: FormData) {
  await assertAdmin();
  const orgId = orgIdFrom(fd);
  const userId = String(fd.get("user_id") ?? "");
  if (!UUID_RE.test(userId)) throw new Error("Unknown person.");
  const { error } = await supabaseAdmin()
    .from("organization_members")
    .delete()
    .eq("organization_id", orgId)
    .eq("user_id", userId);
  if (error) throw error;
  revalidatePath(ORG_PAGE);
}

// Verified clubs' organisers publish events without review.
export async function setVerified(fd: FormData) {
  await assertAdmin();
  const orgId = orgIdFrom(fd);
  const { error } = await supabaseAdmin()
    .from("organizations")
    .update({ verified: fd.get("verified") === "yes" })
    .eq("id", orgId);
  if (error) throw error;
  revalidatePath(ORG_PAGE);
}

// ------------------------------------------------------------ live events

const EVENTS_PAGE = "/admin/events";

function eventIdFrom(fd: FormData) {
  const id = String(fd.get("event_id") ?? "");
  if (!UUID_RE.test(id)) throw new Error("Unknown event.");
  return id;
}

// Edit any event (including past ones, e.g. to fix a typo).
export async function adminUpdateEvent(fd: FormData) {
  await assertAdmin();
  const id = eventIdFrom(fd);
  const page = `${EVENTS_PAGE}/${id}`;
  const db = supabaseAdmin();
  const { data: event, error: loadError } = await db
    .from("events")
    .select("school_id, campus")
    .eq("id", id)
    .maybeSingle();
  if (loadError) throw loadError;
  if (!event) redirect(EVENTS_PAGE);

  const school = await getSchool(event.school_id);
  const errors: Record<string, string> = {};
  const fields = parseEventFields(
    fd,
    errors,
    school ? allCampuses(school) : [event.campus],
  );
  const [date] = parseOccurrences(fd, errors, new Date(), { allowPast: true });
  if (Object.keys(errors).length > 0) {
    redirect(
      `${page}?error=${encodeURIComponent(Object.values(errors).join(" "))}`,
    );
  }
  const changes: Record<string, unknown> = { ...fields, ...date };
  if (fd.get("remove_poster") === "yes") changes.image_url = null;

  const { error } = await db.from("events").update(changes).eq("id", id);
  if (error) throw error;
  revalidatePath(EVENTS_PAGE);
  redirect(`${page}?saved=1`);
}

// Hide an event from the site without deleting it (status "draft"), or show
// it again ("published").
export async function adminSetEventStatus(fd: FormData) {
  await assertAdmin();
  const id = eventIdFrom(fd);
  const status = fd.get("status") === "published" ? "published" : "draft";
  const { error } = await supabaseAdmin()
    .from("events")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
  revalidatePath(EVENTS_PAGE);
}

export async function adminDeleteEvent(fd: FormData) {
  await assertAdmin();
  const id = eventIdFrom(fd);
  const { error } = await supabaseAdmin().from("events").delete().eq("id", id);
  if (error) throw error;
  revalidatePath(EVENTS_PAGE);
  redirect(`${EVENTS_PAGE}?deleted=1`);
}

// Submissions whose dates have all passed can't be published usefully:
// mark them "rejected" so they leave the review queue.
export async function clearExpiredSubmissions() {
  await assertAdmin();
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("events")
    .select("id, starts_at, ends_at")
    .eq("status", "pending");
  if (error) throw error;
  const now = Date.now();
  const expired = (
    data as { id: string; starts_at: string; ends_at: string | null }[]
  )
    .filter(
      (e) =>
        (e.ends_at
          ? Date.parse(e.ends_at)
          : Date.parse(e.starts_at) + 4 * 3600e3) < now,
    )
    .map((e) => e.id);
  if (expired.length > 0) {
    const { error: updateError } = await db
      .from("events")
      .update({ status: "rejected" })
      .in("id", expired)
      .eq("status", "pending");
    if (updateError) throw updateError;
  }
  revalidatePath("/admin");
}
