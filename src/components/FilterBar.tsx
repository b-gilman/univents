import Link from "next/link";
import { type Filters, filtersHref, hasFilters } from "@/lib/event-list";

// The row of filter buttons. Each button is a link to the same page with that
// filter switched on or off, so it works without any JavaScript.
// `campuses` = the school's own campuses (e.g. SGW, Loyola).
export default function FilterBar({
  filters,
  campuses,
  basePath,
}: {
  filters: Filters;
  campuses: string[];
  basePath: string;
}) {
  const toggle = (key: "when", value: "today" | "week") => ({
    ...filters,
    [key]: filters[key] === value ? undefined : value,
  });

  const chips: { label: string; active: boolean; next: Filters }[] = [
    { label: "Today", active: filters.when === "today", next: toggle("when", "today") },
    { label: "This week", active: filters.when === "week", next: toggle("when", "week") },
    {
      label: "Free",
      active: Boolean(filters.free),
      next: { ...filters, free: filters.free ? undefined : true },
    },
    ...campuses.map((campus) => ({
      label: campus,
      active: filters.campus === campus,
      next: { ...filters, campus: filters.campus === campus ? undefined : campus },
    })),
  ];

  return (
    <nav
      aria-label="Filter events"
      className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {chips.map((chip) => (
        <Link
          key={chip.label}
          href={filtersHref(chip.next, basePath)}
          scroll={false}
          aria-pressed={chip.active}
          className={
            "flex min-h-10 shrink-0 items-center rounded-full px-4 text-sm font-semibold ring-1 transition-colors " +
            (chip.active
              ? "bg-brand text-white ring-brand"
              : "bg-white text-neutral-800 ring-black/10 active:bg-neutral-100")
          }
        >
          {chip.label}
        </Link>
      ))}
      {hasFilters(filters) && (
        <Link
          href={basePath}
          scroll={false}
          className="flex min-h-10 shrink-0 items-center px-3 text-sm font-semibold text-brand underline-offset-2 active:underline"
        >
          Clear
        </Link>
      )}
    </nav>
  );
}
