import Link from "next/link";
import { Suspense } from "react";
import EventPageShell from "@/components/EventPageShell";
import { messages } from "@/lib/i18n";
import { getLocale } from "@/lib/server/locale";

// Shown when a club link is wrong or the club was removed.
export default function ClubNotFound() {
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
        <p className="text-lg font-semibold">{t.clubs.notFound}</p>
        <p className="mt-1 text-sm text-neutral-600">{t.clubs.notFoundBody}</p>
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
