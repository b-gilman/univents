"use client";

import { useEffect } from "react";

// Tells the server "this event page was viewed" (for the club's stats), once
// per event per browser visit, after the page has loaded. Prefetching links
// and search-engine bots don't run it, so they aren't counted.
export default function ViewPing({ eventId }: { eventId: string }) {
  useEffect(() => {
    const key = `kuku-viewed-${eventId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Private browsing may block storage: count it anyway.
    }
    fetch(`/api/events/${eventId}/view`, {
      method: "POST",
      keepalive: true,
    }).catch(() => {});
  }, [eventId]);
  return null;
}
