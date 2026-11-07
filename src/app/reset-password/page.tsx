import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/AuthForms";
import EventPageShell from "@/components/EventPageShell";
import { getCurrentUser, schoolForVisitor } from "@/lib/server/auth";
import { messages } from "@/lib/i18n";
import { getLocale } from "@/lib/server/locale";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `New password · ${SITE.name}`,
  robots: { index: false },
};

// Reached from the "reset your password" email (which logs the student in).
export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <EventPageShell>
          <div className="h-60 animate-pulse rounded-2xl bg-card" />
        </EventPageShell>
      }
    >
      <Content />
    </Suspense>
  );
}

async function Content() {
  const [user, school, locale] = await Promise.all([
    getCurrentUser(),
    schoolForVisitor(),
    getLocale(),
  ]);
  const t = messages(locale).auth;
  return (
    <EventPageShell school={school} locale={locale}>
      <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-black/5">
        <h1 className="text-2xl font-bold">{t.resetTitle}</h1>
        {user ? (
          <>
            <p className="mt-1 mb-5 text-neutral-600">
              {t.resetFor(user.email)}
            </p>
            <ResetPasswordForm locale={locale} />
          </>
        ) : (
          <p className="mt-2 text-neutral-600">
            {t.resetExpired}{" "}
            <Link
              href="/forgot-password"
              className="font-semibold text-brand underline"
            >
              {t.sendNewLink}
            </Link>
          </p>
        )}
      </div>
    </EventPageShell>
  );
}
