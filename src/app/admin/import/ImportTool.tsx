"use client";

// Admin → Import: screenshots of an Instagram post → Claude fills in the event
// → the admin checks every field → publish. Runs in the browser so it can
// shrink the screenshots and cut the poster out of them.

import Link from "next/link";
import {
  startTransition,
  useActionState,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { ImportDraft } from "@/lib/server/event-import";
import { CATEGORIES } from "@/lib/submission-rules";
import {
  type PublishState,
  type ReadState,
  publishImport,
  readScreenshots,
} from "./actions";

type SchoolOption = { id: string; name: string; campuses: string[] };

const input =
  "block min-h-11 w-full rounded-xl border-0 bg-card px-3 py-2 text-base ring-1 ring-black/15 focus:outline-none focus:ring-2 focus:ring-neutral-900";
const darkButton =
  "flex min-h-12 w-full items-center justify-center rounded-xl bg-ink px-4 font-semibold text-white active:opacity-80 disabled:opacity-60";

export default function ImportTool({ schools }: { schools: SchoolOption[] }) {
  // Changing `round` starts a fresh import (new form, empty state).
  const [round, setRound] = useState(0);
  return (
    <Round key={round} schools={schools} onAgain={() => setRound(round + 1)} />
  );
}

function Round({
  schools,
  onAgain,
}: {
  schools: SchoolOption[];
  onAgain: () => void;
}) {
  const [readState, read, reading] = useActionState<ReadState, FormData>(
    readScreenshots,
    { status: "idle" },
  );
  const [preparing, setPreparing] = useState(false);
  // The shrunk screenshots, kept so the poster can be cut out of them later.
  const [shots, setShots] = useState<File[]>([]);

  async function onRead(fd: FormData) {
    setPreparing(true);
    const picked = fd
      .getAll("screenshots")
      .filter((f): f is File => f instanceof File && f.size > 0)
      .slice(0, 3);
    const small = await Promise.all(picked.map((f) => shrink(f, 1600)));
    setShots(small);
    fd.delete("screenshots");
    small.forEach((f) => fd.append("screenshots", f));
    setPreparing(false);
    startTransition(() => read(fd));
  }

  if (readState.status === "draft") {
    const school = schools.find((s) => s.id === readState.schoolId)!;
    return (
      <Review
        draft={readState.draft}
        school={school}
        link={readState.link}
        shots={shots}
        onAgain={onAgain}
      />
    );
  }

  const busy = reading || preparing;
  return (
    <form action={onRead} className="flex flex-col gap-4">
      <p className="text-sm text-neutral-600">
        Add screenshots of a club&apos;s post (the poster and the caption).
        Claude fills in the event, then you check it before it goes live.
      </p>
      {readState.status === "error" && <Alert>{readState.error}</Alert>}
      <Field label="School">
        <select name="school" defaultValue={schools[0]?.id} className={input}>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Screenshots (1 to 3)">
        <input
          name="screenshots"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          required
          className="block w-full text-sm file:mr-3 file:min-h-11 file:rounded-xl file:border-0 file:bg-neutral-200 file:px-4 file:font-semibold"
        />
      </Field>
      <Field label="Post link (optional)">
        <input
          name="link"
          type="url"
          inputMode="url"
          placeholder="https://www.instagram.com/p/…"
          className={input}
        />
      </Field>
      <Field label="Caption (optional)">
        <textarea
          name="caption"
          rows={4}
          placeholder="Paste the caption if it's cut off in the screenshots"
          className={input}
        />
      </Field>
      <button type="submit" disabled={busy} className={darkButton}>
        {busy ? "Reading… (10–30 seconds)" : "Read with Claude"}
      </button>
    </form>
  );
}

function Review({
  draft,
  school,
  link,
  shots,
  onAgain,
}: {
  draft: ImportDraft;
  school: SchoolOption;
  link: string;
  shots: File[];
  onAgain: () => void;
}) {
  const [state, publish, publishing] = useActionState<PublishState, FormData>(
    publishImport,
    { status: "idle" },
  );
  const [poster, setPoster] = useState<{ blob: Blob; url: string } | null>(
    null,
  );
  const [repeats, setRepeats] = useState(draft.repeats_weekly);
  const [priceType, setPriceType] = useState<string>(draft.price_type);

  // Cut the poster out of the screenshot Claude pointed at.
  useEffect(() => {
    const box = draft.poster;
    const file = box ? shots[box.image - 1] : undefined;
    if (!box || !file) return;
    let url = "";
    let cancelled = false;
    crop(file, box).then((blob) => {
      if (cancelled || !blob) return;
      url = URL.createObjectURL(blob);
      setPoster({ blob, url });
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [draft.poster, shots]);

  if (state.status === "published") {
    return (
      <div className="flex flex-col gap-3 rounded-2xl bg-emerald-50 p-5 text-emerald-800">
        <p className="text-lg font-semibold">Published: {state.title}</p>
        <ul className="list-disc pl-5 text-sm">
          {state.dates.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          {state.eventId && (
            <Link
              href={`/events/${state.eventId}`}
              className="flex min-h-11 items-center rounded-xl bg-card px-4 font-semibold text-neutral-900 ring-1 ring-black/10"
            >
              View it
            </Link>
          )}
          <button
            type="button"
            onClick={onAgain}
            className={darkButton + " w-auto"}
          >
            Import another
          </button>
        </div>
      </div>
    );
  }

  const errors = state.status === "error" ? state.errors : {};

  // Add the cut-out poster unless the admin unticked it or chose a file.
  function onPublish(fd: FormData) {
    const chosen = fd.get("poster");
    const hasFile = chosen instanceof File && chosen.size > 0;
    if (!hasFile && poster && fd.get("use_crop") === "yes")
      fd.set(
        "poster",
        new File([poster.blob], "poster.jpg", { type: "image/jpeg" }),
      );
    startTransition(() => publish(fd));
  }

  return (
    <form action={onPublish} className="flex flex-col gap-4">
      <input type="hidden" name="school" value={school.id} />
      {!draft.is_event && (
        <Alert>
          Claude doesn&apos;t think this is an event. Check carefully.
        </Alert>
      )}
      {draft.double_check.length > 0 && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Check these:</p>
          <ul className="list-disc pl-5">
            {draft.double_check.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}
      {state.status === "error" && <Alert>{state.error}</Alert>}

      <Field label="Club" error={errors.club_name}>
        <input
          name="club_name"
          required
          defaultValue={draft.club_name ?? ""}
          className={input}
        />
      </Field>
      <Field label="Event name" error={errors.title}>
        <input
          name="title"
          required
          defaultValue={draft.title}
          className={input}
        />
      </Field>
      <Field label="Description" error={errors.description}>
        <textarea
          name="description"
          rows={5}
          defaultValue={draft.description}
          className={input}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category" error={errors.category}>
          <select
            name="category"
            defaultValue={draft.category}
            className={input}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c[0].toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Campus" error={errors.campus}>
          <select name="campus" defaultValue={draft.campus} className={input}>
            {school.campuses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Building and room / address" error={errors.location}>
        <input
          name="location"
          defaultValue={draft.location ?? ""}
          className={input}
        />
      </Field>
      <Field label="Date" error={errors.date}>
        <input
          name="date"
          type="date"
          required
          defaultValue={draft.date ?? ""}
          className={input}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Starts" error={errors.start_time}>
          <input
            name="start_time"
            type="time"
            required
            defaultValue={draft.start_time ?? ""}
            className={input}
          />
        </Field>
        <Field label="Ends (optional)" error={errors.end_time}>
          <input
            name="end_time"
            type="time"
            defaultValue={draft.end_time ?? ""}
            className={input}
          />
        </Field>
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          name="repeats"
          value="weekly"
          checked={repeats}
          onChange={(e) => setRepeats(e.target.checked)}
          className="h-5 w-5"
        />
        Repeats every week (same weekday)
      </label>
      {repeats && (
        <Field label="Last date" error={errors.repeat_until}>
          <input
            name="repeat_until"
            type="date"
            required
            defaultValue={draft.repeat_until ?? ""}
            className={input}
          />
        </Field>
      )}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Price</legend>
        <div className="flex gap-4 text-sm">
          {(["free", "paid", "unknown"] as const).map((t) => (
            <label key={t} className="flex min-h-11 items-center gap-2">
              <input
                type="radio"
                name="price_type"
                value={t}
                checked={priceType === t}
                onChange={() => setPriceType(t)}
                className="h-5 w-5"
              />
              {t === "unknown"
                ? "Not announced"
                : t[0].toUpperCase() + t.slice(1)}
            </label>
          ))}
        </div>
        {priceType === "paid" && (
          <Field label="Price per person ($)" error={errors.price}>
            <input
              name="price"
              inputMode="decimal"
              required
              defaultValue={draft.price_dollars ?? ""}
              className={input}
            />
          </Field>
        )}
      </fieldset>
      <Field
        label="Sign-up or ticket link (optional)"
        error={errors.signup_url}
      >
        <input
          name="signup_url"
          type="url"
          defaultValue={draft.signup_url ?? ""}
          className={input}
        />
      </Field>
      <Field label="Instagram post link (optional)" error={errors.info_url}>
        <input
          name="info_url"
          type="url"
          defaultValue={link}
          className={input}
        />
      </Field>

      <fieldset className="flex flex-col gap-2 rounded-xl bg-card p-3 ring-1 ring-black/10">
        <legend className="px-1 text-sm font-medium">Poster</legend>
        {poster ? (
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="use_crop"
              value="yes"
              defaultChecked
              className="mt-1 h-5 w-5"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={poster.url}
              alt="Poster cut out of the screenshot"
              className="max-h-72 w-auto rounded-lg ring-1 ring-black/10"
            />
          </label>
        ) : (
          <p className="text-sm text-neutral-600">
            {draft.poster
              ? "Cutting out the poster…"
              : "No poster found in the screenshots."}
          </p>
        )}
        <Field
          label={
            poster
              ? "Or upload a different poster"
              : "Upload a poster (optional)"
          }
          error={errors.poster}
        >
          <input
            name="poster"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="block w-full text-sm"
          />
        </Field>
      </fieldset>

      <button type="submit" disabled={publishing} className={darkButton}>
        {publishing ? "Publishing…" : "Publish event"}
      </button>
      <button
        type="button"
        onClick={onAgain}
        className="min-h-11 text-sm font-semibold text-neutral-600"
      >
        Start over
      </button>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error && <span className="text-sm text-red-700">{error}</span>}
    </label>
  );
}

function Alert({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
    >
      {children}
    </p>
  );
}

// Makes a screenshot at most `max` pixels on its longest side (JPEG), so it
// uploads quickly and costs fewer tokens.
async function shrink(file: File, max: number): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas
      .getContext("2d")!
      .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) =>
      canvas.toBlob(r, "image/jpeg", 0.88),
    );
    return blob
      ? new File([blob], "screenshot.jpg", { type: "image/jpeg" })
      : file;
  } catch {
    return file;
  }
}

// Cuts the box (fractions of width/height) out of a screenshot.
async function crop(
  file: File,
  box: { left: number; top: number; width: number; height: number },
): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const sx = Math.round(box.left * bitmap.width);
    const sy = Math.round(box.top * bitmap.height);
    const sw = Math.max(1, Math.round(box.width * bitmap.width));
    const sh = Math.max(1, Math.round(box.height * bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    canvas.getContext("2d")!.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);
    return await new Promise<Blob | null>((r) =>
      canvas.toBlob(r, "image/jpeg", 0.9),
    );
  } catch {
    return null;
  }
}
