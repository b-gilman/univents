import "server-only";
import { supabaseAdmin } from "@/lib/server/supabase-admin";

// Reading/writing submissions for the admin page. Uses the full-access client,
// so ONLY call these after checking the admin login.

export type PendingEvent = {
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
  submission_id: string | null;
  school_id: string;
};

export type Submission = {
  id: string;
  org_name: string;
  contact_email: string;
  created_at: string;
};

export type PendingGroup = {
  key: string; // submission id (or event id for events without one)
  submission: Submission | null;
  events: PendingEvent[]; // all dates, soonest first
  matchedOrg: { id: string; name: string } | null; // existing club with the same name
};

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const normalize = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");

async function allOrgs() {
  const { data, error } = await supabaseAdmin().from("organizations").select("id, name");
  if (error) throw error;
  return data as { id: string; name: string }[];
}

export async function loadPendingGroups(): Promise<PendingGroup[]> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("events")
    .select("*")
    .eq("status", "pending")
    .order("starts_at", { ascending: true });
  if (error) throw error;
  const events = data as PendingEvent[];

  const ids = [...new Set(events.map((e) => e.submission_id).filter(Boolean))] as string[];
  const submissions = new Map<string, Submission>();
  if (ids.length > 0) {
    const { data: subs, error: subError } = await db
      .from("submissions")
      .select("id, org_name, contact_email, created_at")
      .in("id", ids);
    if (subError) throw subError;
    for (const s of subs as Submission[]) submissions.set(s.id, s);
  }

  const orgs = await allOrgs();
  const groups = new Map<string, PendingGroup>();
  for (const e of events) {
    const key = e.submission_id ?? e.id;
    let group = groups.get(key);
    if (!group) {
      const submission = e.submission_id ? (submissions.get(e.submission_id) ?? null) : null;
      const matchedOrg = submission
        ? (orgs.find((o) => normalize(o.name) === normalize(submission.org_name)) ?? null)
        : null;
      group = { key, submission, events: [], matchedOrg };
      groups.set(key, group);
    }
    group.events.push(e);
  }
  return [...groups.values()];
}

export async function loadGroup(submissionId: string): Promise<PendingGroup | null> {
  if (!UUID.test(submissionId)) return null;
  const groups = await loadPendingGroups();
  return groups.find((g) => g.key === submissionId) ?? null;
}

// The club's record in `organizations`: reuse one with the same name, or
// create it (not verified) the first time a club is approved.
export async function findOrCreateOrg(name: string, schoolId: string): Promise<string> {
  const existing = (await allOrgs()).find((o) => normalize(o.name) === normalize(name));
  if (existing) return existing.id;
  const { data, error } = await supabaseAdmin()
    .from("organizations")
    .insert({ name: name.trim(), verified: false, school_id: schoolId })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

// Which column links the events of a group: submission_id, or the event's own
// id for a single pending event that wasn't submitted through the form.
export function groupFilter(group: PendingGroup) {
  return group.submission
    ? { column: "submission_id", value: group.submission.id }
    : { column: "id", value: group.events[0].id };
}
