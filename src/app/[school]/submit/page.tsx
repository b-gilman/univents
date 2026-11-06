import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import EventPageShell from "@/components/EventPageShell";
import { allCampuses, getSchool } from "@/lib/schools";
import { SITE } from "@/lib/site";
import SubmitForm from "./SubmitForm";

export async function generateMetadata({ params }: PageProps<"/[school]/submit">): Promise<Metadata> {
  const school = await getSchool((await params).school);
  return {
    title: `Submit an event · ${SITE.name}`,
    description: `Hosting an event at ${school?.short_name ?? "your school"}? Send it in to be listed on ${SITE.name}.`,
  };
}

export default function SubmitPage(props: PageProps<"/[school]/submit">) {
  return (
    <Suspense fallback={<EventPageShell><div className="h-96 animate-pulse rounded-2xl bg-white" /></EventPageShell>}>
      <SubmitContent {...props} />
    </Suspense>
  );
}

async function SubmitContent({ params }: PageProps<"/[school]/submit">) {
  const school = await getSchool((await params).school);
  if (!school) notFound();
  return (
    <EventPageShell school={school}>
      <div className="mb-5">
        <h1 className="text-2xl font-bold">Submit an event</h1>
        <p className="mt-1 text-neutral-600">
          Hosting something at {school.short_name}? Fill this in and it&apos;ll be listed once
          it&apos;s been reviewed.
        </p>
      </div>
      <SubmitForm schoolId={school.id} campuses={allCampuses(school)} />
    </EventPageShell>
  );
}
