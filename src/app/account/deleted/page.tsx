import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import EventPageShell from "@/components/EventPageShell";
import { messages } from "@/lib/i18n";
import { getLocale } from "@/lib/server/locale";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `Account deleted · ${SITE.name}`,
  robots: { index: false },
};

// Shown right after "Delete my account".
export default function AccountDeletedPage() {
  return (
    <Suspense fallback={<EventPageShell>{null}</EventPageShell>}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const locale = await getLocale();
  const t = messages(locale);
  return (
    <EventPageShell locale={locale}>
      <div className="rounded-2xl bg-card p-6 text-center shadow-sm ring-1 ring-black/5">
        <p className="text-lg font-semibold">{t.account.deletedTitle}</p>
        <p className="mt-1 text-sm text-neutral-600">{t.account.deletedBody}</p>
        <Link
          href="/"
          className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-brand px-5 font-semibold text-white"
        >
          {t.event.seeAllEvents}
        </Link>
      </div>
    </EventPageShell>
  );
}
