import type { Metadata } from "next";
import EventPageShell from "@/components/EventPageShell";
import SubmitForm from "./SubmitForm";

export const metadata: Metadata = {
  title: "Submit an event · Concordia Events",
  description: "Hosting an event at Concordia? Send it in to be listed on Concordia Events.",
};

export default function SubmitPage() {
  return (
    <EventPageShell>
      <div className="mb-5">
        <h1 className="text-2xl font-bold">Submit an event</h1>
        <p className="mt-1 text-neutral-600">
          Hosting something at Concordia? Fill this in and it&apos;ll be listed once
          it&apos;s been reviewed.
        </p>
      </div>
      <SubmitForm />
    </EventPageShell>
  );
}
