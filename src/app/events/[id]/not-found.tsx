import Link from "next/link";
import EventPageShell from "@/components/EventPageShell";

// Shown when an event link is wrong or the event was deleted.
export default function EventNotFound() {
  return (
    <EventPageShell>
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-black/5">
        <p className="text-lg font-semibold">Event not found</p>
        <p className="mt-1 text-sm text-neutral-600">
          This event may have been removed, or the link is incorrect.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-brand px-5 font-semibold text-white"
        >
          See all events
        </Link>
      </div>
    </EventPageShell>
  );
}
