import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "@/lib/server/locale";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import EventPageShell from "@/components/EventPageShell";
import { getSchools } from "@/lib/schools";
import { getCurrentUser, schoolForVisitor } from "@/lib/server/auth";
import { myOrganisations } from "@/lib/server/organisers";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `Organiser dashboard · ${SITE.name}`,
  robots: { index: false },
};

export default function OrganizePage() {
  return (
    <Suspense
      fallback={
        <EventPageShell>
          <div className="h-48 animate-pulse rounded-2xl bg-card" />
        </EventPageShell>
      }
    >
      <Content />
    </Suspense>
  );
}

async function Content() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/organize");
  const [orgs, school, schools] = await Promise.all([
    myOrganisations(),
    schoolForVisitor(),
    getSchools(),
  ]);
  if (orgs.length === 1) redirect(`/organize/${orgs[0].id}`);

  return (
    <EventPageShell
      school={school}
      locale={await getLocale()}
      languageSwitch={false}
    >
      <h1 className="mb-4 text-2xl font-bold">Organiser dashboard</h1>
      {orgs.length === 0 ? (
        <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-black/5">
          <p className="font-semibold">
            You&apos;re not an organiser of any club yet.
          </p>
          <p className="mt-1 text-sm text-neutral-600">
            Ask the {SITE.name} admin to add you as an organiser of your club.
            Give them the email you log in with: <strong>{user.email}</strong>
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {orgs.map((o) => (
            <li key={o.id}>
              <Link
                href={`/organize/${o.id}`}
                className="flex min-h-16 items-center justify-between gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-black/5 active:bg-neutral-50"
              >
                <span>
                  <span className="block font-semibold">{o.name}</span>
                  <span className="block text-sm text-neutral-500">
                    {schools?.find((s) => s.id === o.school_id)?.short_name}
                    {o.verified ? " · Verified" : ""}
                  </span>
                </span>
                <span aria-hidden="true" className="text-neutral-400">
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </EventPageShell>
  );
}
