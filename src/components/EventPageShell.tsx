import Link from "next/link";
import type { ReactNode } from "react";
import ThemeColor from "@/components/ThemeColor";
import { type School, schoolTheme } from "@/lib/schools";

// The frame around inner pages (event page, submit form): a bar in the
// school's colour with "← All events", then the content.
export default function EventPageShell({
  children,
  school = null,
}: {
  children: ReactNode;
  school?: School | null;
}) {
  return (
    <div
      style={schoolTheme(school)}
      className="flex min-h-dvh flex-1 flex-col bg-neutral-100 text-neutral-900"
    >
      {school && <ThemeColor color={school.primary_color} />}
      <header className="bg-brand px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 text-white">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <Link
            href={school ? `/${school.id}` : "/"}
            className="-ml-2 flex min-h-11 items-center gap-1 rounded-lg px-2 font-semibold active:bg-white/10"
          >
            <span aria-hidden="true">←</span> All events
          </Link>
          {school && (
            <span className="truncate text-sm text-white/80">
              {school.short_name}
            </span>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-4 pb-[max(env(safe-area-inset-bottom),2rem)]">
        {children}
      </main>
    </div>
  );
}
