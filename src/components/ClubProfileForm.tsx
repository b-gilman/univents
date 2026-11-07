import ClubLogo from "@/components/ClubLogo";

// The "Club page" form (description, logo, Instagram, website), used by a
// club's organisers on their dashboard and by the admin on the Clubs tab.
// A plain form: the logo file goes to the server with the rest.
export default function ClubProfileForm({
  action,
  club,
  dark = false,
}: {
  action: (fd: FormData) => Promise<void>;
  club: {
    id: string;
    name: string;
    description: string | null;
    logo_url: string | null;
    instagram_url: string | null;
    website_url: string | null;
  };
  dark?: boolean; // admin style (black buttons)
}) {
  const input =
    "block min-h-11 w-full rounded-xl border-0 bg-card px-3 py-2 text-base ring-1 ring-black/15 focus:outline-none focus:ring-2 focus:ring-brand";
  return (
    <form action={action} className="flex flex-col gap-4 text-sm">
      <input type="hidden" name="org_id" value={club.id} />
      <label className="flex flex-col gap-1">
        <span className="font-medium">About the club</span>
        <textarea
          name="description"
          rows={4}
          maxLength={1000}
          defaultValue={club.description ?? ""}
          placeholder="What you do, who can join, when you meet…"
          className={input}
        />
      </label>
      <div className="flex flex-col gap-1">
        <span className="font-medium">Logo</span>
        <div className="flex items-center gap-3">
          <ClubLogo name={club.name} logoUrl={club.logo_url} />
          <input
            name="logo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="min-w-0 flex-1 text-sm file:mr-3 file:min-h-10 file:rounded-full file:border-0 file:bg-neutral-100 file:px-4 file:font-semibold file:text-neutral-800"
          />
        </div>
        <span className="text-xs text-neutral-500">
          Square JPG, PNG or WebP, under 2 MB.
        </span>
        {club.logo_url && (
          <label className="mt-1 flex items-center gap-2">
            <input type="checkbox" name="remove_logo" className="h-4 w-4" />
            Remove the current logo
          </label>
        )}
      </div>
      <label className="flex flex-col gap-1">
        <span className="font-medium">Instagram</span>
        <input
          name="instagram"
          defaultValue={club.instagram_url ?? ""}
          placeholder="@yourclub"
          // Checked in the browser first, so a typo doesn't lose the rest of
          // the form. (The server checks again.)
          pattern="\s*(@?[A-Za-z0-9._]{1,30}|(https?://)?(www\.)?instagram\.com/[A-Za-z0-9._]{1,30}/?(\?.*)?)\s*"
          title="Your club's Instagram name, like @yourclub"
          autoCapitalize="none"
          autoCorrect="off"
          className={input}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-medium">Website</span>
        <input
          name="website"
          // Plain text (not type="url") so "yourclub.ca" works without
          // typing https://; the server adds it.
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          defaultValue={club.website_url ?? ""}
          placeholder="yourclub.ca"
          className={input}
        />
      </label>
      <button
        type="submit"
        className={
          "flex min-h-11 items-center justify-center rounded-xl px-4 font-semibold text-white active:opacity-80 " +
          (dark ? "bg-ink" : "bg-brand")
        }
      >
        Save club page
      </button>
    </form>
  );
}
