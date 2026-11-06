import { NextResponse, type NextRequest } from "next/server";
import { formatPlace, getEventById } from "@/lib/events";
import { SITE } from "@/lib/site";

// /events/<id>/calendar → a calendar file (.ics) for the event. Phones and
// computers open it in Apple Calendar, Outlook, etc. as "Add to calendar".

// Calendar files need times like 20261114T220000Z (UTC).
const icsTime = (iso: string) =>
  new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

// Commas, semicolons, backslashes and line breaks must be escaped.
const icsText = (text: string) =>
  text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");

// Lines longer than 75 bytes must be folded (continued with a space).
function fold(line: string) {
  const out: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest) > 75) {
    let cut = 75;
    while (Buffer.byteLength(rest.slice(0, cut)) > 75) cut--;
    out.push(rest.slice(0, cut));
    rest = " " + rest.slice(cut);
  }
  out.push(rest);
  return out.join("\r\n");
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/events/[id]/calendar">,
) {
  const { id } = await params;
  const result = await getEventById(id);
  if (!result.ok || !result.event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }
  const e = result.event;
  const end =
    e.ends_at ?? new Date(Date.parse(e.starts_at) + 2 * 3600e3).toISOString();
  const url = new URL(`/events/${e.id}`, request.url).toString();
  const description = [
    e.description,
    e.organization_name ? `Hosted by ${e.organization_name}` : null,
    url,
  ]
    .filter(Boolean)
    .join("\n\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${SITE.name}//Events//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.id}@${SITE.name.toLowerCase()}`,
    `DTSTAMP:${icsTime(new Date().toISOString())}`,
    `DTSTART:${icsTime(e.starts_at)}`,
    `DTEND:${icsTime(end)}`,
    `SUMMARY:${icsText(e.title)}`,
    `LOCATION:${icsText(formatPlace(e.campus, e.location))}`,
    `DESCRIPTION:${icsText(description)}`,
    `URL:${url}`,
    // A reminder 1 hour before, like most calendar apps suggest.
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsText(e.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  const safeName =
    e.title
      .replace(/[^\w\- ]+/g, "")
      .trim()
      .slice(0, 60) || "event";
  return new NextResponse(lines.map(fold).join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}.ics"`,
    },
  });
}
