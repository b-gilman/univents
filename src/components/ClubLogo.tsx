// A club's logo, or its first letter in the school's colour if it has none.
export default function ClubLogo({
  name,
  logoUrl,
  size = "md",
}: {
  name: string;
  logoUrl: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const box =
    size === "lg"
      ? "h-20 w-20 rounded-2xl text-3xl"
      : size === "md"
        ? "h-12 w-12 rounded-xl text-xl"
        : "h-9 w-9 rounded-lg text-base";
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        className={`${box} shrink-0 bg-card object-cover ring-1 ring-black/10`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${box} flex shrink-0 items-center justify-center bg-brand font-bold text-white`}
    >
      {name.trim()[0]?.toUpperCase() ?? "?"}
    </span>
  );
}
