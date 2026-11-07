import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import { getEventById } from "@/lib/events";
import { SCHOOL_COOKIE, getSchool, getSchools } from "@/lib/schools";

// Supabase client that acts AS the logged-in student (their login is stored
// in cookies). The database's security rules then apply to them: they can
// only see/change their own profile and RSVPs.
export async function supabaseForUser() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // httpOnly: page scripts can't read the login (we only use it on the
      // server), so it can't be stolen by malicious code on a page.
      cookieOptions: {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
      },
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          // Pages can't set cookies (only actions can); the proxy keeps the
          // login fresh, so it's fine to skip here.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {}
        },
      },
    },
  );
}

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  schoolId: string | null;
};

// Who's logged in (or null). Checked with Supabase's servers, so it can't be
// faked by editing cookies. `cache` = checked once per page view.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // Always check at request time: the login check reads the clock (to see if
  // the session has expired), which Next.js doesn't allow while pre-building.
  await connection();
  const supabase = await supabaseForUser();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, school_id")
    .eq("id", data.user.id)
    .maybeSingle();

  return {
    id: data.user.id,
    email: data.user.email ?? "",
    fullName:
      profile?.full_name ??
      (data.user.user_metadata?.full_name as string) ??
      "Student",
    schoolId: profile?.school_id ?? null,
  };
});

// The school to theme pages like Log in / My events, in order of preference:
// the student's own school, the school of the page they came from (`next`),
// the one they picked on the front page, or the only school if there's one.
export async function schoolForVisitor(next?: string | null) {
  const user = await getCurrentUser();
  if (user?.schoolId) return getSchool(user.schoolId);
  const fromPage = next ? await schoolFromPath(next) : null;
  if (fromPage) return fromPage;
  const picked = (await cookies()).get(SCHOOL_COOKIE)?.value;
  if (picked) return getSchool(picked);
  const schools = await getSchools();
  return schools?.length === 1 ? schools[0] : null;
}

// "/concordia/submit" → Concordia; "/events/<id>" → that event's school.
async function schoolFromPath(path: string) {
  const event = /^\/events\/([0-9a-f-]{36})/i.exec(path);
  if (event) {
    const result = await getEventById(event[1]);
    return result.ok && result.event ? getSchool(result.event.school_id) : null;
  }
  const first = /^\/([a-z0-9-]{2,40})(?:\/|\?|$)/.exec(path);
  return first ? getSchool(first[1]) : null;
}

// Only allow redirects to our own pages (e.g. "/events/123"), never to
// another website.
export function safeNext(
  value: FormDataEntryValue | string | null | undefined,
) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") &&
    !next.startsWith("//") &&
    !next.startsWith("/\\")
    ? next
    : null;
}
