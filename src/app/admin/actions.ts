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
import { findOrCreateOrg, groupFilter, loadGroup } from "@/lib/server/admin-data";
import { parseEventFields, parseOccurrences } from "@/lib/server/submissions";
import { supabaseAdmin } from "@/lib/server/supabase-admin";

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
  const password = typeof fd.get("password") === "string" ? (fd.get("password") as string) : "";
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
  if (!group) throw new Error("This submission no longer exists or was already reviewed.");
  return group;
}

export async function approveSubmission(fd: FormData) {
  const group = await groupFromForm(fd);
  const organization_id = group.submission ? await findOrCreateOrg(group.submission.org_name) : null;
  const { column, value } = groupFilter(group);
  const { error } = await supabaseAdmin()
    .from("events")
    .update({ status: "published", ...(organization_id ? { organization_id } : {}) })
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
  const back = (msg: string) => redirect(`/admin/${group.key}?error=${encodeURIComponent(msg)}`);

  const errors: Record<string, string> = {};
  const fields = parseEventFields(fd, errors);

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
  if (fd.get("remove_poster") === "yes") Object.assign(fields, { image_url: null });

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
