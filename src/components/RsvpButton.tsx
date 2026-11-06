"use client";

import { useFormStatus } from "react-dom";

// The RSVP button. Shows "Saving…" while the server updates the RSVP.
export default function RsvpButton({ going }: { going: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-pressed={going}
      className={
        "flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold active:opacity-80 disabled:opacity-60 " +
        (going
          ? "bg-white text-brand ring-2 ring-brand"
          : "bg-brand text-white")
      }
    >
      {pending
        ? "Saving…"
        : going
          ? "✓ You're going · tap to cancel"
          : "I'm going"}
    </button>
  );
}
