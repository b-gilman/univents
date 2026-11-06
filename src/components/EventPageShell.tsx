import Link from "next/link";
import type { ReactNode } from "react";

// The frame around an event page: maroon bar with "← All events", then content.
export default function EventPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-neutral-100 text-neutral-900">
      <header className="bg-concordia px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 text-white">
        <div className="mx-auto flex max-w-xl items-center">
          <Link
            href="/"
            className="-ml-2 flex min-h-11 items-center gap-1 rounded-lg px-2 font-semibold active:bg-white/10"
          >
            <span aria-hidden="true">←</span> All events
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-4 pb-[max(env(safe-area-inset-bottom),2rem)]">
        {children}
      </main>
    </div>
  );
}
