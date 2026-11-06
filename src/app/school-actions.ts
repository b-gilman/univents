"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SCHOOL_COOKIE, getSchool } from "@/lib/schools";

// Remembers the visitor's school for a year, then opens its page.
export async function chooseSchool(fd: FormData) {
  const school = await getSchool(String(fd.get("school") ?? ""));
  if (!school) redirect("/?change=1");
  (await cookies()).set(SCHOOL_COOKIE, school.id, {
    maxAge: 365 * 24 * 60 * 60,
    path: "/",
    sameSite: "lax",
    secure: true,
    httpOnly: true,
  });
  redirect(`/${school.id}`);
}
