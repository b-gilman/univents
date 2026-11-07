import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { TIME_ZONE, formatEventTime } from "@/lib/events";
import { isAdmin } from "@/lib/server/admin-auth";
import { loadGroup } from "@/lib/server/admin-data";
import { allCampuses, getSchool } from "@/lib/schools";
import { CATEGORIES, LIMITS } from "@/lib/submission-rules";
import AdminShell from "../AdminShell";
import { updateSubmission } from "../actions";

export const metadata: Metadata = {
  title: "Edit submission · Admin",
  robots: { index: false, follow: false },
};

export default function EditSubmissionPage(
  props: PageProps<"/admin/[submissionId]">,
) {
  return (
    <AdminShell>
      <Link
        href="/admin"
        className="mb-3 inline-flex min-h-11 items-center font-semibold text-brand"
      >
        ← Back to review
      </Link>
      <Suspense fallback={<p className="text-neutral-500">Loading…</p>}>
        <EditForm {...props} />
      </Suspense>
    </AdminShell>
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

async function EditForm({
  params,
  searchParams,
}: PageProps<"/admin/[submissionId]">) {
  if (!(await isAdmin())) redirect("/admin/login");
  const { submissionId } = await params;
  const error = (await searchParams).error;
  const group = await loadGroup(submissionId);
  if (!group) notFound();

  const e = group.events[0];
  const school = await getSchool(e.school_id);
  const campuses = school ? allCampuses(school) : [e.campus];
  const single = group.events.length === 1;
  const priceType =
    e.price_cents === null ? "unknown" : e.price_cents === 0 ? "free" : "paid";

  return (
    <form
      action={updateSubmission}
      className="flex flex-col gap-4 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-black/5"
    >
      <input type="hidden" name="submission_id" value={group.key} />
      <h1 className="text-xl font-bold">Edit before approving</h1>
      {school && (
        <p className="-mt-3 text-sm text-neutral-500">{school.name}</p>
      )}
      {typeof error === "string" && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      {group.submission && (
        <Field label="Club name">
          <input
            name="club_name"
            required
            defaultValue={group.submission.org_name}
            maxLength={LIMITS.clubName}
            className={input}
          />
        </Field>
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
          rows={6}
          maxLength={LIMITS.description}
          defaultValue={e.description ?? ""}
          className={input}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <select name="category" defaultValue={e.category} className={input}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
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

      {single ? (
        <>
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
        </>
      ) : (
        <div className="rounded-xl bg-neutral-50 p-3 text-sm text-neutral-700">
          <p className="font-medium">
            {group.events.length} dates (can&apos;t be edited here)
          </p>
          <ul>
            {group.events.map((d) => (
              <li key={d.id}>{formatEventTime(d.starts_at, d.ends_at)}</li>
            ))}
          </ul>
          <p className="mt-1 text-neutral-500">
            If these are wrong, reject it and ask the club to resubmit.
          </p>
        </div>
      )}

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
              {t === "unknown" ? "TBA" : t[0].toUpperCase() + t.slice(1)}
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

      <Field label="Sign-up / ticket link">
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
        className="min-h-12 rounded-xl bg-ink px-4 font-semibold text-white active:opacity-80"
      >
        Save changes
      </button>
      <p className="-mt-2 text-center text-xs text-neutral-500">
        Saving keeps it waiting for review. Approve it on the review page.
      </p>
    </form>
  );
}

const input =
  "block min-h-11 w-full rounded-xl border-0 bg-card px-3 py-2 text-base ring-1 ring-black/15 focus:outline-none focus:ring-2 focus:ring-brand";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
