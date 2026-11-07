"use client";

import { useEffect } from "react";
import type { Locale } from "@/lib/i18n";

// Keeps <html lang> in step with the FR / EN switch without a full reload
// (screen readers and the browser's "Translate" use it).
export default function HtmlLang({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
