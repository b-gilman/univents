import type { Metadata } from "next";
import type { ReactNode } from "react";
import EventPageShell from "@/components/EventPageShell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `Privacy · ${SITE.name}`,
  description: `What ${SITE.name} collects, why, and who can see it.`,
};

// Plain-language privacy page. Keep it in sync with what the site does.
export default function PrivacyPage() {
  const contact = SITE.privacyEmail ? (
    <a
      href={`mailto:${SITE.privacyEmail}`}
      className="font-semibold text-brand underline"
    >
      {SITE.privacyEmail}
    </a>
  ) : (
    <strong>the {SITE.name} admin</strong>
  );

  return (
    <EventPageShell locale="en" languageSwitch={false}>
      <article className="flex flex-col gap-5 rounded-2xl bg-card p-5 leading-relaxed text-neutral-800 shadow-sm ring-1 ring-black/5">
        <header>
          <h1 className="text-2xl font-bold">Privacy</h1>
          <p className="text-sm text-neutral-500">
            Last updated {SITE.privacyUpdated}
          </p>
          <p className="mt-3">
            {SITE.name} lists student club events. This page explains, in plain
            language, what we collect, why, and who can see it. We don&apos;t
            sell your information and we don&apos;t show ads.
          </p>
        </header>

        <Section title="What we collect">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Your account</strong> (if you sign up): full name, email,
              school, and a password. Passwords are stored scrambled (hashed) by
              our login provider; nobody can read them, including us.
            </li>
            <li>
              <strong>Your RSVPs</strong>: which events you&apos;ve said
              you&apos;re going to.
            </li>
            <li>
              <strong>Event submissions</strong>: the club name, a contact
              email, the event details and any poster you upload.
            </li>
            <li>
              <strong>Your school choice</strong>, remembered in a cookie so the
              site opens on your school.
            </li>
            <li>
              <strong>Spam protection</strong>: when an event is submitted, a
              scrambled fingerprint of the sender&apos;s internet address, used
              only to limit how many events one person can send per hour.
            </li>
          </ul>
        </Section>

        <Section title="Why">
          To show events, let you RSVP and see your events in one place, let
          clubs know who&apos;s coming, review submitted events, and keep the
          site free of spam.
        </Section>

        <Section title="Who can see what">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Everyone</strong> can see published events and how many
              people are going, never who.
            </li>
            <li>
              <strong>The club hosting an event</strong> (its organisers) can
              see the <strong>names</strong> of people who RSVP&apos;d to that
              event. Never your email.
            </li>
            <li>
              <strong>The {SITE.name} admin</strong> can see accounts, RSVPs and
              submissions, to run the site and handle requests.
            </li>
            <li>
              <strong>Our service providers</strong> store and run the site for
              us: <strong>Supabase</strong> (database, logins and poster
              storage) and <strong>Vercel</strong> (hosting). They process data
              only on our behalf.
            </li>
          </ul>
        </Section>

        <Section title="Where it's stored">
          Our providers&apos; servers are in the <strong>United States</strong>,
          so your information is stored outside Quebec and Canada and is subject
          to the laws there.
        </Section>

        <Section title="How long we keep it">
          Your account and RSVPs are kept until you ask us to delete your
          account. Past events stay listed as history. Submissions that
          weren&apos;t approved are kept for our records and can be deleted on
          request.
        </Section>

        <Section title="Cookies">
          We only use cookies the site needs to work: one to keep you logged in,
          one to remember your school, and one for the admin&apos;s login. No
          advertising or tracking cookies.
        </Section>

        <Section title="Your rights">
          You can ask to see the information we have about you, to correct it,
          or to delete your account and RSVPs. Contact {contact} from the email
          on your account and we&apos;ll handle it within 30 days.
        </Section>

        <Section title="Changes">
          If we change how we use your information, we&apos;ll update this page
          and its date.
        </Section>
      </article>
    </EventPageShell>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-1 text-lg font-semibold">{title}</h2>
      <div>{children}</div>
    </section>
  );
}
