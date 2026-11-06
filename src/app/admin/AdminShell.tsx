import Link from "next/link";
import type { ReactNode } from "react";
import { SITE } from "@/lib/site";

// Frame for admin pages: a dark bar so it's obvious you're in the admin area.
export default function AdminShell({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-neutral-100 text-neutral-900">
      <header className="bg-neutral-900 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 text-white">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <Link href="/admin" className="flex min-h-11 items-center font-semibold">
            Admin · {SITE.name}
          </Link>
          {right}
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-4 pb-[max(env(safe-area-inset-bottom),2rem)]">
        {children}
      </main>
    </div>
  );
}
