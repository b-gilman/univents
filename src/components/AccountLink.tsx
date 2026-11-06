import Link from "next/link";
import { getCurrentUser } from "@/lib/server/auth";

// Top-right of a school's page: "Log in", or "My events" when logged in.
export default async function AccountLink({ returnTo }: { returnTo: string }) {
  const user = await getCurrentUser();
  const cls =
    "flex min-h-10 items-center rounded-full bg-white/15 px-3 text-sm font-semibold text-white active:bg-white/25";
  return user ? (
    <Link href="/account" className={cls}>
      My events
    </Link>
  ) : (
    <Link href={`/login?next=${encodeURIComponent(returnTo)}`} className={cls}>
      Log in
    </Link>
  );
}
