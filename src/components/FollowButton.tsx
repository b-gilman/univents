"use client";

import { useFormStatus } from "react-dom";
import { type Locale, messages } from "@/lib/i18n";

// "Follow" ↔ "✓ Following". Shows "Saving…" while the server updates.
export default function FollowButton({
  following,
  locale,
}: {
  following: boolean;
  locale: Locale;
}) {
  const { pending } = useFormStatus();
  const t = messages(locale);
  return (
    <button
      type="submit"
      disabled={pending}
      aria-pressed={following}
      className={
        "flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold active:opacity-80 disabled:opacity-60 " +
        (following
          ? "bg-card text-brand ring-2 ring-brand"
          : "bg-brand text-white")
      }
    >
      {pending ? t.rsvp.saving : following ? t.clubs.following : t.clubs.follow}
    </button>
  );
}
