import type { Metadata } from "next";
import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/AuthForms";
import EventPageShell from "@/components/EventPageShell";
import { schoolForVisitor } from "@/lib/server/auth";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: `Forgot password · ${SITE.name}` };

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <EventPageShell>
          <div className="h-60 animate-pulse rounded-2xl bg-white" />
        </EventPageShell>
      }
    >
      <Content />
    </Suspense>
  );
}

async function Content() {
  const school = await schoolForVisitor();
  return (
    <EventPageShell school={school}>
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h1 className="text-2xl font-bold">Forgot your password?</h1>
        <p className="mt-1 mb-5 text-neutral-600">
          Enter your account&apos;s email and we&apos;ll send you a link to
          choose a new one.
        </p>
        <ForgotPasswordForm />
      </div>
    </EventPageShell>
  );
}
