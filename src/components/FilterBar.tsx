import Link from "next/link";
import { type Filters, filtersHref, hasFilters } from "@/lib/event-list";
import { CATEGORIES } from "@/lib/submission-rules";

// Category buttons, in the order students most often look for them.
export const CATEGORY_LABELS: Record<(typeof CATEGORIES)[number], string> = {
  party: "🎉 Party",
  social: "👋 Social",
  sports: "⚽ Sports",
  arts: "🎨 Arts",
  cultural: "🌏 Cultural",
  academic: "📚 Academic",
  career: "💼 Career",
  other: "✨ Other",
};

// Two rows of filter buttons. Each button is a link to the same page with that
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

  const main: Chip[] = [
    {
      label: "Today",
      active: filters.when === "today",
      next: toggle("when", "today"),
    },
    {
      label: "This week",
      active: filters.when === "week",
      next: toggle("when", "week"),
    },
    {
      label: "Free",
      active: Boolean(filters.free),
      next: { ...filters, free: filters.free ? undefined : true },
    },
    ...campuses.map((campus) => ({
      label: campus,
      active: filters.campus === campus,
      next: {
        ...filters,
        campus: filters.campus === campus ? undefined : campus,
      },
    })),
  ];

  const categories: Chip[] = (
    Object.keys(CATEGORY_LABELS) as (typeof CATEGORIES)[number][]
  ).map((c) => ({
    label: CATEGORY_LABELS[c],
    active: filters.category === c,
    next: { ...filters, category: filters.category === c ? undefined : c },
  }));

  return (
    <div className="flex flex-col gap-2">
      <ChipRow label="Filter events" chips={main} basePath={basePath}>
        {hasFilters({ ...filters, q: undefined }) && (
          <Link
            href={filtersHref({ q: filters.q }, basePath)}
            scroll={false}
            className="flex min-h-10 shrink-0 items-center px-3 text-sm font-semibold text-brand underline-offset-2 active:underline"
          >
            Clear
          </Link>
        )}
      </ChipRow>
      <ChipRow
        label="Categories"
        chips={categories}
        basePath={basePath}
        small
      />
    </div>
  );
}

type Chip = { label: string; active: boolean; next: Filters };

function ChipRow({
  label,
  chips,
  basePath,
  small = false,
  children,
}: {
  label: string;
  chips: Chip[];
  basePath: string;
  small?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <nav
      aria-label={label}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {chips.map((chip) => (
        <Link
          key={chip.label}
          href={filtersHref(chip.next, basePath)}
          scroll={false}
          aria-pressed={chip.active}
          className={
            "flex shrink-0 items-center rounded-full font-semibold ring-1 transition-colors " +
            (small ? "min-h-9 px-3 text-[13px] " : "min-h-10 px-4 text-sm ") +
            (chip.active
              ? "bg-brand text-white ring-brand"
              : "bg-white text-neutral-800 ring-black/10 active:bg-neutral-100")
          }
        >
          {chip.label}
        </Link>
      ))}
      {children}
    </nav>
  );
}
