import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import ClubLogo from "@/components/ClubLogo";
import DeleteAccountForm from "@/components/DeleteAccountForm";
import EventPageShell from "@/components/EventPageShell";
import {
  dateBadge,
  formatEventTime,
  formatPlace,
  hasEnded,
} from "@/lib/events";
import { type Locale, messages } from "@/lib/i18n";
import { getSchool } from "@/lib/schools";
import { getCurrentUser, supabaseForUser } from "@/lib/server/auth";
import { getLocale } from "@/lib/server/locale";
import { myOrganisations } from "@/lib/server/organisers";
import { SITE } from "@/lib/site";
import { supabase as publicDb } from "@/lib/supabase";
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
          <div className="h-72 animate-pulse rounded-2xl bg-card" />
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
  organization_name?: string | null;
};

type FollowedClub = { id: string; name: string; logo_url: string | null };

async function AccountContent({ searchParams }: PageProps<"/account">) {
  const query = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  const [school, organises, locale] = await Promise.all([
    user.schoolId ? getSchool(user.schoolId) : null,
    myOrganisations(),
    getLocale(),
  ]);
  const t = messages(locale);

  // My RSVPs, then the events they're for (soonest first).
  const supabase = await supabaseForUser();
  const [{ data: profile }, { data: rsvps }, { data: follows }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("email_reminders")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("rsvps").select("event_id").eq("user_id", user.id),
      // Empty (not an error page) if the clubs update hasn't been run yet.
      supabase
        .from("follows")
        .select("organization:organizations(id, name, logo_url)")
        .eq("user_id", user.id),
    ]);
  const reminders = profile?.email_reminders ?? true;
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

  // Clubs I follow, and their next events (that I'm not already going to).
  const clubs = (
    (follows ?? []) as unknown as { organization: FollowedClub | null }[]
  )
    .map((f) => f.organization)
    .filter((c): c is FollowedClub => Boolean(c))
    .sort((a, b) => a.name.localeCompare(b.name));
  let fromClubs: MyEvent[] = [];
  if (clubs.length > 0) {
    const { data } = await publicDb
      .from("upcoming_events")
      .select(
        "id, title, starts_at, ends_at, campus, location, organization_name",
      )
      .in(
        "organization_id",
        clubs.map((c) => c.id),
      )
      .limit(30);
    fromClubs = ((data ?? []) as MyEvent[])
      .filter((e) => !ids.includes(e.id))
      .slice(0, 10);
  }
  const clubsHref = school ? `/${school.id}/clubs` : "/";

  return (
    <EventPageShell school={school} locale={locale}>
      <div className="flex flex-col gap-5">
        {query.password === "updated" && (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            {t.account.passwordChanged}
          </p>
        )}
        <div>
          <h1 className="text-2xl font-bold">{t.account.title}</h1>
          <p className="text-neutral-600">
            {user.fullName}
            {school ? ` · ${school.short_name}` : ""}
          </p>
        </div>

        <section>
          <h2 className="mb-2 font-semibold">{t.account.going}</h2>
          {upcoming.length === 0 ? (
            <div className="rounded-2xl bg-card p-5 text-center text-sm text-neutral-600 shadow-sm ring-1 ring-black/5">
              {t.account.nothingYet}{" "}
              <Link
                href={school ? `/${school.id}` : "/"}
                className="font-semibold text-brand underline"
              >
                {t.account.browse}
              </Link>
            </div>
          ) : (
            <EventRows events={upcoming} locale={locale} />
          )}
        </section>

        <section>
          <h2 className="mb-2 font-semibold">{t.account.fromClubs}</h2>
          {clubs.length === 0 ? (
            <div className="rounded-2xl bg-card p-5 text-center text-sm text-neutral-600 shadow-sm ring-1 ring-black/5">
              {t.account.noFollows}{" "}
              <Link
                href={clubsHref}
                className="font-semibold text-brand underline"
              >
                {t.account.findClubs}
              </Link>
            </div>
          ) : fromClubs.length === 0 ? (
            <p className="rounded-2xl bg-card p-5 text-center text-sm text-neutral-600 shadow-sm ring-1 ring-black/5">
              {t.clubs.noUpcoming}
            </p>
          ) : (
            <EventRows events={fromClubs} locale={locale} showClub />
          )}
        </section>

        {clubs.length > 0 && (
          <section>
            <h2 className="mb-2 font-semibold">{t.account.followedClubs}</h2>
            <ul className="flex flex-wrap gap-2">
              {clubs.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/clubs/${c.id}`}
                    className="flex min-h-11 items-center gap-2 rounded-full bg-card py-1 pr-4 pl-1 text-sm font-semibold ring-1 ring-black/10 active:bg-neutral-50"
                  >
                    <ClubLogo name={c.name} logoUrl={c.logo_url} size="sm" />
                    <span className="max-w-[14rem] truncate">{c.name}</span>
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={clubsHref}
                  className="flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-brand active:underline"
                >
                  + {t.account.findClubs}
                </Link>
              </li>
            </ul>
          </section>
        )}

        {past.length > 0 && (
          <section>
            <h2 className="mb-2 font-semibold text-neutral-500">
              {t.account.past}
            </h2>
            <EventRows events={past.slice(0, 20)} locale={locale} muted />
          </section>
        )}

        {organises.length > 0 && (
          <Link
            href="/organize"
            className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-black/5 active:bg-neutral-50"
          >
            <span>
              <span className="block font-semibold">{t.account.organiser}</span>
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
          className="flex items-center justify-between gap-3 rounded-2xl bg-card p-4 text-sm shadow-sm ring-1 ring-black/5"
        >
          <input type="hidden" name="on" value={reminders ? "no" : "yes"} />
          <span>
            <span className="block font-semibold">{t.account.reminders}</span>
            <span className="block text-neutral-600">
              {reminders ? t.account.remindersOn : t.account.remindersOff}
            </span>
          </span>
          <button
            type="submit"
            role="switch"
            aria-checked={reminders}
            aria-label={t.account.reminders}
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

        <div className="rounded-2xl bg-card p-4 text-sm shadow-sm ring-1 ring-black/5">
          <p className="text-neutral-600">{t.account.loggedInAs(user.email)}</p>
          <form action={logOut} className="mt-3">
            <button
              type="submit"
              className="min-h-11 w-full rounded-xl font-semibold text-red-700 ring-1 ring-red-200 active:bg-red-50"
            >
              {t.account.logOut}
            </button>
          </form>
        </div>

        <section className="rounded-2xl bg-card p-4 text-sm shadow-sm ring-1 ring-black/5">
          <h2 className="font-semibold">{t.account.yourData}</h2>
          {/* A normal link (not <Link>): it downloads a file. */}
          <a
            href="/account/data"
            download
            className="mt-2 flex min-h-11 items-center justify-between gap-3 rounded-xl px-1 active:bg-neutral-50"
          >
            <span>
              <span className="block font-semibold text-brand">
                {t.account.downloadData}
              </span>
              <span className="block text-neutral-600">
                {t.account.downloadHint}
              </span>
            </span>
            <span aria-hidden="true" className="text-neutral-400">
              ↓
            </span>
          </a>
          <div className="mt-2 border-t border-black/10 pt-2">
            <DeleteAccountForm locale={locale} />
          </div>
        </section>
      </div>
    </EventPageShell>
  );
}

function EventRows({
  events,
  locale,
  muted = false,
  showClub = false,
}: {
  events: MyEvent[];
  locale: Locale;
  muted?: boolean;
  showClub?: boolean; // show the club's name instead of the place
}) {
  return (
    <ul
      className={
        "divide-y divide-neutral-100 overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-black/5" +
        (muted ? " opacity-70" : "")
      }
    >
      {events.map((e) => {
        const badge = dateBadge(e.starts_at, locale);
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
                  {formatEventTime(e.starts_at, e.ends_at, locale)}
                </span>
                <span className="block truncate text-xs text-neutral-500">
                  {showClub && e.organization_name
                    ? e.organization_name
                    : formatPlace(e.campus, e.location, locale)}
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
