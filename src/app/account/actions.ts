"use server";

// Sign up, log in, log out, RSVP, password reset and reminder settings.
// These run on the server.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, safeNext, supabaseForUser } from "@/lib/server/auth";
import { getSchool } from "@/lib/schools";
import { siteUrl } from "@/lib/server/email";
import { getMessages } from "@/lib/server/locale";
import { supabaseAdmin } from "@/lib/server/supabase-admin";

export type AuthState = {
  error?: string;
  errors?: Record<string, string>;
  values?: Record<string, string>;
  notice?: string;
};

const text = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ------------------------------------------------------------------ sign up

export async function signUp(
  _prev: AuthState,
  fd: FormData,
): Promise<AuthState> {
  const fullName = text(fd, "full_name");
  const email = text(fd, "email").toLowerCase();
  const password =
    typeof fd.get("password") === "string"
      ? (fd.get("password") as string)
      : "";
  const school = await getSchool(text(fd, "school"));
  const t = (await getMessages()).errors;
  const values = { full_name: fullName, email, school: school?.id ?? "" };

  const errors: Record<string, string> = {};
  if (fullName.length < 2 || fullName.length > 100)
    errors.full_name = t.fullName;
  if (!EMAIL.test(email) || email.length > 200) errors.email = t.email;
  if (password.length < 8) errors.password = t.passwordShort;
  else if (password.length > 72) errors.password = t.passwordLong;
  if (!school) errors.school = t.school;
  if (Object.keys(errors).length > 0) return { errors, values };

  const supabase = await supabaseForUser();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, school_id: school!.id },
      emailRedirectTo: `${siteUrl()}/auth/confirm?next=/${school!.id}`,
    },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes("already registered") ||
      error.code === "user_already_exists"
    )
      return {
        error: t.exists,
        values,
      };
    if (error.code === "weak_password" || msg.includes("password"))
      return { errors: { password: t.weakPassword }, values };
    console.error("Sign-up failed:", error.message);
    return {
      error: t.signupFailed,
      values,
    };
  }

  // Supabase is set to require email confirmation: no session yet.
  if (!data.session) {
    return { notice: t.checkEmail };
  }

  redirect(safeNext(fd.get("next")) ?? `/${school!.id}`);
}

// ------------------------------------------------------------------- log in

export async function logIn(
  _prev: AuthState,
  fd: FormData,
): Promise<AuthState> {
  const email = text(fd, "email").toLowerCase();
  const password =
    typeof fd.get("password") === "string"
      ? (fd.get("password") as string)
      : "";
  const t = (await getMessages()).errors;
  if (!EMAIL.test(email) || !password) {
    return { error: t.emailAndPassword, values: { email } };
  }

  const supabase = await supabaseForUser();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed")
      return {
        error: t.confirmFirst,
        values: { email },
      };
    return { error: t.wrongLogin, values: { email } };
  }
  redirect(safeNext(fd.get("next")) ?? "/account");
}

// ------------------------------------------------------------------ log out

export async function logOut() {
  const supabase = await supabaseForUser();
  await supabase.auth.signOut();
  redirect("/");
}

// --------------------------------------------------------------------- RSVP

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// "I'm going" ↔ "Cancel". The database's rules make sure students can only
// RSVP for themselves, and only to published events.
export async function toggleRsvp(fd: FormData) {
  const eventId = text(fd, "event_id");
  if (!UUID.test(eventId)) return;

  const user = await getCurrentUser();
  if (!user)
    redirect(`/login?next=${encodeURIComponent(`/events/${eventId}`)}`);

  const supabase = await supabaseForUser();
  const { data: existing, error: readError } = await supabase
    .from("rsvps")
    .select("event_id")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (readError) {
    console.error("RSVP lookup failed:", readError.message);
    throw new Error("Couldn't update your RSVP. Please try again.");
  }

  const { error } = existing
    ? await supabase
        .from("rsvps")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", user.id)
    : await supabase.from("rsvps").insert({ event_id: eventId });
  if (error) {
    console.error("RSVP update failed:", error.message);
    throw new Error("Couldn't update your RSVP. Please try again.");
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/account");
}

// --------------------------------------------------------- forgot password

// Emails a "reset your password" link. Always says the same thing, so nobody
// can use this form to find out which emails have accounts.
export async function requestPasswordReset(
  _prev: AuthState,
  fd: FormData,
): Promise<AuthState> {
  const email = text(fd, "email").toLowerCase();
  const t = (await getMessages()).errors;
  if (!EMAIL.test(email)) return { error: t.email, values: { email } };

  const supabase = await supabaseForUser();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/confirm?next=/reset-password`,
  });
  if (error && error.status === 429) {
    return {
      error: t.tooMany,
      values: { email },
    };
  }
  if (error) console.error("Password reset email failed:", error.message);

  return { notice: t.resetSent(email) };
}

// Sets a new password. Only works while logged in, which the emailed reset
// link does for you.
export async function updatePassword(
  _prev: AuthState,
  fd: FormData,
): Promise<AuthState> {
  const password =
    typeof fd.get("password") === "string"
      ? (fd.get("password") as string)
      : "";
  const confirm =
    typeof fd.get("confirm") === "string" ? (fd.get("confirm") as string) : "";
  const t = (await getMessages()).errors;
  const errors: Record<string, string> = {};
  if (password.length < 8) errors.password = t.passwordShort;
  else if (password.length > 72) errors.password = t.passwordLong;
  else if (password !== confirm) errors.confirm = t.mismatch;
  if (Object.keys(errors).length > 0) return { errors };

  if (!(await getCurrentUser())) {
    return { error: t.resetExpired };
  }
  const supabase = await supabaseForUser();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password")
      return {
        errors: { password: t.samePassword },
      };
    if (error.code === "weak_password")
      return { errors: { password: t.weakPassword } };
    console.error("Password update failed:", error.message);
    return { error: t.passwordFailed };
  }
  redirect("/account?password=updated");
}

// ---------------------------------------------------------- reminder emails

export async function setEmailReminders(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  const on = fd.get("on") === "yes";
  const supabase = await supabaseForUser();
  const { error } = await supabase
    .from("profiles")
    .update({ email_reminders: on })
    .eq("id", user.id);
  if (error) {
    console.error("Updating reminder setting failed:", error.message);
    throw new Error("Couldn't save your reminder setting. Please try again.");
  }
  revalidatePath("/account");
}

// ----------------------------------------------------------- delete account

export type DeleteState = { error?: string };

// Deletes the student's login. The database then removes everything linked
// to it automatically: profile (name, school), RSVPs, follows and organiser
// roles. Needs the full-access client: students can't delete logins themselves.
export async function deleteAccount(
  _prev: DeleteState,
  fd: FormData,
): Promise<DeleteState> {
  const t = (await getMessages()).account;
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  if (fd.get("confirm") !== "on") return { error: t.deleteFailed };

  const { error } = await supabaseAdmin().auth.admin.deleteUser(user.id);
  if (error) {
    console.error("Account deletion failed:", error.message);
    return { error: t.deleteFailed };
  }

  // Forget the login on this device.
  const supabase = await supabaseForUser();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/account/deleted");
}
