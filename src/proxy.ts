import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Runs before each page loads. Two jobs:
//  1. Logged-in students: renew their login if it's about to expire, so they
//     stay logged in (Supabase logins last an hour and must be refreshed).
//  2. The front door ("/"): a visitor who already picked a school goes
//     straight to it, so they never see the picker flash.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const loggedIn = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));

  if (loggedIn) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        // httpOnly: page scripts can't read the login (we only use it on the
        // server), so it can't be stolen by malicious code on a page.
        cookieOptions: {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
        },
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet, headers) => {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
            Object.entries(headers).forEach(([key, value]) =>
              response.headers.set(key, value),
            );
          },
        },
      },
    );
    await supabase.auth.getClaims(); // refreshes the login cookies if needed
  }

  if (request.nextUrl.pathname === "/") {
    const school = request.cookies.get("school")?.value;
    const changing = request.nextUrl.searchParams.get("change") === "1";
    if (school && /^[a-z0-9-]{2,40}$/.test(school) && !changing) {
      const redirect = NextResponse.redirect(
        new URL(`/${school}`, request.url),
      );
      response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
      return redirect;
    }
  }

  return response;
}

export const config = {
  // Every page, but not images, styles, scripts or posters.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:webp|png|jpg|jpeg|svg|ico)$).*)",
  ],
};
