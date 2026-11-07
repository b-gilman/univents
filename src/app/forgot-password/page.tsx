import type { Metadata } from "next";
import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/AuthForms";
import EventPageShell from "@/components/EventPageShell";
import { schoolForVisitor } from "@/lib/server/auth";
import { messages } from "@/lib/i18n";
import { getLocale } from "@/lib/server/locale";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: `Forgot password · ${SITE.name}` };

export default function ForgotPasswordPage() {
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
  const [school, locale] = await Promise.all([schoolForVisitor(), getLocale()]);
  const t = messages(locale).auth;
  return (
    <EventPageShell school={school} locale={locale}>
      <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-black/5">
        <h1 className="text-2xl font-bold">{t.forgotTitle}</h1>
        <p className="mt-1 mb-5 text-neutral-600">{t.forgotIntro}</p>
        <ForgotPasswordForm locale={locale} />
      </div>
    </EventPageShell>
  );
}
