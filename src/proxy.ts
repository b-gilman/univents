import { NextResponse, type NextRequest } from "next/server";

// Runs before the page loads. On the front door ("/"), a visitor who already
// picked a school goes straight to it, so they never see the picker flash.
// (The picker itself double-checks that the school still exists.)
export function proxy(request: NextRequest) {
  const school = request.cookies.get("school")?.value;
  const changing = request.nextUrl.searchParams.get("change") === "1";
  if (school && /^[a-z0-9-]{2,40}$/.test(school) && !changing) {
    return NextResponse.redirect(new URL(`/${school}`, request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: "/" };
