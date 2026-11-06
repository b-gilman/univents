import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/AuthForms";
import EventPageShell from "@/components/EventPageShell";
import { getCurrentUser, safeNext, schoolForVisitor } from "@/lib/server/auth";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: `Log in · ${SITE.name}` };

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <Suspense
      fallback={
        <EventPageShell>
          <div className="h-72 animate-pulse rounded-2xl bg-white" />
        </EventPageShell>
      }
    >
      <LoginContent {...props} />
    </Suspense>
  );
}

async function LoginContent({ searchParams }: PageProps<"/login">) {
  const next = safeNext((await searchParams).next as string | undefined);
  if (await getCurrentUser()) redirect(next ?? "/account");
  const school = await schoolForVisitor(next);
  return (
    <EventPageShell school={school}>
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h1 className="text-2xl font-bold">Log in</h1>
        <p className="mt-1 mb-5 text-neutral-600">
          RSVP to events and keep track of what you&apos;re going to.
        </p>
        <LoginForm next={next} />
      </div>
    </EventPageShell>
  );
}
