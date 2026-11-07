import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "@/lib/server/locale";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import ClubProfileForm from "@/components/ClubProfileForm";
import EventPageShell from "@/components/EventPageShell";
import { getClub, getFollowerCount } from "@/lib/clubs";
import { dateBadge, formatDay, formatEventTime, hasEnded } from "@/lib/events";
import { getRsvpCounts } from "@/lib/rsvps";
import { getSchool } from "@/lib/schools";
import ConfirmButton from "@/app/admin/ConfirmButton";
import { getCurrentUser, supabaseForUser } from "@/lib/server/auth";
import {
  type OrgEvent,
  clubEventViews,
  organiserOf,
  orgEvents,
} from "@/lib/server/organisers";
import { SITE } from "@/lib/site";
import StatusBadge from "../StatusBadge";
import { messageFollowers, updateClubProfile } from "../actions";

export const metadata: Metadata = {
  title: `Organiser dashboard · ${SITE.name}`,
  robots: { index: false },
};

export default function OrgDashboard(props: PageProps<"/organize/[orgId]">) {
  return (
    <Suspense
      fallback={
        <EventPageShell>
          <div className="h-72 animate-pulse rounded-2xl bg-card" />
        </EventPageShell>
      }
    >
      <Content {...props} />
    </Suspense>
  );
}

async function Content({
  params,
  searchParams,
}: PageProps<"/organize/[orgId]">) {
  const { orgId } = await params;
  if (!(await getCurrentUser())) redirect(`/login?next=/organize/${orgId}`);
  const access = await organiserOf(orgId);
  if (!access) notFound();
  const { org } = access;
  const [school, events, clubResult, views, followers] = await Promise.all([
    getSchool(org.school_id),
    orgEvents(org.id),
    getClub(org.id),
    clubEventViews(org.id),
    getFollowerCount(org.id),
  ]);
  const club = clubResult.ok ? clubResult.club : null;
  const going = await getRsvpCounts(events.map((e) => e.id));
  const now = new Date();
  const upcoming = events.filter((e) => !hasEnded(e, now));
  const views7 = [...views.values()].reduce((sum, v) => sum + v.last7, 0);
  const goingUpcoming = upcoming.reduce(
    (sum, e) => sum + (going.get(e.id) ?? 0),
    0,
  );
  const past = events
    .filter((e) => hasEnded(e, now))
    .reverse()
    .slice(0, 30);
  const query = await searchParams;
  const deleted = query.deleted === "1";
  const profileSaved = query.profile === "saved";
  const messageSent =
    typeof query.message_sent === "string" ? Number(query.message_sent) : 0;
  const messageError =
    typeof query.message_error === "string" ? query.message_error : null;
  // Messages this club already sent (empty until the stats update is run).
  const { data: sentMessages } = await (await supabaseForUser())
    .from("club_messages")
    .select("id, title, recipients, created_at")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false })
    .limit(3);
  const profileError =
    typeof query.profile_error === "string" ? query.profile_error : null;

  return (
    <EventPageShell
      school={school}
      locale={await getLocale()}
      languageSwitch={false}
    >
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-sm font-medium text-neutral-500">
            Organiser dashboard
          </p>
          <h1 className="text-2xl font-bold">{org.name}</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {org.verified
              ? "✓ Verified club: your events go live as soon as you post them."
              : "Your events go live after a quick review by the admin."}
          </p>
        </div>
        {deleted && (
          <p className="rounded-xl bg-ink px-4 py-3 text-sm text-white">
            Event deleted.
          </p>
        )}

        {/* At a glance */}
        <dl className="grid grid-cols-3 divide-x divide-neutral-100 rounded-2xl bg-card py-3 text-center shadow-sm ring-1 ring-black/5">
          <Stat label="Followers" value={followers} />
          <Stat label="Views, 7 days" value={views7} />
          <Stat label="Going (upcoming)" value={goingUpcoming} />
        </dl>

        <Link
          href={`/organize/${org.id}/new`}
          className="flex min-h-12 items-center justify-center rounded-xl bg-brand px-4 font-semibold text-white active:opacity-80"
        >
          + New event
        </Link>

        {/* Message followers */}
        <details
          id="message"
          open={Boolean(messageError || messageSent)}
          className="rounded-2xl bg-card shadow-sm ring-1 ring-black/5"
        >
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
            <span>
              <span className="block font-semibold">Message followers</span>
              <span className="block text-sm text-neutral-600">
                {messageSent
                  ? `✓ Sent to ${messageSent} ${messageSent === 1 ? "follower" : "followers"}.`
                  : "Email a short update: a room change, sign-ups opening…"}
              </span>
            </span>
            <span className="text-sm font-semibold text-brand">Write</span>
          </summary>
          <div className="flex flex-col gap-3 border-t border-black/10 p-4 text-sm">
            {messageError && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 px-4 py-3 text-red-800"
              >
                {messageError}
              </p>
            )}
            <form action={messageFollowers} className="flex flex-col gap-3">
              <input type="hidden" name="org_id" value={org.id} />
              <label className="flex flex-col gap-1">
                <span className="font-medium">Title</span>
                <input
                  name="title"
                  required
                  maxLength={80}
                  placeholder="e.g. Tonight's meeting moved to H-110"
                  className={INPUT}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-medium">Message</span>
                <textarea
                  name="body"
                  required
                  rows={4}
                  maxLength={1000}
                  className={INPUT}
                />
              </label>
              <p className="text-xs text-neutral-500">
                Your club has {followers}{" "}
                {followers === 1 ? "follower" : "followers"}; those with emails
                turned on will get it. One message per day. Their email
                addresses stay private.
              </p>
              <ConfirmButton
                message={`Email this to your club's followers now?`}
                className="min-h-11 rounded-xl bg-brand px-4 font-semibold text-white active:opacity-80"
              >
                Send to followers
              </ConfirmButton>
            </form>
            {(sentMessages ?? []).length > 0 && (
              <div>
                <p className="mt-1 font-medium text-neutral-500">Sent</p>
                <ul className="mt-1 divide-y divide-neutral-100">
                  {(
                    sentMessages as {
                      id: string;
                      title: string;
                      recipients: number;
                      created_at: string;
                    }[]
                  ).map((m) => (
                    <li key={m.id} className="flex justify-between gap-3 py-2">
                      <span className="truncate">{m.title}</span>
                      <span className="shrink-0 text-neutral-500">
                        {formatDay(m.created_at)} · to {m.recipients}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>

        {club && (
          <details
            open={Boolean(profileError)}
            className="rounded-2xl bg-card shadow-sm ring-1 ring-black/5"
          >
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
              <span>
                <span className="block font-semibold">Club page</span>
                <span className="block text-sm text-neutral-600">
                  {profileSaved
                    ? "✓ Saved."
                    : "Logo, description and Instagram that students see."}
                </span>
              </span>
              <span className="text-sm font-semibold text-brand">Edit</span>
            </summary>
            <div className="flex flex-col gap-3 border-t border-black/10 p-4">
              {profileError && (
                <p
                  role="alert"
                  className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800"
                >
                  {profileError}
                </p>
              )}
              <Link
                href={`/clubs/${club.id}`}
                className="self-start text-sm font-semibold text-brand underline"
              >
                View your club page →
              </Link>
              <ClubProfileForm action={updateClubProfile} club={club} />
            </div>
          </details>
        )}

        <section>
          <h2 className="mb-2 font-semibold">Upcoming ({upcoming.length})</h2>
          {upcoming.length === 0 ? (
            <p className="rounded-2xl bg-card p-5 text-center text-sm text-neutral-600 shadow-sm ring-1 ring-black/5">
              No upcoming events. Post one with &ldquo;New event&rdquo;.
            </p>
          ) : (
            <EventRows
              orgId={org.id}
              events={upcoming}
              going={going}
              views={views}
            />
          )}
        </section>

        {past.length > 0 && (
          <section>
            <h2 className="mb-2 font-semibold text-neutral-500">Past</h2>
            <EventRows
              orgId={org.id}
              events={past}
              going={going}
              views={views}
              past
            />
          </section>
        )}
      </div>
    </EventPageShell>
  );
}

const INPUT =
  "block min-h-11 w-full rounded-xl border-0 bg-card px-3 py-2 text-base ring-1 ring-black/15 focus:outline-none focus:ring-2 focus:ring-brand";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col-reverse px-2">
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="text-2xl font-bold">{value}</dd>
    </div>
  );
}

function EventRows({
  orgId,
  events,
  going,
  views,
  past = false,
}: {
  orgId: string;
  events: OrgEvent[];
  going: Map<string, number>;
  views: Map<string, { total: number; last7: number }>;
  past?: boolean;
}) {
  return (
    <ul
      className={
        "divide-y divide-neutral-100 overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-black/5" +
        (past ? " opacity-75" : "")
      }
    >
      {events.map((e) => {
        const badge = dateBadge(e.starts_at);
        const n = going.get(e.id) ?? 0;
        const seen = views.get(e.id)?.total ?? 0;
        return (
          <li key={e.id}>
            <Link
              href={`/organize/${orgId}/events/${e.id}`}
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
                <span className="mt-1 flex items-center gap-2 text-xs text-neutral-600">
                  <StatusBadge status={e.status} />
                  {seen > 0 && (
                    <span>
                      👁 {seen} {seen === 1 ? "view" : "views"}
                    </span>
                  )}
                  {n > 0 && (
                    <span>
                      👥 {n} {past ? "went" : "going"}
                    </span>
                  )}
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
