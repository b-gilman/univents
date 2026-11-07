import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "@/lib/server/locale";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import SubmitForm from "@/app/[school]/submit/SubmitForm";
import EventPageShell from "@/components/EventPageShell";
import { allCampuses, getSchool } from "@/lib/schools";
import { getCurrentUser } from "@/lib/server/auth";
import { TIME_ZONE } from "@/lib/events";
import { type OrgEvent, organiserOf, orgEvents } from "@/lib/server/organisers";
import { SITE } from "@/lib/site";
import { createOrgEvent } from "../../actions";

export const metadata: Metadata = {
  title: `New event · ${SITE.name}`,
  robots: { index: false },
};

export default function NewOrgEventPage(
  props: PageProps<"/organize/[orgId]/new">,
) {
  return (
    <Suspense
      fallback={
        <EventPageShell>
          <div className="h-96 animate-pulse rounded-2xl bg-card" />
        </EventPageShell>
      }
    >
      <Content {...props} />
    </Suspense>
  );
}

// "Duplicate": the form starts filled in from an existing event (everything
// except the date, which the organiser picks).
const clock = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function prefillFrom(e: OrgEvent): Record<string, string> {
  return {
    title: e.title,
    description: e.description ?? "",
    category: e.category,
    campus: e.campus,
    location: e.location ?? "",
    start_time: clock.format(new Date(e.starts_at)),
    end_time: e.ends_at ? clock.format(new Date(e.ends_at)) : "",
    price_type:
      e.price_cents === null
        ? "unknown"
        : e.price_cents === 0
          ? "free"
          : "paid",
    price: e.price_cents ? String(e.price_cents / 100) : "",
    signup_url: e.signup_url ?? "",
    info_url: e.info_url ?? "",
  };
}

async function Content({
  params,
  searchParams,
}: PageProps<"/organize/[orgId]/new">) {
  const { orgId } = await params;
  const from = (await searchParams).from;
  if (!(await getCurrentUser())) redirect(`/login?next=/organize/${orgId}/new`);
  const access = await organiserOf(orgId);
  if (!access) notFound();
  const school = await getSchool(access.org.school_id);
  if (!school) notFound();
  const original =
    typeof from === "string"
      ? (await orgEvents(access.org.id)).find((e) => e.id === from)
      : undefined;

  return (
    <EventPageShell
      school={school}
      locale={await getLocale()}
      languageSwitch={false}
    >
      <Link
        href={`/organize/${orgId}`}
        className="mb-2 inline-flex min-h-11 items-center font-semibold text-brand"
      >
        ← {access.org.name}
      </Link>
      <h1 className="text-2xl font-bold">
        {original ? "Duplicate event" : "New event"}
      </h1>
      <p className="mb-4 text-sm text-neutral-600">
        {original
          ? `A copy of “${original.title}”. Pick the new date, change anything else, and post.`
          : "Fill in the details and post."}
      </p>
      <SubmitForm
        schoolId={school.id}
        campuses={allCampuses(school)}
        action={createOrgEvent}
        organisation={{
          id: access.org.id,
          name: access.org.name,
          verified: access.org.verified,
        }}
        initial={original ? prefillFrom(original) : undefined}
        copyPosterUrl={original?.image_url ?? null}
      />
    </EventPageShell>
  );
}
