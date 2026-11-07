import { setLanguage } from "@/app/language-actions";
import HtmlLang from "@/components/HtmlLang";
import { type Locale, messages } from "@/lib/i18n";

// The FR / EN button. A tiny form, so it works even before the page's
// JavaScript has loaded. `look` picks the style for where it sits.
export default function LanguageSwitch({
  locale,
  look = "header",
}: {
  locale: Locale;
  look?: "header" | "footer";
}) {
  const t = messages(locale);
  const other: Locale = locale === "fr" ? "en" : "fr";
  return (
    <form action={setLanguage}>
      <HtmlLang locale={locale} />
      <input type="hidden" name="lang" value={other} />
      <button
        type="submit"
        lang={other}
        aria-label={t.site.switchLabel}
        className={
          look === "header"
            ? "flex min-h-10 min-w-10 items-center justify-center rounded-full px-2 text-sm font-semibold text-white/80 ring-1 ring-white/30 active:bg-white/10"
            : "underline underline-offset-2"
        }
      >
        {look === "header" ? t.site.switchShort : t.site.switchTo}
      </button>
    </form>
  );
}
