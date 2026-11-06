import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import ConfirmButton from "@/app/admin/ConfirmButton";
import EventPageShell from "@/components/EventPageShell";
import { TIME_ZONE, formatEventTime } from "@/lib/events";
import { allCampuses, getSchool } from "@/lib/schools";
import { getCurrentUser } from "@/lib/server/auth";
import { attendees, organiserOf, orgEvents } from "@/lib/server/organisers";
import { SITE } from "@/lib/site";
import { CATEGORIES, LIMITS } from "@/lib/submission-rules";
import { deleteOrgEvent, updateOrgEvent } from "../../../actions";
import StatusBadge from "../../../StatusBadge";

export const metadata: Metadata = {
  title: `Manage event · ${SITE.name}`,
  robots: { index: false },
};

export default function ManageEventPage(
  props: PageProps<"/organize/[orgId]/events/[eventId]">,
) {
  return (
    <Suspense
      fallback={
        <EventPageShell>
          <div className="h-96 animate-pulse rounded-2xl bg-white" />
        </EventPageShell>
      }
    >
      <Content {...props} />
    </Suspense>
  );
}

const day = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const clock = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

async function Content({
  params,
  searchParams,
}: PageProps<"/organize/[orgId]/events/[eventId]">) {
  const { orgId, eventId } = await params;
  const query = await searchParams;
  if (!(await getCurrentUser()))
    redirect(`/login?next=/organize/${orgId}/events/${eventId}`);
  const access = await organiserOf(orgId);
  if (!access) notFound();
  const { org } = access;
  const events = await orgEvents(org.id);
  const e = events.find((x) => x.id === eventId);
  if (!e) notFound();
  const [school, people] = await Promise.all([
    getSchool(org.school_id),
    attendees(e.id),
  ]);
  const campuses = school ? allCampuses(school) : [e.campus];
  const seriesCount = e.submission_id
    ? events.filter((x) => x.submission_id === e.submission_id).length
    : 1;
  const priceType =
    e.price_cents === null ? "unknown" : e.price_cents === 0 ? "free" : "paid";
  const hidden = (
    <>
      <input type="hidden" name="org_id" value={org.id} />
      <input type="hidden" name="event_id" value={e.id} />
    </>
  );

  return (
    <EventPageShell school={school}>
      <div className="flex flex-col gap-5">
        <Link
          href={`/organize/${org.id}`}
          className="inline-flex min-h-11 items-center font-semibold text-brand"
        >
          ← {org.name}
        </Link>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{e.title}</h1>
            <StatusBadge status={e.status} />
          </div>
          <p className="text-neutral-600">
            {formatEventTime(e.starts_at, e.ends_at)}
          </p>
          {e.status === "published" && (
            <Link
              href={`/events/${e.id}`}
              className="text-sm font-semibold text-brand underline"
            >
              View public page
            </Link>
          )}
        </div>
        {query.saved === "1" && (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            Changes saved.
          </p>
        )}
        {typeof query.error === "string" && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {query.error}
          </p>
        )}

        {/* Who's coming */}
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <h2 className="font-semibold">Who&apos;s coming ({people.length})</h2>
          {people.length === 0 ? (
            <p className="mt-1 text-sm text-neutral-600">No RSVPs yet.</p>
          ) : (
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
              {people.map((p, i) => (
                <li key={i}>{p.full_name}</li>
              ))}
            </ol>
          )}
        </section>

        {/* Edit */}
        <form
          action={updateOrgEvent}
          encType="multipart/form-data"
          className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
        >
          {hidden}
          <h2 className="font-semibold">Edit this date</h2>
          {!org.verified && (
            <p className="-mt-2 text-sm text-neutral-600">
              Saving sends it back for a quick admin review.
            </p>
          )}
          <Field label="Event name">
            <input
              name="title"
              required
              minLength={3}
              maxLength={LIMITS.title}
              defaultValue={e.title}
              className={input}
            />
          </Field>
          <Field label="Description">
            <textarea
              name="description"
              rows={5}
              maxLength={LIMITS.description}
              defaultValue={e.description ?? ""}
              className={input}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select
                name="category"
                defaultValue={e.category}
                className={input}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c[0].toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Campus">
              <select name="campus" defaultValue={e.campus} className={input}>
                {campuses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Building and room">
            <input
              name="location"
              maxLength={LIMITS.location}
              defaultValue={e.location ?? ""}
              className={input}
            />
          </Field>
          <Field label="Date">
            <input
              name="date"
              type="date"
              required
              defaultValue={day.format(new Date(e.starts_at))}
              className={input}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts">
              <input
                name="start_time"
                type="time"
                required
                defaultValue={clock.format(new Date(e.starts_at))}
                className={input}
              />
            </Field>
            <Field label="Ends">
              <input
                name="end_time"
                type="time"
                defaultValue={
                  e.ends_at ? clock.format(new Date(e.ends_at)) : ""
                }
                className={input}
              />
            </Field>
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Price</legend>
            <div className="flex gap-4">
              {(["free", "paid", "unknown"] as const).map((t) => (
                <label key={t} className="flex min-h-11 items-center gap-2">
                  <input
                    type="radio"
                    name="price_type"
                    value={t}
                    defaultChecked={priceType === t}
                    className="h-5 w-5 accent-brand"
                  />
                  {t === "unknown"
                    ? "Not sure yet"
                    : t[0].toUpperCase() + t.slice(1)}
                </label>
              ))}
            </div>
            <input
              name="price"
              inputMode="decimal"
              placeholder="Amount in $ (if paid)"
              defaultValue={e.price_cents ? String(e.price_cents / 100) : ""}
              className={input}
            />
          </fieldset>
          <Field label="Sign-up or ticket link">
            <input
              name="signup_url"
              type="url"
              defaultValue={e.signup_url ?? ""}
              className={input}
            />
          </Field>
          <Field label="Instagram post link">
            <input
              name="info_url"
              type="url"
              defaultValue={e.info_url ?? ""}
              className={input}
            />
          </Field>
          <Field label="Replace poster (optional)">
            <input
              name="poster"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="block w-full text-sm"
            />
          </Field>
          {e.image_url && (
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="remove_poster"
                value="yes"
                className="h-5 w-5 accent-brand"
              />
              Remove the poster
            </label>
          )}
          <button
            type="submit"
            className="min-h-12 rounded-xl bg-brand px-4 font-semibold text-white active:opacity-80"
          >
            Save changes
          </button>
          {seriesCount > 1 && (
            <p className="-mt-2 text-center text-xs text-neutral-500">
              This is one of {seriesCount} dates; changes apply to this date
              only.
            </p>
          )}
        </form>

        {/* Delete */}
        <section className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <h2 className="font-semibold">Delete</h2>
          <form action={deleteOrgEvent}>
            {hidden}
            <input type="hidden" name="scope" value="one" />
            <ConfirmButton
              message={`Delete “${e.title}” on this date? RSVPs for it will be removed too.`}
              className="min-h-11 w-full rounded-xl font-semibold text-red-700 ring-1 ring-red-200 active:bg-red-50"
            >
              Delete this date
            </ConfirmButton>
          </form>
          {seriesCount > 1 && (
            <form action={deleteOrgEvent}>
              {hidden}
              <input type="hidden" name="scope" value="series" />
              <ConfirmButton
                message={`Delete ALL ${seriesCount} dates of “${e.title}”? RSVPs will be removed too.`}
                className="min-h-11 w-full rounded-xl font-semibold text-red-700 ring-1 ring-red-200 active:bg-red-50"
              >
                Delete all {seriesCount} dates
              </ConfirmButton>
            </form>
          )}
        </section>
      </div>
    </EventPageShell>
  );
}

const input =
  "block min-h-11 w-full rounded-xl border-0 bg-white px-3 py-2 text-base ring-1 ring-black/15 focus:outline-none focus:ring-2 focus:ring-brand";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
