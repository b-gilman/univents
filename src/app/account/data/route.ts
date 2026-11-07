import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE } from "@/lib/i18n";
import { SCHOOL_COOKIE } from "@/lib/schools";
import { getCurrentUser, supabaseForUser } from "@/lib/server/auth";
import { SITE } from "@/lib/site";

// /account/data → "Download my data": a file with everything Kuku stores
// about the logged-in student. Read with the student's own login, so it
// can only ever contain their own information.
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/account", request.url));
  }

  const supabase = await supabaseForUser();
  const [profile, rsvps, follows, organiser] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, school_id, email_reminders, created_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("rsvps")
      .select(
        "created_at, event:events(title, starts_at, ends_at, campus, location)",
      )
      .eq("user_id", user.id)
      .order("created_at"),
    supabase
      .from("follows")
      .select("created_at, organization:organizations(name)")
      .eq("user_id", user.id)
      .order("created_at"),
    supabase
      .from("organization_members")
      .select("created_at, organization:organizations(name)")
      .eq("user_id", user.id),
  ]);

  // Never hand over an incomplete file that looks complete.
  const failed = [profile, rsvps, follows, organiser].find((r) => r.error);
  if (failed) {
    console.error("Data export failed:", failed.error!.message);
    return NextResponse.json(
      { error: "Couldn't prepare your data. Please try again in a minute." },
      { status: 503 },
    );
  }

  type Named = { name: string } | null;
  type Ev = {
    title: string;
    starts_at: string;
    ends_at: string | null;
    campus: string;
    location: string | null;
  } | null;

  const data = {
    about: `Everything ${SITE.name} stores about your account, as of the date below. Passwords are stored scrambled and can't be read by anyone, so yours isn't included.`,
    exported_at: new Date().toISOString(),
    account: {
      email: user.email,
      full_name: profile.data?.full_name ?? user.fullName,
      school: profile.data?.school_id ?? null,
      reminder_emails: profile.data?.email_reminders ?? null,
      created_at: profile.data?.created_at ?? null,
    },
    rsvps: (
      (rsvps.data ?? []) as unknown as { created_at: string; event: Ev }[]
    ).map((r) => ({
      event: r.event?.title ?? "(event no longer listed)",
      starts_at: r.event?.starts_at ?? null,
      ends_at: r.event?.ends_at ?? null,
      place: r.event
        ? [r.event.location, r.event.campus].filter(Boolean).join(" · ")
        : null,
      rsvped_at: r.created_at,
    })),
    clubs_followed: (
      (follows.data ?? []) as unknown as {
        created_at: string;
        organization: Named;
      }[]
    ).map((f) => ({ club: f.organization?.name ?? null, since: f.created_at })),
    clubs_organised: (
      (organiser.data ?? []) as unknown as {
        created_at: string;
        organization: Named;
      }[]
    ).map((o) => ({ club: o.organization?.name ?? null, since: o.created_at })),
    cookies_on_this_device: {
      language: request.cookies.get(LOCALE_COOKIE)?.value ?? null,
      school: request.cookies.get(SCHOOL_COOKIE)?.value ?? null,
    },
  };

  return new NextResponse(JSON.stringify(data, null, 2) + "\n", {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${SITE.name.toLowerCase()}-my-data.json"`,
      "Cache-Control": "no-store",
    },
  });
}
