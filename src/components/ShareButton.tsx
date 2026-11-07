"use client";

// "use client" = this component runs in the visitor's browser, because it
// needs the phone's share menu (or the clipboard), which only exist there.

import { useState } from "react";
import { type Locale, messages } from "@/lib/i18n";

export default function ShareButton({
  title,
  locale,
}: {
  title: string;
  locale: Locale;
}) {
  const t = messages(locale).share;
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    // Phones: open the native share sheet (Messages, WhatsApp, Instagram…).
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // The visitor closed the share sheet; nothing to do.
      }
      return;
    }
    // Computers: copy the link instead.
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t.copyPrompt, url);
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-card px-4 text-base font-semibold text-neutral-800 ring-1 ring-black/10 active:bg-neutral-100"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
      </svg>
      {copied ? t.copied : t.share}
    </button>
  );
}
