import type { CSSProperties } from "react";
import { cache } from "react";
import { connection } from "next/server";
import { logLoadError } from "@/lib/log";
import { supabase } from "@/lib/supabase";

// Schools come from the `schools` table in Supabase. Adding a school there
// (name, colour, campuses) is all it takes to support it on the site.

export type School = {
  id: string; //            used in addresses: /concordia
  name: string; //          "Concordia University"
  short_name: string; //    "Concordia"
  primary_color: string; // "#912338"
  campuses: string[]; //    ["SGW", "Loyola"]
  time_zone: string;
};

// Always offered in addition to a school's own campuses.
export const EXTRA_CAMPUSES = ["Off-campus", "Online"];

export function allCampuses(school: School) {
  return [...school.campuses, ...EXTRA_CAMPUSES];
}

// The cookie that remembers which school a visitor picked.
export const SCHOOL_COOKIE = "school";

// All active schools, alphabetically. `cache` = fetched once per page view.
export const getSchools = cache(async (): Promise<School[] | null> => {
  await connection(); // load for real visitors, not during background prerendering
  const { data, error } = await supabase
    .from("schools")
    .select("id, name, short_name, primary_color, campuses, time_zone")
    .order("name");
  if (error) {
    logLoadError("Failed to load schools from Supabase:", error.message);
    return null;
  }
  return data as School[];
});

export async function getSchool(id: string): Promise<School | null> {
  return (await getSchools())?.find((s) => s.id === id) ?? null;
}

// Puts the school's colour into the page, so every `bg-brand`, `text-brand`
// etc. inside uses it. (globals.css: --color-brand: var(--brand))
export function schoolTheme(school: School | null): CSSProperties | undefined {
  return school ? ({ "--brand": school.primary_color } as CSSProperties) : undefined;
}
