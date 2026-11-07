import "server-only";
import { randomUUID } from "node:crypto";
import { posterType } from "@/lib/server/submissions";
import { POSTER_BUCKET, supabaseAdmin } from "@/lib/server/supabase-admin";

// Saving a club's page (description, logo, Instagram, website). Used by the
// club's organisers AND the admin; each caller checks permission FIRST.

const LOGO_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

// "@chessconcordia", "chessconcordia" or a full link → the profile's link.
export function instagramUrl(input: string): string | null | "invalid" {
  const value = input.trim();
  if (!value) return null;
  const handle =
    /^@?([A-Za-z0-9._]{1,30})$/.exec(value)?.[1] ??
    /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([A-Za-z0-9._]{1,30})\/?(?:\?.*)?$/i.exec(
      value,
    )?.[1];
  return handle ? `https://www.instagram.com/${handle}/` : "invalid";
}

function websiteUrl(input: string): string | null | "invalid" {
  const value = input.trim();
  if (!value) return null;
  try {
    const url = new URL(
      /^https?:\/\//i.test(value) ? value : `https://${value}`,
    );
    if (!url.hostname.includes(".")) return "invalid";
    return url.toString();
  } catch {
    return "invalid";
  }
}

export async function saveClubProfile(
  clubId: string,
  fd: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const description = String(fd.get("description") ?? "").trim();
  if (description.length > 1000)
    return {
      ok: false,
      error: "The description must be under 1000 characters.",
    };

  const instagram = instagramUrl(String(fd.get("instagram") ?? ""));
  if (instagram === "invalid")
    return {
      ok: false,
      error: "Enter an Instagram name like @yourclub, or its link.",
    };

  const website = websiteUrl(String(fd.get("website") ?? ""));
  if (website === "invalid")
    return {
      ok: false,
      error: "Enter a website link like https://yourclub.ca.",
    };

  const update: Record<string, string | null> = {
    description: description || null,
    instagram_url: instagram,
    website_url: website,
  };

  const db = supabaseAdmin();
  const logo = fd.get("logo");
  if (logo instanceof File && logo.size > 0) {
    if (logo.size > LOGO_MAX_BYTES)
      return { ok: false, error: "The logo must be under 2 MB." };
    const bytes = new Uint8Array(await logo.arrayBuffer());
    const kind = posterType(bytes);
    if (!kind)
      return { ok: false, error: "The logo must be a JPG, PNG or WebP image." };
    const path = `clubs/${clubId}-${randomUUID().slice(0, 8)}.${kind.ext}`;
    const { error } = await db.storage
      .from(POSTER_BUCKET)
      .upload(path, bytes, { contentType: kind.mime });
    if (error) {
      console.error("Logo upload failed:", error.message);
      return {
        ok: false,
        error: "Couldn't upload the logo. Please try again.",
      };
    }
    update.logo_url = db.storage
      .from(POSTER_BUCKET)
      .getPublicUrl(path).data.publicUrl;
  } else if (fd.get("remove_logo") === "on") {
    update.logo_url = null;
  }

  const { error } = await db
    .from("organizations")
    .update(update)
    .eq("id", clubId);
  if (error) {
    console.error("Saving club profile failed:", error.message);
    return { ok: false, error: "Couldn't save. Please try again." };
  }
  return { ok: true };
}
