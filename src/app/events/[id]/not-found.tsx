import Link from "next/link";
import { Suspense } from "react";
import EventPageShell from "@/components/EventPageShell";
import { getLocale } from "@/lib/server/locale";
import { messages } from "@/lib/i18n";

// Shown when an event link is wrong or the event was deleted.
export default function EventNotFound() {
  return (
    <Suspense fallback={<EventPageShell>{null}</EventPageShell>}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const locale = await getLocale();
  const t = messages(locale).event;
  return (
    <EventPageShell locale={locale}>
      <div className="rounded-2xl bg-card p-6 text-center shadow-sm ring-1 ring-black/5">
        <p className="text-lg font-semibold">{t.notFound}</p>
        <p className="mt-1 text-sm text-neutral-600">{t.notFoundBody}</p>
        <Link
          href="/"
          className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-brand px-5 font-semibold text-white"
        >
          {t.seeAllEvents}
        </Link>
      </div>
    </EventPageShell>
  );
}
