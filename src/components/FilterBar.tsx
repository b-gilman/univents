import Link from "next/link";
import { type Filters, filtersHref, hasFilters } from "@/lib/event-list";

// The row of filter buttons. Each button is a link to the same page with that
// filter switched on or off, so it works without any JavaScript.
export default function FilterBar({ filters }: { filters: Filters }) {
  const chips: { label: string; active: boolean; next: Filters }[] = [
    {
      label: "Today",
      active: filters.when === "today",
      next: { ...filters, when: filters.when === "today" ? undefined : "today" },
    },
    {
      label: "This week",
      active: filters.when === "week",
      next: { ...filters, when: filters.when === "week" ? undefined : "week" },
    },
    {
      label: "Free",
      active: Boolean(filters.free),
      next: { ...filters, free: filters.free ? undefined : true },
    },
    {
      label: "SGW",
      active: filters.campus === "SGW",
      next: { ...filters, campus: filters.campus === "SGW" ? undefined : "SGW" },
    },
    {
      label: "Loyola",
      active: filters.campus === "Loyola",
      next: {
        ...filters,
        campus: filters.campus === "Loyola" ? undefined : "Loyola",
      },
    },
  ];

  return (
    <nav
      aria-label="Filter events"
      className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {chips.map((chip) => (
        <Link
          key={chip.label}
          href={filtersHref(chip.next)}
          scroll={false}
          aria-pressed={chip.active}
          className={
            "flex min-h-10 shrink-0 items-center rounded-full px-4 text-sm font-semibold ring-1 transition-colors " +
            (chip.active
              ? "bg-concordia text-white ring-concordia"
              : "bg-white text-neutral-800 ring-black/10 active:bg-neutral-100")
          }
        >
          {chip.label}
        </Link>
      ))}
      {hasFilters(filters) && (
        <Link
          href="/"
          scroll={false}
          className="flex min-h-10 shrink-0 items-center px-3 text-sm font-semibold text-concordia underline-offset-2 active:underline"
        >
          Clear
        </Link>
      )}
    </nav>
  );
}
