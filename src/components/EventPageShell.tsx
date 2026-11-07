import Link from "next/link";
import type { ReactNode } from "react";
import BottomNav from "@/components/BottomNav";
import SiteFooter from "@/components/SiteFooter";
import ThemeColor from "@/components/ThemeColor";
import { type Locale, messages } from "@/lib/i18n";
import { type School, schoolTheme } from "@/lib/schools";

// The frame around inner pages (event page, submit form): a bar in the
// school's colour with "← All events", then the content.
export default function EventPageShell({
  children,
  school = null,
  locale,
  languageSwitch = true,
}: {
  children: ReactNode;
  school?: School | null;
  // Missing only on loading screens: the header then shows just the arrow,
  // so it never flashes the wrong language.
  locale?: Locale;
  languageSwitch?: boolean; // false on pages that only exist in English
}) {
  const t = locale ? messages(locale) : null;
  return (
    <div
      lang={locale}
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
            <span aria-hidden="true">←</span> {t?.header.allEvents}
          </Link>
          {school && (
            <span className="truncate text-sm text-white/80">
              {school.short_name}
            </span>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+6rem)] sm:pb-8">
        {children}
        <SiteFooter locale={locale} languageSwitch={languageSwitch} />
      </main>
      <BottomNav schoolId={school?.id ?? null} locale={locale} />
    </div>
  );
}
