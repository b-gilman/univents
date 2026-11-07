"use client";

import { useFormStatus } from "react-dom";
import { type Locale, messages } from "@/lib/i18n";

// The RSVP button. Shows "Saving…" while the server updates the RSVP.
export default function RsvpButton({
  going,
  locale,
}: {
  going: boolean;
  locale: Locale;
}) {
  const { pending } = useFormStatus();
  const t = messages(locale).rsvp;
  return (
    <button
      type="submit"
      disabled={pending}
      aria-pressed={going}
      className={
        "flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold active:opacity-80 disabled:opacity-60 " +
        (going ? "bg-card text-brand ring-2 ring-brand" : "bg-brand text-white")
      }
    >
      {pending ? t.saving : going ? t.youreGoing : t.imGoing}
    </button>
  );
}
