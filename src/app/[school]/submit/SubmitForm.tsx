"use client";

// The "Submit an event" form. Runs in the browser so it can show/hide options
// as you fill it in, and shrink large photos before uploading them.

import Link from "next/link";
import {
  startTransition,
  useActionState,
  useState,
  type ReactNode,
} from "react";
import { submitEvent } from "./actions";
import {
  CATEGORIES,
  LIMITS,
  WEEKDAYS,
  type SubmitState,
} from "@/lib/submission-rules";

const initial: SubmitState = { status: "idle" };

// Used two ways:
//  - public form (/school/submit): anyone, goes to the admin for review
//  - organiser form: a club's organiser posting for their club (`organisation`
//    set, `action` = the organiser action). Verified clubs publish instantly.
export default function SubmitForm({
  schoolId,
  campuses,
  action: serverAction = submitEvent,
  organisation,
}: {
  schoolId: string;
  campuses: string[];
  action?: (prev: SubmitState, fd: FormData) => Promise<SubmitState>;
  organisation?: { id: string; name: string; verified: boolean };
}) {
  const [state, dispatch, pending] = useActionState(serverAction, initial);
  const [preparing, setPreparing] = useState(false);

  const values = state.status === "error" ? state.values : {};
  const errors = state.status === "error" ? state.errors : {};
  const v = (key: string) =>
    typeof values[key] === "string" ? (values[key] as string) : "";

  const [repeats, setRepeats] = useState(v("repeats") === "weekly");
  const [priceType, setPriceType] = useState(v("price_type") || "free");

  if (state.status === "success")
    return (
      <Success
        title={state.title}
        dates={state.dates}
        published={Boolean(state.published)}
        backHref={
          organisation ? `/organize/${organisation.id}` : `/${schoolId}`
        }
        backLabel={
          organisation ? `Back to ${organisation.name}` : "Back to all events"
        }
      />
    );

  // Before sending: shrink big photos so they upload fast and fit the limit.
  async function action(fd: FormData) {
    const poster = fd.get("poster");
    if (poster instanceof File && poster.size > 0) {
      setPreparing(true);
      fd.set("poster", await shrinkImage(poster));
      setPreparing(false);
    }
    startTransition(() => dispatch(fd));
  }

  const busy = pending || preparing;

  return (
    <form action={action} className="flex flex-col gap-6">
      {state.status === "error" && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
        >
          {state.message}
          {errors.poster === undefined && Object.keys(errors).length > 0 && (
            <> If you added a poster, please attach it again.</>
          )}
        </p>
      )}

      <input type="hidden" name="school" value={schoolId} />
      {organisation && (
        <input type="hidden" name="org_id" value={organisation.id} />
      )}
      {organisation && (
        <p className="rounded-xl bg-white px-4 py-3 text-sm text-neutral-700 ring-1 ring-black/5">
          Posting as <strong>{organisation.name}</strong>.{" "}
          {organisation.verified
            ? "Your club is verified, so the event goes live right away."
            : "It'll go live after a quick review by the Univents admin."}
        </p>
      )}

      {!organisation && (
        <>
          {/* Spam trap: hidden from people, bots fill it in. */}
          <div
            aria-hidden="true"
            className="absolute -left-[9999px] h-px w-px overflow-hidden"
          >
            <label>
              Website{" "}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
              />
            </label>
          </div>

          <Section title="Your club">
            <Field label="Club or organization" error={errors.club_name}>
              <input
                name="club_name"
                required
                maxLength={LIMITS.clubName}
                defaultValue={v("club_name")}
                placeholder="e.g. Chess Club"
                className={inputClass}
              />
            </Field>
            <Field
              label="Contact email"
              hint="Only you and the site admin see this."
              error={errors.contact_email}
            >
              <input
                name="contact_email"
                type="email"
                required
                maxLength={LIMITS.email}
                defaultValue={v("contact_email")}
                autoComplete="email"
                inputMode="email"
                className={inputClass}
              />
            </Field>
          </Section>
        </>
      )}

      <Section title="The event">
        <Field label="Event name" error={errors.title}>
          <input
            name="title"
            required
            minLength={3}
            maxLength={LIMITS.title}
            defaultValue={v("title")}
            className={inputClass}
          />
        </Field>
        <Field
          label="Description"
          hint="What happens, who it's for, anything to bring."
          error={errors.description}
        >
          <textarea
            name="description"
            rows={5}
            maxLength={LIMITS.description}
            defaultValue={v("description")}
            className={inputClass}
          />
        </Field>
        <Field label="Category" error={errors.category}>
          <select
            name="category"
            required
            defaultValue={v("category") || "social"}
            className={inputClass}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c[0].toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="When">
        <Field label="Date" error={errors.date}>
          <input
            name="date"
            type="date"
            required
            defaultValue={v("date")}
            className={inputClass}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Starts" error={errors.start_time}>
            <input
              name="start_time"
              type="time"
              required
              defaultValue={v("start_time")}
              className={inputClass}
            />
          </Field>
          <Field label="Ends (optional)" error={errors.end_time}>
            <input
              name="end_time"
              type="time"
              defaultValue={v("end_time")}
              className={inputClass}
            />
          </Field>
        </div>
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            name="repeats"
            value="weekly"
            checked={repeats}
            onChange={(e) => setRepeats(e.target.checked)}
            className="h-5 w-5 accent-brand"
          />
          <span>Repeats every week</span>
        </label>
        {repeats && (
          <div className="flex flex-col gap-4 rounded-xl bg-neutral-50 p-4 ring-1 ring-black/5">
            <fieldset>
              <legend className="mb-2 text-sm font-medium">
                On which days?
              </legend>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((d) => (
                  <label
                    key={d.value}
                    className="flex min-h-10 cursor-pointer items-center rounded-full bg-white px-3 text-sm ring-1 ring-black/10 has-[:checked]:bg-brand has-[:checked]:text-white has-[:checked]:ring-brand"
                  >
                    <input
                      type="checkbox"
                      name="weekdays"
                      value={d.value}
                      className="sr-only"
                      defaultChecked={(
                        values.weekdays as string[] | undefined
                      )?.includes(String(d.value))}
                    />
                    {d.label}
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                None ticked = the same weekday as the date above.
              </p>
              {errors.weekdays && (
                <p className="mt-1 text-sm text-red-700">{errors.weekdays}</p>
              )}
            </fieldset>
            <Field label="Last date" error={errors.repeat_until}>
              <input
                name="repeat_until"
                type="date"
                required
                defaultValue={v("repeat_until")}
                className={inputClass}
              />
            </Field>
          </div>
        )}
      </Section>

      <Section title="Where">
        <Field label="Campus" error={errors.campus}>
          <select
            name="campus"
            required
            defaultValue={v("campus") || campuses[0]}
            className={inputClass}
          >
            {campuses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Building and room"
          hint="e.g. Student Centre, Room 110"
          error={errors.location}
        >
          <input
            name="location"
            maxLength={LIMITS.location}
            defaultValue={v("location")}
            className={inputClass}
          />
        </Field>
      </Section>

      <Section title="Price and links">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Price</legend>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "free", label: "Free" },
              { value: "paid", label: "Paid" },
              { value: "unknown", label: "Not sure yet" },
            ].map((o) => (
              <label
                key={o.value}
                className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-white px-2 text-center text-sm font-medium ring-1 ring-black/10 has-[:checked]:bg-brand has-[:checked]:text-white has-[:checked]:ring-brand"
              >
                <input
                  type="radio"
                  name="price_type"
                  value={o.value}
                  className="sr-only"
                  checked={priceType === o.value}
                  onChange={() => setPriceType(o.value)}
                />
                {o.label}
              </label>
            ))}
          </div>
          {errors.price_type && (
            <p className="mt-1 text-sm text-red-700">{errors.price_type}</p>
          )}
        </fieldset>
        {priceType === "paid" && (
          <Field label="Price per person (CAD $)" error={errors.price}>
            <input
              name="price"
              inputMode="decimal"
              required
              placeholder="15"
              defaultValue={v("price")}
              className={inputClass}
            />
          </Field>
        )}
        <Field
          label="Sign-up or ticket link (optional)"
          error={errors.signup_url}
        >
          <input
            name="signup_url"
            type="url"
            inputMode="url"
            placeholder="https://"
            maxLength={LIMITS.url}
            defaultValue={v("signup_url")}
            className={inputClass}
          />
        </Field>
        <Field
          label="Instagram post link (optional)"
          hint="Shown as a “View on Instagram” button."
          error={errors.info_url}
        >
          <input
            name="info_url"
            type="url"
            inputMode="url"
            placeholder="https://www.instagram.com/p/…"
            maxLength={LIMITS.url}
            defaultValue={v("info_url")}
            className={inputClass}
          />
        </Field>
      </Section>

      <Section title="Poster (optional)">
        <Field
          label="Upload your poster"
          hint="JPG, PNG or WebP. Big photos are shrunk automatically."
          error={errors.poster}
        >
          <input
            name="poster"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="block w-full text-sm file:mr-3 file:min-h-11 file:rounded-xl file:border-0 file:bg-brand/10 file:px-4 file:font-semibold file:text-brand"
          />
        </Field>
      </Section>

      {!organisation && (
        <div className="flex flex-col gap-2">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="permission"
              value="yes"
              required
              defaultChecked={v("permission") === "yes"}
              className="mt-0.5 h-5 w-5 shrink-0 accent-brand"
            />
            <span className="text-sm">
              I&apos;m part of this club or have its permission to post this
              event and poster.
            </span>
          </label>
          {errors.permission && (
            <p className="text-sm text-red-700">{errors.permission}</p>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="flex min-h-12 items-center justify-center rounded-xl bg-brand px-4 text-base font-semibold text-white active:opacity-80 disabled:opacity-60"
      >
        {preparing
          ? "Preparing poster…"
          : pending
            ? "Submitting…"
            : "Submit event"}
      </button>
      <p className="-mt-3 text-center text-xs text-neutral-500">
        Events appear on the site after a quick review.
      </p>
    </form>
  );
}

const inputClass =
  "block min-h-11 w-full rounded-xl border-0 bg-white px-3 py-2 text-base ring-1 ring-black/15 focus:outline-none focus:ring-2 focus:ring-brand";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && !error && (
        <span className="text-xs text-neutral-500">{hint}</span>
      )}
      {error && <span className="text-sm text-red-700">{error}</span>}
    </label>
  );
}

function Success({
  title,
  dates,
  published,
  backHref,
  backLabel,
}: {
  title: string;
  dates: string[];
  published: boolean;
  backHref: string;
  backLabel: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-black/5">
      <p className="text-3xl" aria-hidden="true">
        🎉
      </p>
      <h2 className="mt-2 text-xl font-bold">
        {published ? "Published!" : "Thanks! Event submitted"}
      </h2>
      <p className="mt-2 text-neutral-600">
        {published ? (
          <>
            <strong>{title}</strong> is now live on the site.
          </>
        ) : (
          <>
            <strong>{title}</strong> will appear on the site once it&apos;s been
            reviewed, usually within a day.
          </>
        )}
      </p>
      {dates.length > 0 && (
        <ul className="mt-4 space-y-1 text-sm text-neutral-700">
          {dates.slice(0, 6).map((d) => (
            <li key={d}>{d}</li>
          ))}
          {dates.length > 6 && <li>+ {dates.length - 6} more dates</li>}
        </ul>
      )}
      <div className="mt-6 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="min-h-11 rounded-xl bg-brand px-4 font-semibold text-white"
        >
          Submit another event
        </button>
        <Link
          href={backHref}
          className="flex min-h-11 items-center justify-center rounded-xl font-semibold text-brand"
        >
          {backLabel}
        </Link>
      </div>
    </div>
  );
}

// Resizes a large photo to at most 1600 px on its longest side (as JPEG).
async function shrinkImage(file: File): Promise<File> {
  if (file.size < 1_500_000) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas
      .getContext("2d")!
      .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) =>
      canvas.toBlob(r, "image/jpeg", 0.85),
    );
    return blob ? new File([blob], "poster.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file; // couldn't shrink it; the server will check the size
  }
}
