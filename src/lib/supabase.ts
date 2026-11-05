import { createClient } from "@supabase/supabase-js";

// These values come from your environment (.env.local on your computer, or
// your hosting provider's settings in production).
//
// Note: Next.js only exposes variables starting with NEXT_PUBLIC_ to the
// browser, and it needs to see them written out in full like this
// (process.env.NEXT_PUBLIC_...) so it can swap in the real values at build time.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Missing environment variable NEXT_PUBLIC_SUPABASE_URL. " +
      "Add it to .env.local (see .env.example) and restart the dev server.",
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "Missing environment variable NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Add it to .env.local (see .env.example) and restart the dev server.",
  );
}

// A single shared Supabase client. Import it anywhere with:
//   import { supabase } from "@/lib/supabase";
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
