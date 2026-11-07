import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { LOCALE_COOKIE, type Locale, isLocale, messages } from "@/lib/i18n";

// The visitor's language: their saved choice (FR / EN switch), otherwise the
// language their phone or browser asks for, otherwise English.
export const getLocale = cache(async (): Promise<Locale> => {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  const accept = (await headers()).get("accept-language") ?? "";
  return /^\s*fr\b/i.test(accept) ? "fr" : "en";
});

// Shortcut for server code: `const t = await getMessages()`, then `t.nav.search`.
export async function getMessages() {
  return messages(await getLocale());
}
