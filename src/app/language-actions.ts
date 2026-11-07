"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n";

// The FR / EN switch. Saves the choice for a year; changing a cookie in an
// action makes Next.js redraw the current page, now in the new language.
export async function setLanguage(fd: FormData) {
  const lang = fd.get("lang");
  if (!isLocale(lang)) return;
  (await cookies()).set(LOCALE_COOKIE, lang, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
