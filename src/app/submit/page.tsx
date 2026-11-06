import type { Metadata } from "next";
import EventPageShell from "@/components/EventPageShell";
import { SITE } from "@/lib/site";
import SubmitForm from "./SubmitForm";

export const metadata: Metadata = {
  title: `Submit an event · ${SITE.name}`,
  description: `Hosting an event on campus? Send it in to be listed on ${SITE.name}.`,
};

export default function SubmitPage() {
  return (
    <EventPageShell>
      <div className="mb-5">
        <h1 className="text-2xl font-bold">Submit an event</h1>
        <p className="mt-1 text-neutral-600">
          Hosting something on campus? Fill this in and it&apos;ll be listed once
          it&apos;s been reviewed.
        </p>
      </div>
      <SubmitForm />
    </EventPageShell>
  );
}
