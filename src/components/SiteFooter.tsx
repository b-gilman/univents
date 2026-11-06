import Link from "next/link";
import { SITE } from "@/lib/site";

// Small footer at the bottom of every page.
export default function SiteFooter() {
  return (
    <footer className="mt-8 flex justify-center gap-4 pb-2 text-xs text-neutral-500">
      <span>{SITE.name}</span>
      <Link href="/privacy" className="underline underline-offset-2">
        Privacy
      </Link>
    </footer>
  );
}
