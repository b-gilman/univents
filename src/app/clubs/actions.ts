"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, supabaseForUser } from "@/lib/server/auth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Follow ↔ unfollow a club. The database's rules make sure students can only
// add or remove their OWN follows.
export async function toggleFollow(fd: FormData) {
  const clubId = String(fd.get("club_id") ?? "");
  if (!UUID.test(clubId)) return;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/clubs/${clubId}`)}`);

  const supabase = await supabaseForUser();
  const { data: existing, error: readError } = await supabase
    .from("follows")
    .select("organization_id")
    .eq("organization_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (readError) {
    console.error("Follow lookup failed:", readError.message);
    throw new Error("Couldn't update. Please try again.");
  }

  const { error } = existing
    ? await supabase
        .from("follows")
        .delete()
        .eq("organization_id", clubId)
        .eq("user_id", user.id)
    : await supabase.from("follows").insert({ organization_id: clubId });
  if (error) {
    console.error("Follow update failed:", error.message);
    throw new Error("Couldn't update. Please try again.");
  }

  revalidatePath(`/clubs/${clubId}`);
  revalidatePath("/account");
}
