import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "@/lib/server/locale";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import SubmitForm from "@/app/[school]/submit/SubmitForm";
import EventPageShell from "@/components/EventPageShell";
import { allCampuses, getSchool } from "@/lib/schools";
import { getCurrentUser } from "@/lib/server/auth";
import { organiserOf } from "@/lib/server/organisers";
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

async function Content({ params }: PageProps<"/organize/[orgId]/new">) {
  const { orgId } = await params;
  if (!(await getCurrentUser())) redirect(`/login?next=/organize/${orgId}/new`);
  const access = await organiserOf(orgId);
  if (!access) notFound();
  const school = await getSchool(access.org.school_id);
  if (!school) notFound();

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
      <h1 className="mb-4 text-2xl font-bold">New event</h1>
      <SubmitForm
        schoolId={school.id}
        campuses={allCampuses(school)}
        action={createOrgEvent}
        organisation={{
          id: access.org.id,
          name: access.org.name,
          verified: access.org.verified,
        }}
      />
    </EventPageShell>
  );
}
