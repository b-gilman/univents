import { logLoadError } from "@/lib/log";
import { supabase } from "@/lib/supabase";

// How many people are going to each event: Map(event id → count).
// Uses a database function that returns only numbers, never names.
export async function getRsvpCounts(eventIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (eventIds.length === 0) return counts;
  const { data, error } = await supabase.rpc("rsvp_counts", { event_ids: eventIds });
  if (error) {
    logLoadError("Failed to load RSVP counts:", error.message);
    return counts;
  }
  for (const row of data as { event_id: string; going: number }[]) {
    counts.set(row.event_id, Number(row.going));
  }
  return counts;
}
