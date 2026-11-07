import { cache } from "react";
import { logLoadError } from "@/lib/log";
import { supabase } from "@/lib/supabase";

// Clubs (the `organizations` table). Everyone can read them.

export type Club = {
  id: string;
  name: string;
  verified: boolean;
  school_id: string;
  description: string | null;
  logo_url: string | null;
  instagram_url: string | null;
  website_url: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FIELDS =
  "id, name, verified, school_id, description, logo_url, instagram_url, website_url";

// One club, for its page. `cache`: the page and its link preview share one
// database request.
export const getClub = cache(
  async (
    id: string,
  ): Promise<{ ok: true; club: Club | null } | { ok: false }> => {
    if (!UUID.test(id)) return { ok: true, club: null };
    const { data, error } = await supabase
      .from("organizations")
      .select(FIELDS)
      .eq("id", id)
      .maybeSingle();
    if (error) {
      logLoadError("Failed to load club:", error.message);
      return { ok: false };
    }
    return { ok: true, club: data as Club | null };
  },
);

// All of a school's clubs, A to Z.
export async function getClubs(schoolId: string): Promise<Club[] | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select(FIELDS)
    .eq("school_id", schoolId)
    .order("name");
  if (error) {
    logLoadError("Failed to load clubs:", error.message);
    return null;
  }
  return data as Club[];
}

// How many students follow a club (a number only: who follows is private).
export async function getFollowerCount(clubId: string): Promise<number> {
  const { data, error } = await supabase.rpc("follower_count", { org: clubId });
  if (error) {
    logLoadError("Failed to count followers:", error.message);
    return 0;
  }
  return Number(data) || 0;
}
