import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSchools } from "@/lib/schools";
import { isAdmin } from "@/lib/server/admin-auth";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import AdminShell from "../AdminShell";
import AdminTabs from "../AdminTabs";
import ConfirmButton from "../ConfirmButton";
import { addOrganiser, removeOrganiser, setVerified } from "../actions";

export const metadata: Metadata = {
  title: "Organisers · Admin",
  robots: { index: false, follow: false },
};

export default function OrganisersPage(props: PageProps<"/admin/organisers">) {
  return (
    <AdminShell>
      <AdminTabs current="clubs" />
      <Suspense fallback={<p className="text-neutral-500">Loading…</p>}>
        <Content {...props} />
      </Suspense>
    </AdminShell>
  );
}

type Org = { id: string; name: string; verified: boolean; school_id: string };
type Member = {
  organization_id: string;
  user_id: string;
  full_name: string | null;
  email: string;
};

async function Content({ searchParams }: PageProps<"/admin/organisers">) {
  if (!(await isAdmin())) redirect("/admin/login");
  const query = await searchParams;
  const db = supabaseAdmin();
  const [{ data: orgs }, { data: members }, schools] = await Promise.all([
    db
      .from("organizations")
      .select("id, name, verified, school_id")
      .order("name"),
    db.rpc("admin_org_members"),
    getSchools(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">Clubs and organisers</h1>
        <p className="text-sm text-neutral-600">
          Organisers can post and manage their club&apos;s events and see
          who&apos;s coming. Add them by the email they signed up with.{" "}
          <strong>Verified</strong> clubs&apos; events go live without review.
        </p>
      </div>
      {typeof query.msg === "string" && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {query.msg}
        </p>
      )}
      {typeof query.error === "string" && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {query.error}
        </p>
      )}

      {(schools ?? []).map((school) => {
        const schoolOrgs = ((orgs ?? []) as Org[]).filter(
          (o) => o.school_id === school.id,
        );
        if (schoolOrgs.length === 0) return null;
        return (
          <section key={school.id} className="flex flex-col gap-3">
            <h2
              className="font-semibold"
              style={{ color: school.primary_color }}
            >
              {school.name}
            </h2>
            {schoolOrgs.map((org) => {
              const orgMembers = ((members ?? []) as Member[]).filter(
                (m) => m.organization_id === org.id,
              );
              return (
                <article
                  key={org.id}
                  id={`org-${org.id}`}
                  className="flex flex-col gap-3 rounded-2xl bg-white p-4 text-sm shadow-sm ring-1 ring-black/5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold">{org.name}</h3>
                    <form action={setVerified}>
                      <input type="hidden" name="org_id" value={org.id} />
                      <input
                        type="hidden"
                        name="verified"
                        value={org.verified ? "no" : "yes"}
                      />
                      <button
                        type="submit"
                        className={
                          "min-h-10 rounded-full px-3 text-xs font-semibold ring-1 " +
                          (org.verified
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                            : "bg-white text-neutral-700 ring-black/15")
                        }
                      >
                        {org.verified
                          ? "✓ Verified"
                          : "Not verified · tap to verify"}
                      </button>
                    </form>
                  </div>

                  {orgMembers.length > 0 ? (
                    <ul className="divide-y divide-neutral-100 rounded-xl ring-1 ring-black/5">
                      {orgMembers.map((m) => (
                        <li
                          key={m.user_id}
                          className="flex items-center justify-between gap-3 px-3 py-2"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium">
                              {m.full_name ?? "—"}
                            </span>
                            <span className="block truncate text-neutral-500">
                              {m.email}
                            </span>
                          </span>
                          <form action={removeOrganiser}>
                            <input type="hidden" name="org_id" value={org.id} />
                            <input
                              type="hidden"
                              name="user_id"
                              value={m.user_id}
                            />
                            <ConfirmButton
                              message={`Remove ${m.full_name ?? m.email} as an organiser of ${org.name}?`}
                              className="min-h-10 px-2 text-sm font-semibold text-red-700"
                            >
                              Remove
                            </ConfirmButton>
                          </form>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-neutral-500">No organisers yet.</p>
                  )}

                  <form action={addOrganiser} className="flex gap-2">
                    <input type="hidden" name="org_id" value={org.id} />
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="Their account email"
                      className="block min-h-11 min-w-0 flex-1 rounded-xl border-0 bg-white px-3 text-base ring-1 ring-black/15 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                    <button
                      type="submit"
                      className="min-h-11 shrink-0 rounded-xl bg-neutral-900 px-4 font-semibold text-white"
                    >
                      Add
                    </button>
                  </form>
                </article>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
