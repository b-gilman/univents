"use client";

// The app-style bar at the bottom of the screen on phones:
// Events · Search · Post · My events. Highlights where you are.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { type Locale, messages } from "@/lib/i18n";

type Props = {
  schoolId: string | null;
  // The language. Missing only on the split-second loading screen, where the
  // bar shows its icons without words (so it never flashes the wrong language).
  locale?: Locale;
};

// The current page address is only known in the browser, so the highlight is
// filled in there; the pre-built page shows the bar without a highlight.
export default function BottomNav(props: Props) {
  return (
    <Suspense fallback={<Bar {...props} path="" />}>
      <WithPath {...props} />
    </Suspense>
  );
}

function WithPath(props: Props) {
  return <Bar {...props} path={usePathname()} />;
}

function Bar({ schoolId, locale, path }: Props & { path: string }) {
  const t = locale ? messages(locale).nav : null;
  const base = schoolId ? `/${schoolId}` : "/";
  const items: {
    key: string;
    label: string | undefined;
    href: string;
    active: boolean;
    icon: ReactNode;
  }[] = [
    {
      key: "events",
      label: t?.events,
      href: base,
      active:
        path === base ||
        path.startsWith("/events/") ||
        path.startsWith("/clubs/") ||
        path.endsWith("/clubs"),
      icon: (
        <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM4 10h16M9 3v4M15 3v4" />
      ),
    },
    {
      key: "search",
      label: t?.search,
      href: schoolId ? `${base}/search` : "/",
      active: path.endsWith("/search"),
      icon: <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4" />,
    },
    {
      key: "post",
      label: t?.post,
      href: schoolId ? `${base}/submit` : "/",
      active: path.endsWith("/submit") || path.startsWith("/organize"),
      icon: <path d="M12 5v14M5 12h14" />,
    },
    {
      key: "account",
      label: t?.myEvents,
      href: "/account",
      active: path.startsWith("/account"),
      icon: (
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20a8 8 0 0 1 16 0" />
      ),
    },
  ];

  return (
    <nav
      aria-label={t?.main ?? "Main"}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-4">
        {items.map((item) => (
          <li key={item.key}>
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
              <span className="max-w-full truncate px-1">
                {item.label ?? "\u00a0"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
