import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";

// Admin login, kept simple: one password (ADMIN_PASSWORD on Vercel). After a
// correct password we store a signed cookie, so you stay logged in for 30 days.
// The signature means nobody can fake the cookie without knowing the password.

const COOKIE = "admin_session";
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function adminPasswordConfigured() {
  return (process.env.ADMIN_PASSWORD ?? "").length >= 12;
}

// Secret used to sign the cookie. Changing ADMIN_PASSWORD logs everyone out.
function signingKey() {
  return createHash("sha256")
    .update(`${process.env.ADMIN_PASSWORD}|${process.env.SUPABASE_SECRET_KEY ?? ""}`)
    .digest();
}

function sign(expiresAt: number) {
  const mac = createHmac("sha256", signingKey()).update(String(expiresAt)).digest("hex");
  return `${expiresAt}.${mac}`;
}

function sameText(a: string, b: string) {
  // Compare hashes in constant time, so response timing reveals nothing.
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function passwordIsCorrect(input: string) {
  if (!adminPasswordConfigured()) return false;
  return sameText(input, process.env.ADMIN_PASSWORD!);
}

export async function startAdminSession() {
  const expiresAt = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  (await cookies()).set(COOKIE, sign(expiresAt), {
    httpOnly: true, // not readable by page scripts
    secure: true, //   only sent over HTTPS
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endAdminSession() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  await connection(); // only check for real visitors (it reads the clock)
  if (!adminPasswordConfigured()) return false;
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  const [expires] = value.split(".");
  const expiresAt = Number(expires);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now() / 1000) return false;
  return sameText(value, sign(expiresAt));
}

// Call at the top of EVERY admin action: actions can be called directly,
// without going through the admin page, so each one must check for itself.
export async function assertAdmin() {
  if (!(await isAdmin())) throw new Error("Not logged in as admin.");
}
