import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SignupForm } from "@/components/AuthForms";
import EventPageShell from "@/components/EventPageShell";
import { getSchools } from "@/lib/schools";
import { getCurrentUser, safeNext, schoolForVisitor } from "@/lib/server/auth";
import { messages } from "@/lib/i18n";
import { getLocale } from "@/lib/server/locale";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: `Create an account · ${SITE.name}` };

export default function SignupPage(props: PageProps<"/signup">) {
  return (
    <Suspense
      fallback={
        <EventPageShell>
          <div className="h-96 animate-pulse rounded-2xl bg-card" />
        </EventPageShell>
      }
    >
      <SignupContent {...props} />
    </Suspense>
  );
}

async function SignupContent({ searchParams }: PageProps<"/signup">) {
  const next = safeNext((await searchParams).next as string | undefined);
  if (await getCurrentUser()) redirect(next ?? "/account");
  const [school, schools, locale] = await Promise.all([
    schoolForVisitor(next),
    getSchools(),
    getLocale(),
  ]);
  const t = messages(locale).auth;
  return (
    <EventPageShell school={school} locale={locale}>
      <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-black/5">
        <h1 className="text-2xl font-bold">{t.signupTitle}</h1>
        <p className="mt-1 mb-5 text-neutral-600">{t.signupIntro}</p>
        <SignupForm
          schools={(schools ?? []).map((s) => ({ id: s.id, name: s.name }))}
          defaultSchool={school?.id ?? null}
          next={next}
          locale={locale}
        />
      </div>
    </EventPageShell>
  );
}
