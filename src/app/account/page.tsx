import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import EventPageShell from "@/components/EventPageShell";
import {
  dateBadge,
  formatEventTime,
  formatPlace,
  hasEnded,
} from "@/lib/events";
import { getSchool } from "@/lib/schools";
import { getCurrentUser, supabaseForUser } from "@/lib/server/auth";
import { myOrganisations } from "@/lib/server/organisers";
import { SITE } from "@/lib/site";
import { logOut, setEmailReminders } from "./actions";

export const metadata: Metadata = {
  title: `My events · ${SITE.name}`,
  robots: { index: false },
};

export default function AccountPage(props: PageProps<"/account">) {
  return (
    <Suspense
      fallback={
        <EventPageShell>
          <div className="h-72 animate-pulse rounded-2xl bg-white" />
        </EventPageShell>
      }
    >
      <AccountContent {...props} />
    </Suspense>
  );
}

type MyEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  campus: string;
  location: string | null;
};

async function AccountContent({ searchParams }: PageProps<"/account">) {
  const query = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  const school = user.schoolId ? await getSchool(user.schoolId) : null;
  const organises = await myOrganisations();

  // My RSVPs, then the events they're for (soonest first).
  const supabase = await supabaseForUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("email_reminders")
    .eq("id", user.id)
    .maybeSingle();
  const reminders = profile?.email_reminders ?? true;
  const { data: rsvps } = await supabase
    .from("rsvps")
    .select("event_id")
    .eq("user_id", user.id);
  const ids = (rsvps ?? []).map((r) => r.event_id as string);
  let events: MyEvent[] = [];
  if (ids.length > 0) {
    const { data } = await supabase
      .from("events")
      .select("id, title, starts_at, ends_at, campus, location")
      .in("id", ids)
      .order("starts_at", { ascending: true });
    events = (data ?? []) as MyEvent[];
  }
  const now = new Date();
  const upcoming = events.filter((e) => !hasEnded(e, now));
  const past = events.filter((e) => hasEnded(e, now)).reverse();

  return (
    <EventPageShell school={school}>
      <div className="flex flex-col gap-5">
        {query.password === "updated" && (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            Your password has been changed.
          </p>
        )}
        <div>
          <h1 className="text-2xl font-bold">My events</h1>
          <p className="text-neutral-600">
            {user.fullName}
            {school ? ` · ${school.short_name}` : ""}
          </p>
        </div>

        <section>
          <h2 className="mb-2 font-semibold">Going</h2>
          {upcoming.length === 0 ? (
            <div className="rounded-2xl bg-white p-5 text-center text-sm text-neutral-600 shadow-sm ring-1 ring-black/5">
              You haven&apos;t RSVP&apos;d to anything yet.{" "}
              <Link
                href={school ? `/${school.id}` : "/"}
                className="font-semibold text-brand underline"
              >
                Browse events
              </Link>
            </div>
          ) : (
            <EventRows events={upcoming} />
          )}
        </section>

        {past.length > 0 && (
          <section>
            <h2 className="mb-2 font-semibold text-neutral-500">Past</h2>
            <EventRows events={past.slice(0, 20)} muted />
          </section>
        )}

        {organises.length > 0 && (
          <Link
            href="/organize"
            className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 active:bg-neutral-50"
          >
            <span>
              <span className="block font-semibold">Organiser dashboard</span>
              <span className="block text-sm text-neutral-600">
                {organises.map((o) => o.name).join(", ")}
              </span>
            </span>
            <span aria-hidden="true" className="text-neutral-400">
              ›
            </span>
          </Link>
        )}

        <form
          action={setEmailReminders}
          className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 text-sm shadow-sm ring-1 ring-black/5"
        >
          <input type="hidden" name="on" value={reminders ? "no" : "yes"} />
          <span>
            <span className="block font-semibold">Reminder emails</span>
            <span className="block text-neutral-600">
              {reminders
                ? "We'll email you the day before events you're going to."
                : "Off. You won't get reminder emails."}
            </span>
          </span>
          <button
            type="submit"
            role="switch"
            aria-checked={reminders}
            aria-label="Reminder emails"
            className={
              "relative h-8 w-14 shrink-0 rounded-full transition-colors " +
              (reminders ? "bg-brand" : "bg-neutral-300")
            }
          >
            <span
              className={
                "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all " +
                (reminders ? "left-7" : "left-1")
              }
            />
          </button>
        </form>

        <div className="rounded-2xl bg-white p-4 text-sm shadow-sm ring-1 ring-black/5">
          <p className="text-neutral-600">Logged in as {user.email}</p>
          <form action={logOut} className="mt-3">
            <button
              type="submit"
              className="min-h-11 w-full rounded-xl font-semibold text-red-700 ring-1 ring-red-200 active:bg-red-50"
            >
              Log out
            </button>
          </form>
        </div>
      </div>
    </EventPageShell>
  );
}

function EventRows({
  events,
  muted = false,
}: {
  events: MyEvent[];
  muted?: boolean;
}) {
  return (
    <ul
      className={
        "divide-y divide-neutral-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5" +
        (muted ? " opacity-70" : "")
      }
    >
      {events.map((e) => {
        const badge = dateBadge(e.starts_at);
        return (
          <li key={e.id}>
            <Link
              href={`/events/${e.id}`}
              className="flex min-h-16 items-center gap-3 p-3 active:bg-neutral-50"
            >
              <span
                aria-hidden="true"
                className="flex w-11 shrink-0 flex-col items-center rounded-lg bg-brand py-1 text-white"
              >
                <span className="text-[10px] font-semibold tracking-wider">
                  {badge.month}
                </span>
                <span className="text-lg font-bold leading-none">
                  {badge.day}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{e.title}</span>
                <span className="block truncate text-sm text-neutral-600">
                  {formatEventTime(e.starts_at, e.ends_at)}
                </span>
                <span className="block truncate text-xs text-neutral-500">
                  {formatPlace(e.campus, e.location)}
                </span>
              </span>
              <span aria-hidden="true" className="text-neutral-400">
                ›
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
