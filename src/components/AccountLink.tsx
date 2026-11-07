import Link from "next/link";
import { getCurrentUser } from "@/lib/server/auth";
import { getMessages } from "@/lib/server/locale";

// Top-right of a school's page: "Log in", or "My events" when logged in.
export default async function AccountLink({ returnTo }: { returnTo: string }) {
  const [user, t] = await Promise.all([getCurrentUser(), getMessages()]);
  const cls =
    "flex min-h-10 items-center rounded-full bg-white/15 px-3 text-sm font-semibold text-white active:bg-white/25";
  return user ? (
    <Link href="/account" className={cls}>
      {t.header.myEvents}
    </Link>
  ) : (
    <Link href={`/login?next=${encodeURIComponent(returnTo)}`} className={cls}>
      {t.header.logIn}
    </Link>
  );
}
