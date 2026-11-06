// Logs a failed database read (shows in Vercel → Logs), except when Next.js
// cut short one of its own background pre-renders: that's expected and
// harmless, because the result of that pre-render is thrown away.
export function logLoadError(what: string, message: string) {
  if (message.includes("During prerendering")) return;
  console.error(what, message);
}
