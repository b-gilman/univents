import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/AuthForms";
import EventPageShell from "@/components/EventPageShell";
import { getCurrentUser, schoolForVisitor } from "@/lib/server/auth";
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
          <div className="h-60 animate-pulse rounded-2xl bg-white" />
        </EventPageShell>
      }
    >
      <Content />
    </Suspense>
  );
}

async function Content() {
  const [user, school] = await Promise.all([
    getCurrentUser(),
    schoolForVisitor(),
  ]);
  return (
    <EventPageShell school={school}>
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h1 className="text-2xl font-bold">Choose a new password</h1>
        {user ? (
          <>
            <p className="mt-1 mb-5 text-neutral-600">For {user.email}</p>
            <ResetPasswordForm />
          </>
        ) : (
          <p className="mt-2 text-neutral-600">
            This link has expired or was already used.{" "}
            <Link
              href="/forgot-password"
              className="font-semibold text-brand underline"
            >
              Send a new link
            </Link>
          </p>
        )}
      </div>
    </EventPageShell>
  );
}
