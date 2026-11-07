import Link from "next/link";
import { toggleFollow } from "@/app/clubs/actions";
import FollowButton from "@/components/FollowButton";
import { getFollowerCount } from "@/lib/clubs";
import { messages } from "@/lib/i18n";
import { getCurrentUser, supabaseForUser } from "@/lib/server/auth";
import { getLocale } from "@/lib/server/locale";

// On a club's page: the Follow button and how many students follow the club.
export default async function FollowPanel({ clubId }: { clubId: string }) {
  const [user, count, locale] = await Promise.all([
    getCurrentUser(),
    getFollowerCount(clubId),
    getLocale(),
  ]);
  const t = messages(locale).clubs;

  let following = false;
  if (user) {
    const supabase = await supabaseForUser();
    const { data } = await supabase
      .from("follows")
      .select("organization_id")
      .eq("organization_id", clubId)
      .eq("user_id", user.id)
      .maybeSingle();
    following = Boolean(data);
  }

  return (
    <div className="flex flex-col gap-1">
      {user ? (
        <form action={toggleFollow}>
          <input type="hidden" name="club_id" value={clubId} />
          <FollowButton following={following} locale={locale} />
        </form>
      ) : (
        <Link
          href={`/login?next=${encodeURIComponent(`/clubs/${clubId}`)}`}
          className="flex min-h-12 items-center justify-center rounded-xl bg-brand px-4 text-base font-semibold text-white active:opacity-80"
        >
          {t.follow}
        </Link>
      )}
      <p className="text-center text-sm text-neutral-600">
        {count > 0 && <>{t.followers(count)} · </>}
        {t.followHint}
      </p>
    </div>
  );
}
