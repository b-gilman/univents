// The homepage. Styles are written "mobile first": the plain Tailwind classes
// apply to phones, and prefixed ones like `sm:` only kick in on wider screens.
export default function Home() {
  return (
    <main className="flex min-h-dvh flex-1 flex-col bg-concordia px-6 pt-[max(env(safe-area-inset-top),3rem)] pb-[max(env(safe-area-inset-bottom),2rem)] text-white">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
          Concordia University
        </p>

        <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
          Concordia Events
        </h1>

        <div className="mx-auto h-1 w-16 rounded-full bg-white/60" aria-hidden="true" />

        <p className="text-lg leading-relaxed text-white/85">
          Every club meetup, talk and party on campus — in one place.
        </p>

        <span className="mx-auto mt-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-5 py-2.5 text-base font-medium">
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" aria-hidden="true" />
          Coming soon
        </span>
      </div>
    </main>
  );
}
