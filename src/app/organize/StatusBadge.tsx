// Shows an event's status to organisers.
export default function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, [string, string]> = {
    published: ["Live", "bg-emerald-50 text-emerald-700"],
    pending: ["Waiting for review", "bg-amber-50 text-amber-800"],
    rejected: ["Not approved", "bg-red-50 text-red-700"],
    draft: ["Hidden", "bg-neutral-100 text-neutral-700"],
  };
  const [label, cls] = styles[status] ?? [
    status,
    "bg-neutral-100 text-neutral-700",
  ];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}
