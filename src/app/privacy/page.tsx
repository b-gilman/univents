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
              <strong>Clubs you follow</strong>, and your email settings
              (reminder emails on or off).
            </li>
            <li>
              <strong>Event submissions</strong>: the club name, a contact
              email, the event details and any poster you upload.
            </li>
            <li>
              <strong>Your school and language choices</strong>, remembered in
              cookies so the site opens on your school, in your language.
            </li>
            <li>
              <strong>Page view counts</strong>: how many times each event page
              is opened, as one number per day. Nothing about who opened it.
            </li>
            <li>
              <strong>Club pages</strong>: the logo, description and links a
              club&apos;s organisers add. These are public.
            </li>
            <li>
              <strong>Spam protection</strong>: when an event is submitted, a
              scrambled fingerprint of the sender&apos;s internet address, used
              only to limit how many events one person can send per hour.
            </li>
          </ul>
        </Section>

        <Section title="Why">
          To show events, let you RSVP and follow clubs, email you reminders,
          new events and short updates from clubs you follow (you can turn these
          off), show clubs how many people view their events, let clubs know
          who&apos;s coming, review submitted events, and keep the site free of
          spam.
        </Section>

        <Section title="Who can see what">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Everyone</strong> can see published events and how many
              people are going, never who. Clubs show how many followers they
              have, never who.
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
              us: <strong>Supabase</strong> (database, logins and image
              storage), <strong>Vercel</strong> (hosting) and{" "}
              <strong>Resend</strong> (sending emails). They process data only
              on our behalf. When the admin adds an event from screenshots of a
              club&apos;s public post, <strong>Anthropic</strong> (Claude) reads
              those screenshots; no student information is sent.
            </li>
          </ul>
        </Section>

        <Section title="Where it's stored">
          Our providers&apos; servers are in the <strong>United States</strong>,
          so your information is stored outside Quebec and Canada and is subject
          to the laws there.
        </Section>

        <Section title="How long we keep it">
          Your account, RSVPs and follows are kept until you delete your
          account, which erases them right away. Past events stay listed as
          history. Submissions that weren&apos;t approved are kept for our
          records and can be deleted on request.
        </Section>

        <Section title="Cookies">
          We only use cookies the site needs to work: one to keep you logged in,
          one to remember your school, one for your language, and one for the
          admin&apos;s login. No advertising or tracking cookies.
        </Section>

        <Section title="Your rights">
          On your <strong>My events</strong> page you can{" "}
          <strong>download your data</strong> (everything we have about you) and{" "}
          <strong>delete your account</strong> yourself, at any time. For
          anything else, like correcting your information or questions about
          this page, contact {contact} from the email on your account and
          we&apos;ll handle it within 30 days.
        </Section>

        <Section title="Who runs Kuku">
          {SITE.name} is an independent student project. It isn&apos;t run by,
          or officially connected to, any school or student union.
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
