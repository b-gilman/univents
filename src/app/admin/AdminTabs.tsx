import Link from "next/link";

// The tabs at the top of the admin area.
export default function AdminTabs({
  current,
}: {
  current: "review" | "events" | "clubs";
}) {
  const tabs = [
    { key: "review", label: "Review", href: "/admin" },
    { key: "events", label: "Live events", href: "/admin/events" },
    { key: "clubs", label: "Clubs", href: "/admin/organisers" },
  ] as const;
  return (
    <nav
      aria-label="Admin sections"
      className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-neutral-200 p-1"
    >
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={current === t.key ? "page" : undefined}
          className={
            "flex min-h-10 items-center justify-center rounded-lg text-sm font-semibold " +
            (current === t.key ? "bg-white shadow-sm" : "text-neutral-600")
          }
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
