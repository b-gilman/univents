import "server-only";
import {
  getCurrentUser,
  supabaseForUser,
  type CurrentUser,
} from "@/lib/server/auth";

// Organiser accounts: students linked to clubs (organization_members table).
// All reads here go through the student's own login, so the database's
// security rules decide what they can see.

export type Organisation = {
  id: string;
  name: string;
  verified: boolean;
  school_id: string;
};

export type OrgEvent = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  campus: string;
  location: string | null;
  category: string;
  image_url: string | null;
  signup_url: string | null;
  info_url: string | null;
  price_cents: number | null;
  status: "published" | "pending" | "rejected" | "draft";
  submission_id: string | null;
  organization_id: string;
  school_id: string;
};

export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The clubs the logged-in student organises (empty if none / logged out).
export async function myOrganisations(): Promise<Organisation[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await supabaseForUser();
  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id);
  const ids = (memberships ?? []).map((m) => m.organization_id as string);
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from("organizations")
    .select("id, name, verified, school_id")
    .in("id", ids)
    .order("name");
  return (data ?? []) as Organisation[];
}

// The club, if the logged-in student organises it; otherwise null.
// Call this at the start of EVERY organiser page and action.
export async function organiserOf(
  orgId: string,
): Promise<{ user: CurrentUser; org: Organisation } | null> {
  if (!UUID.test(orgId)) return null;
  const user = await getCurrentUser();
  if (!user) return null;
  const org = (await myOrganisations()).find((o) => o.id === orgId);
  return org ? { user, org } : null;
}

// All of a club's events (any status), soonest first.
export async function orgEvents(orgId: string): Promise<OrgEvent[]> {
  const supabase = await supabaseForUser();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("organization_id", orgId)
    .order("starts_at", { ascending: true });
  if (error) console.error("Loading club events failed:", error.message);
  return (data ?? []) as OrgEvent[];
}

// Names of students going to an event. The database only answers for
// organisers of the event's club.
export async function attendees(eventId: string) {
  const supabase = await supabaseForUser();
  const { data, error } = await supabase.rpc("event_attendees", {
    p_event: eventId,
  });
  if (error) console.error("Loading attendees failed:", error.message);
  return (data ?? []) as { full_name: string; rsvped_at: string }[];
}

// Page views of a club's events: { total, last7 } per event id. Empty if the
// stats update hasn't been run in Supabase yet.
export async function clubEventViews(orgId: string) {
  const supabase = await supabaseForUser();
  const { data, error } = await supabase.rpc("club_event_views", {
    org: orgId,
  });
  if (error) console.error("Loading event views failed:", error.message);
  const views = new Map<string, { total: number; last7: number }>();
  for (const row of (data ?? []) as {
    event_id: string;
    views_total: number;
    views_7d: number | null;
  }[]) {
    views.set(row.event_id, {
      total: Number(row.views_total) || 0,
      last7: Number(row.views_7d) || 0,
    });
  }
  return views;
}
