import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext, supabaseForUser } from "@/lib/server/auth";

// Links in Supabase's emails (confirm your email, reset your password) come
// here: /auth/confirm?token_hash=…&type=…&next=…
// We check the one-time code with Supabase, which logs the student in, then
// send them on. This works even if they open the email on another device.

const TYPES: EmailOtpType[] = ["email", "signup", "recovery", "invite", "magiclink", "email_change"];

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const next = safeNext(params.get("next")) ?? "/account";

  if (tokenHash && type && TYPES.includes(type)) {
    const supabase = await supabaseForUser();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
    console.error("Email link check failed:", error.message);
  }

  // Expired, already used, or broken link.
  return NextResponse.redirect(new URL("/login?error=link", request.url));
}
