import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import EventPageShell from "@/components/EventPageShell";
import { dateBadge, formatEventTime, hasEnded } from "@/lib/events";
import { getRsvpCounts } from "@/lib/rsvps";
import { getSchool } from "@/lib/schools";
import { getCurrentUser } from "@/lib/server/auth";
import { type OrgEvent, organiserOf, orgEvents } from "@/lib/server/organisers";
import { SITE } from "@/lib/site";
import StatusBadge from "../StatusBadge";

export const metadata: Metadata = {
  title: `Organiser dashboard · ${SITE.name}`,
  robots: { index: false },
};

export default function OrgDashboard(props: PageProps<"/organize/[orgId]">) {
  return (
    <Suspense
      fallback={
        <EventPageShell>
          <div className="h-72 animate-pulse rounded-2xl bg-white" />
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
  const [school, events] = await Promise.all([
    getSchool(org.school_id),
    orgEvents(org.id),
  ]);
  const going = await getRsvpCounts(events.map((e) => e.id));
  const now = new Date();
  const upcoming = events.filter((e) => !hasEnded(e, now));
  const past = events
    .filter((e) => hasEnded(e, now))
    .reverse()
    .slice(0, 30);
  const deleted = (await searchParams).deleted === "1";

  return (
    <EventPageShell school={school}>
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
          <p className="rounded-xl bg-neutral-900 px-4 py-3 text-sm text-white">
            Event deleted.
          </p>
        )}

        <Link
          href={`/organize/${org.id}/new`}
          className="flex min-h-12 items-center justify-center rounded-xl bg-brand px-4 font-semibold text-white active:opacity-80"
        >
          + New event
        </Link>

        <section>
          <h2 className="mb-2 font-semibold">Upcoming ({upcoming.length})</h2>
          {upcoming.length === 0 ? (
            <p className="rounded-2xl bg-white p-5 text-center text-sm text-neutral-600 shadow-sm ring-1 ring-black/5">
              No upcoming events. Post one with &ldquo;New event&rdquo;.
            </p>
          ) : (
            <EventRows orgId={org.id} events={upcoming} going={going} />
          )}
        </section>

        {past.length > 0 && (
          <section>
            <h2 className="mb-2 font-semibold text-neutral-500">Past</h2>
            <EventRows orgId={org.id} events={past} going={going} past />
          </section>
        )}
      </div>
    </EventPageShell>
  );
}

function EventRows({
  orgId,
  events,
  going,
  past = false,
}: {
  orgId: string;
  events: OrgEvent[];
  going: Map<string, number>;
  past?: boolean;
}) {
  return (
    <ul
      className={
        "divide-y divide-neutral-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5" +
        (past ? " opacity-75" : "")
      }
    >
      {events.map((e) => {
        const badge = dateBadge(e.starts_at);
        const n = going.get(e.id) ?? 0;
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
