// A search field. It's a plain form (method GET), so it works instantly and
// without JavaScript: submitting goes to e.g. /concordia/search?q=trivia.
export default function SearchBox({
  action,
  placeholder,
  defaultValue = "",
  autoFocus = false,
  className = "",
  hidden = {},
  label = "Search events",
}: {
  action: string;
  placeholder: string;
  defaultValue?: string;
  autoFocus?: boolean;
  className?: string;
  hidden?: Record<string, string>; // other filters to keep while searching
  label?: string; // read out by screen readers
}) {
  return (
    <form action={action} method="get" role="search" className={className}>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <label className="flex min-h-11 items-center gap-2 rounded-xl bg-card px-3 text-neutral-900 shadow-sm ring-1 ring-black/10 focus-within:ring-2 focus-within:ring-brand">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5 shrink-0 text-neutral-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4" />
        </svg>
        <span className="sr-only">{label}</span>
        <input
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder={placeholder}
          autoFocus={autoFocus}
          enterKeyHint="search"
          autoComplete="off"
          maxLength={100}
          className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none placeholder:text-neutral-400"
        />
      </label>
    </form>
  );
}
