import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { formatEventTime } from "@/lib/events";
import { getRsvpCounts } from "@/lib/rsvps";
import { getSchools } from "@/lib/schools";
import { isAdmin } from "@/lib/server/admin-auth";
import { upcomingCutoffIso } from "@/lib/server/admin-data";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import AdminShell from "../AdminShell";
import AdminTabs from "../AdminTabs";
import ConfirmButton from "../ConfirmButton";
import { adminDeleteEvent, adminSetEventStatus } from "../actions";

export const metadata: Metadata = {
  title: "Live events · Admin",
  robots: { index: false, follow: false },
};

export default function AdminEventsPage(props: PageProps<"/admin/events">) {
  return (
    <AdminShell>
      <AdminTabs current="events" />
      <Suspense fallback={<p className="text-neutral-500">Loading…</p>}>
        <Content {...props} />
      </Suspense>
    </AdminShell>
  );
}

type Row = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  status: string;
  school_id: string;
  organization_id: string | null;
};

async function Content({ searchParams }: PageProps<"/admin/events">) {
  if (!(await isAdmin())) redirect("/admin/login");
  const query = await searchParams;
  const showPast = query.show === "past";
  const db = supabaseAdmin();
  const nowIso = upcomingCutoffIso();

  // Published and hidden events; upcoming soonest first, or past newest first.
  let request = db
    .from("events")
    .select("id, title, starts_at, ends_at, status, school_id, organization_id")
    .in("status", ["published", "draft"]);
  request = showPast
    ? request.lt("starts_at", nowIso).order("starts_at", { ascending: false })
    : request.gte("starts_at", nowIso).order("starts_at", { ascending: true });
  const [{ data, error }, { data: orgs }, schools] = await Promise.all([
    request.limit(200),
    db.from("organizations").select("id, name"),
    getSchools(),
  ]);
  if (error) {
    return (
      <p className="rounded-2xl bg-red-50 p-4 text-red-800">
        Couldn&apos;t load events.
      </p>
    );
  }
  const events = (data ?? []) as Row[];
  const going = await getRsvpCounts(events.map((e) => e.id));
  const orgName = new Map(
    ((orgs ?? []) as { id: string; name: string }[]).map((o) => [o.id, o.name]),
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">
          {showPast ? "Past events" : "Upcoming events"}{" "}
          <span className="text-neutral-500">({events.length})</span>
        </h1>
        <Link
          href={showPast ? "/admin/events" : "/admin/events?show=past"}
          className="flex min-h-10 items-center text-sm font-semibold text-neutral-700 underline"
        >
          {showPast ? "Show upcoming" : "Show past"}
        </Link>
      </div>
      {query.deleted === "1" && (
        <p className="rounded-xl bg-ink px-4 py-3 text-sm text-white">
          Event deleted.
        </p>
      )}

      {events.length === 0 ? (
        <p className="rounded-2xl bg-card p-6 text-center text-neutral-600 shadow-sm ring-1 ring-black/5">
          No events.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {events.map((e) => {
            const school = schools?.find((s) => s.id === e.school_id);
            const hidden = e.status === "draft";
            return (
              <li
                key={e.id}
                className={
                  "rounded-2xl bg-card p-3 text-sm shadow-sm ring-1 ring-black/5" +
                  (hidden ? " opacity-70" : "")
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5">
                      {school && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                          style={{ backgroundColor: school.primary_color }}
                        >
                          {school.short_name}
                        </span>
                      )}
                      {hidden && (
                        <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] font-semibold">
                          Hidden
                        </span>
                      )}
                    </p>
                    <p className="mt-1 font-semibold">{e.title}</p>
                    <p className="text-neutral-600">
                      {formatEventTime(e.starts_at, e.ends_at)}
                    </p>
                    <p className="text-neutral-500">
                      {e.organization_id
                        ? orgName.get(e.organization_id)
                        : "No club"}
                      {(going.get(e.id) ?? 0) > 0 &&
                        ` · 👥 ${going.get(e.id)} going`}
                    </p>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <Link
                    href={`/admin/events/${e.id}`}
                    className="flex min-h-10 items-center justify-center rounded-lg font-semibold ring-1 ring-black/15 active:bg-neutral-100"
                  >
                    Edit
                  </Link>
                  <form action={adminSetEventStatus}>
                    <input type="hidden" name="event_id" value={e.id} />
                    <input
                      type="hidden"
                      name="status"
                      value={hidden ? "published" : "draft"}
                    />
                    <button
                      type="submit"
                      className="min-h-10 w-full rounded-lg font-semibold ring-1 ring-black/15 active:bg-neutral-100"
                    >
                      {hidden ? "Show" : "Hide"}
                    </button>
                  </form>
                  <form action={adminDeleteEvent}>
                    <input type="hidden" name="event_id" value={e.id} />
                    <ConfirmButton
                      message={`Delete “${e.title}”? This can't be undone, and its RSVPs are removed too.`}
                      className="min-h-10 w-full rounded-lg font-semibold text-red-700 ring-1 ring-red-200 active:bg-red-50"
                    >
                      Delete
                    </ConfirmButton>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
