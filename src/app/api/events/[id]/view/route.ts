import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabase-admin";

// POST /api/events/<id>/view: counts one view of an event's page (sent by
// the page itself, once per browser visit). Stores a number per day only:
// nothing about who viewed it.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless/i;

export async function POST(
  request: NextRequest,
  { params }: RouteContext<"/api/events/[id]/view">,
) {
  const { id } = await params;
  const agent = request.headers.get("user-agent") ?? "";
  if (UUID.test(id) && !BOT.test(agent)) {
    try {
      const { error } = await supabaseAdmin().rpc("record_event_view", {
        p_event: id,
      });
      if (error) console.error("Counting a view failed:", error.message);
    } catch (err) {
      console.error("Counting a view failed:", err);
    }
  }
  return new NextResponse(null, { status: 204 });
}
