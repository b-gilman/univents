import Link from "next/link";
import { toggleRsvp } from "@/app/account/actions";
import RsvpButton from "@/components/RsvpButton";
import { getRsvpCounts } from "@/lib/rsvps";
import { getCurrentUser, supabaseForUser } from "@/lib/server/auth";

// "I'm going" button + how many people are going, on an event's page.
export default async function RsvpPanel({
  eventId,
  ended,
}: {
  eventId: string;
  ended: boolean;
}) {
  const [user, counts] = await Promise.all([
    getCurrentUser(),
    getRsvpCounts([eventId]),
  ]);
  const count = counts.get(eventId) ?? 0;

  let going = false;
  if (user) {
    const supabase = await supabaseForUser();
    const { data } = await supabase
      .from("rsvps")
      .select("event_id")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .maybeSingle();
    going = Boolean(data);
  }

  const countText =
    count === 0
      ? ended
        ? null
        : "Be the first to RSVP"
      : `${count} ${count === 1 ? "person" : "people"} ${ended ? "went" : "going"}`;

  if (ended) {
    return countText ? (
      <p className="text-sm text-neutral-600">
        👥 {countText}
        {going ? " (including you)" : ""}
      </p>
    ) : null;
  }

  return (
    <div className="flex flex-col gap-1">
      {user ? (
        <form action={toggleRsvp}>
          <input type="hidden" name="event_id" value={eventId} />
          <RsvpButton going={going} />
        </form>
      ) : (
        <Link
          href={`/login?next=${encodeURIComponent(`/events/${eventId}`)}`}
          className="flex min-h-12 items-center justify-center rounded-xl bg-brand px-4 text-base font-semibold text-white active:opacity-80"
        >
          I&apos;m going
        </Link>
      )}
      <p className="text-center text-sm text-neutral-600">
        {countText && <>👥 {countText}</>}
        {!user && <> · Log in to RSVP</>}
      </p>
    </div>
  );
}
