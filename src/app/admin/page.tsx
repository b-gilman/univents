import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { formatEventTime, formatPlace, formatPrice } from "@/lib/events";
import { isAdmin } from "@/lib/server/admin-auth";
import { loadPendingGroups, type PendingGroup } from "@/lib/server/admin-data";
import AdminShell from "./AdminShell";
import ConfirmButton from "./ConfirmButton";
import { approveSubmission, logout, rejectSubmission } from "./actions";

export const metadata: Metadata = {
  title: "Review events · Admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <AdminShell
      right={
        <form action={logout}>
          <button type="submit" className="min-h-11 px-2 text-sm text-white/80">
            Log out
          </button>
        </form>
      }
    >
      <Suspense fallback={<p className="text-neutral-500">Loading…</p>}>
        <PendingList />
      </Suspense>
    </AdminShell>
  );
}

async function PendingList() {
  if (!(await isAdmin())) redirect("/admin/login");

  let groups: PendingGroup[];
  try {
    groups = await loadPendingGroups();
  } catch (err) {
    console.error("Admin: failed to load pending events", err);
    return (
      <p className="rounded-2xl bg-red-50 p-4 text-red-800">
        Couldn&apos;t load submissions. Check that SUPABASE_SECRET_KEY is set on Vercel and the
        latest migration has been run.
      </p>
    );
  }

  return (
    <>
      <h1 className="mb-4 text-xl font-bold">
        Waiting for review <span className="text-neutral-500">({groups.length})</span>
      </h1>
      {groups.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-neutral-600 shadow-sm ring-1 ring-black/5">
          Nothing to review right now 🎉
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {groups.map((g) => (
            <li key={g.key}>
              <PendingCard group={g} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function PendingCard({ group }: { group: PendingGroup }) {
  const e = group.events[0];
  const sub = group.submission;
  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      {e.image_url && (
        <Image src={e.image_url} alt="" width={1080} height={1080} unoptimized
          className="h-auto max-h-80 w-full bg-neutral-200 object-contain" />
      )}
      <div className="flex flex-col gap-3 p-4 text-sm">
        <div>
          <h2 className="text-lg font-semibold">{e.title}</h2>
          {sub && (
            <p className="text-neutral-600">
              by <strong>{sub.org_name}</strong>{" "}
              {group.matchedOrg ? (
                <span className="text-emerald-700">· existing club</span>
              ) : (
                <span className="text-amber-700">· new club (created on approval)</span>
              )}
            </p>
          )}
          {sub && (
            <p className="text-neutral-600">
              Contact:{" "}
              <a href={`mailto:${sub.contact_email}`} className="text-brand underline">
                {sub.contact_email}
              </a>
            </p>
          )}
        </div>

        <div>
          <p className="font-medium">
            {group.events.length === 1 ? "When" : `${group.events.length} dates`}
          </p>
          <ul className="text-neutral-700">
            {group.events.slice(0, 8).map((d) => (
              <li key={d.id}>{formatEventTime(d.starts_at, d.ends_at)}</li>
            ))}
            {group.events.length > 8 && <li>+ {group.events.length - 8} more</li>}
          </ul>
        </div>

        <p className="text-neutral-700">
          📍 {formatPlace(e.campus, e.location)} · {formatPrice(e.price_cents)} ·{" "}
          <span className="capitalize">{e.category}</span>
        </p>
        {e.description && (
          <p className="whitespace-pre-line text-neutral-700">{e.description}</p>
        )}
        {(e.signup_url || e.info_url) && (
          <div className="flex flex-col gap-1 break-all">
            {e.signup_url && (
              <a href={e.signup_url} target="_blank" rel="noopener noreferrer" className="text-brand underline">
                Sign-up link: {e.signup_url}
              </a>
            )}
            {e.info_url && (
              <a href={e.info_url} target="_blank" rel="noopener noreferrer" className="text-brand underline">
                Post link: {e.info_url}
              </a>
            )}
          </div>
        )}
        {sub && (
          <p className="text-xs text-neutral-500">
            Submitted {new Date(sub.created_at).toLocaleString("en-CA", { timeZone: "America/Montreal" })}
          </p>
        )}

        <div className="mt-1 grid grid-cols-3 gap-2">
          <form action={approveSubmission} className="col-span-3">
            <input type="hidden" name="submission_id" value={group.key} />
            <button type="submit"
              className="min-h-12 w-full rounded-xl bg-emerald-600 px-4 font-semibold text-white active:opacity-80">
              Approve{group.events.length > 1 ? ` all ${group.events.length} dates` : ""}
            </button>
          </form>
          <Link href={`/admin/${group.key}`}
            className="col-span-2 flex min-h-11 items-center justify-center rounded-xl font-semibold ring-1 ring-black/15 active:bg-neutral-100">
            Edit
          </Link>
          <form action={rejectSubmission}>
            <input type="hidden" name="submission_id" value={group.key} />
            <ConfirmButton message={`Reject “${e.title}”? It won't appear on the site.`}
              className="min-h-11 w-full rounded-xl font-semibold text-red-700 ring-1 ring-red-200 active:bg-red-50">
              Reject
            </ConfirmButton>
          </form>
        </div>
      </div>
    </article>
  );
}
