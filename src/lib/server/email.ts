import "server-only";

// The site's public address, for links inside emails.
// On Vercel this is filled in automatically; SITE_URL overrides it (e.g.
// once you have your own domain).
export function siteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

// Sends one email through Resend (https://resend.com).
// RESEND_API_KEY and EMAIL_FROM (e.g. "Univents <events@yourdomain.com>")
// must be set on Vercel.
export async function sendEmail(message: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!emailConfigured())
    return {
      ok: false,
      error: "Email isn't set up (RESEND_API_KEY / EMAIL_FROM).",
    };
  const base = process.env.RESEND_API_URL ?? "https://api.resend.com";
  try {
    const res = await fetch(`${base}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, ...message }),
    });
    if (!res.ok)
      return { ok: false, error: `Resend ${res.status}: ${await res.text()}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// Makes text safe to put inside an email's HTML.
export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
