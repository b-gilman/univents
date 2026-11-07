import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/AuthForms";
import EventPageShell from "@/components/EventPageShell";
import { getCurrentUser, safeNext, schoolForVisitor } from "@/lib/server/auth";
import { messages } from "@/lib/i18n";
import { getLocale } from "@/lib/server/locale";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: `Log in · ${SITE.name}` };

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <Suspense
      fallback={
        <EventPageShell>
          <div className="h-72 animate-pulse rounded-2xl bg-card" />
        </EventPageShell>
      }
    >
      <LoginContent {...props} />
    </Suspense>
  );
}

async function LoginContent({ searchParams }: PageProps<"/login">) {
  const query = await searchParams;
  const next = safeNext(query.next as string | undefined);
  if (await getCurrentUser()) redirect(next ?? "/account");
  const [school, locale] = await Promise.all([
    schoolForVisitor(next),
    getLocale(),
  ]);
  const t = messages(locale).auth;
  return (
    <EventPageShell school={school} locale={locale}>
      <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-black/5">
        <h1 className="text-2xl font-bold">{t.loginTitle}</h1>
        <p className="mt-1 mb-5 text-neutral-600">{t.loginIntro}</p>
        {query.error === "link" && (
          <p
            role="alert"
            className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            {t.linkExpired}{" "}
            <Link href="/forgot-password" className="font-semibold underline">
              {t.getNewLink}
            </Link>
            .
          </p>
        )}
        <LoginForm next={next} locale={locale} />
      </div>
    </EventPageShell>
  );
}
