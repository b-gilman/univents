import Link from "next/link";
import LanguageSwitch from "@/components/LanguageSwitch";
import { type Locale, messages } from "@/lib/i18n";
import { SITE } from "@/lib/site";

// Small footer at the bottom of every page: name, privacy, and the language
// switch ("Français" / "English").
export default function SiteFooter({
  locale,
  languageSwitch = true,
}: {
  locale?: Locale;
  languageSwitch?: boolean;
}) {
  return (
    <footer className="mt-8 flex items-center justify-center gap-4 pb-2 text-xs text-neutral-500">
      <span>{SITE.name}</span>
      <Link href="/privacy" className="underline underline-offset-2">
        {locale ? messages(locale).site.privacy : "Privacy"}
      </Link>
      {locale && languageSwitch && (
        <LanguageSwitch locale={locale} look="footer" />
      )}
    </footer>
  );
}
