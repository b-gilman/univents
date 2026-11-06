"use client";

// The app-style bar at the bottom of the screen on phones:
// Events · Search · Post · My events. Highlights where you are.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";

// The current page address is only known in the browser, so the highlight is
// filled in there; the pre-built page shows the bar without a highlight.
export default function BottomNav({ schoolId }: { schoolId: string | null }) {
  return (
    <Suspense fallback={<Bar schoolId={schoolId} path="" />}>
      <WithPath schoolId={schoolId} />
    </Suspense>
  );
}

function WithPath({ schoolId }: { schoolId: string | null }) {
  return <Bar schoolId={schoolId} path={usePathname()} />;
}

function Bar({ schoolId, path }: { schoolId: string | null; path: string }) {
  const base = schoolId ? `/${schoolId}` : "/";
  const items: {
    label: string;
    href: string;
    active: boolean;
    icon: ReactNode;
  }[] = [
    {
      label: "Events",
      href: base,
      active: path === base || path.startsWith("/events/"),
      icon: (
        <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM4 10h16M9 3v4M15 3v4" />
      ),
    },
    {
      label: "Search",
      href: schoolId ? `${base}/search` : "/",
      active: path.endsWith("/search"),
      icon: <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4" />,
    },
    {
      label: "Post",
      href: schoolId ? `${base}/submit` : "/",
      active: path.endsWith("/submit") || path.startsWith("/organize"),
      icon: <path d="M12 5v14M5 12h14" />,
    },
    {
      label: "My events",
      href: "/account",
      active: path.startsWith("/account"),
      icon: (
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20a8 8 0 0 1 16 0" />
      ),
    },
  ];

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-4">
        {items.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={
                "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold " +
                (item.active
                  ? "text-brand"
                  : "text-neutral-500 active:text-neutral-800")
              }
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth={item.active ? 2.4 : 1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {item.icon}
              </svg>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
