import "server-only"; // build fails if this file is ever imported by browser code
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// A Supabase client with FULL access (it skips the security rules). Used only
// on the server: to save submitted events and for the admin page.
//
// It's created on first use, so the rest of the site keeps working even if
// SUPABASE_SECRET_KEY hasn't been set up yet.
let client: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error(
      "Missing SUPABASE_SECRET_KEY (or NEXT_PUBLIC_SUPABASE_URL). Add it to " +
        ".env.local and to Vercel → Settings → Environment Variables.",
    );
  }

  client = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export const POSTER_BUCKET = "event-images";
