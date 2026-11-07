import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SCHOOL_COOKIE, getSchools, schoolTheme } from "@/lib/schools";
import { SITE } from "@/lib/site";
import LanguageSwitch from "@/components/LanguageSwitch";
import SiteFooter from "@/components/SiteFooter";
import { messages } from "@/lib/i18n";
import { getLocale } from "@/lib/server/locale";
import { chooseSchool } from "./school-actions";

// The front door. Returning visitors go straight to their school's page;
// first-time visitors (or "Change school") pick from the list.
export default function Home(props: PageProps<"/">) {
  return (
    <Suspense fallback={<Frame />}>
      <SchoolPicker {...props} />
    </Suspense>
  );
}

// The page around the list. Without a language (= still loading) it shows
// no words, so it never flashes the wrong language.
function Frame({
  locale,
  children,
}: {
  locale?: "en" | "fr";
  children?: React.ReactNode;
}) {
  const t = locale ? messages(locale) : null;
  return (
    <div
      lang={locale}
      className="flex min-h-dvh flex-1 flex-col bg-neutral-100 text-neutral-900"
    >
      <header className="bg-brand px-5 pt-[max(env(safe-area-inset-top),2rem)] pb-8 text-white">
        <div className="mx-auto max-w-xl">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{SITE.name}</h1>
            {locale && <LanguageSwitch locale={locale} />}
          </div>
          <p className="mt-2 min-h-12 text-white/85">{t?.site.tagline}</p>
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-6 pb-[max(env(safe-area-inset-bottom),2rem)]">
        <h2 className="mb-3 min-h-7 text-lg font-semibold">
          {t?.picker.choose}
        </h2>
        {children ?? (
          <div className="h-20 animate-pulse rounded-2xl bg-card ring-1 ring-black/5" />
        )}
        <SiteFooter locale={locale} />
      </main>
    </div>
  );
}

async function SchoolPicker({ searchParams }: PageProps<"/">) {
  const changing = (await searchParams).change === "1";
  const [schools, locale] = await Promise.all([getSchools(), getLocale()]);
  const t = messages(locale).picker;
  const saved = (await cookies()).get(SCHOOL_COOKIE)?.value;

  if (!changing && saved && schools?.some((s) => s.id === saved))
    redirect(`/${saved}`);

  return <Frame locale={locale}>{list()}</Frame>;

  function list() {
    if (!schools || schools.length === 0) {
      return (
        <p className="rounded-2xl bg-card p-6 text-center text-neutral-600 shadow-sm ring-1 ring-black/5">
          {t.loadError}
        </p>
      );
    }

    return (
      <ul className="flex flex-col gap-3">
        {schools.map((school) => (
          <li key={school.id}>
            <form action={chooseSchool}>
              <input type="hidden" name="school" value={school.id} />
              <button
                type="submit"
                style={schoolTheme(school)}
                className="flex min-h-16 w-full items-center gap-4 rounded-2xl bg-card p-4 text-left shadow-sm ring-1 ring-black/5 active:bg-neutral-50"
              >
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-lg font-bold text-white"
                >
                  {school.short_name[0]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{school.name}</span>
                  {school.campuses.length > 0 && (
                    <span className="block truncate text-sm text-neutral-500">
                      {school.campuses.join(" · ")}
                    </span>
                  )}
                </span>
                {saved === school.id && (
                  <span className="text-sm font-medium text-brand">
                    {t.current}
                  </span>
                )}
                <span aria-hidden="true" className="text-neutral-400">
                  ›
                </span>
              </button>
            </form>
          </li>
        ))}
      </ul>
    );
  }
}
