import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { allCampuses, getSchools } from "@/lib/schools";
import { isAdmin } from "@/lib/server/admin-auth";
import { importConfigured } from "@/lib/server/event-import";
import AdminShell from "../AdminShell";
import AdminTabs from "../AdminTabs";
import ImportTool from "./ImportTool";

export const metadata: Metadata = {
  title: "Import · Admin",
  robots: { index: false, follow: false },
};

// Admin → Import: add an event from screenshots of a club's post.
export default function ImportPage() {
  return (
    <AdminShell>
      <AdminTabs current="import" />
      <Suspense fallback={<p className="text-neutral-500">Loading…</p>}>
        <Content />
      </Suspense>
    </AdminShell>
  );
}

async function Content() {
  if (!(await isAdmin())) redirect("/admin/login");
  if (!importConfigured()) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl bg-card p-5 text-sm shadow-sm ring-1 ring-black/5">
        <h1 className="text-lg font-semibold">Import isn&apos;t set up yet</h1>
        <p>
          It uses Claude to read screenshots. Add an Anthropic API key to Vercel
          as <code className="font-mono">ANTHROPIC_API_KEY</code>, then
          redeploy. See the README for the steps.
        </p>
      </div>
    );
  }
  const schools = (await getSchools()) ?? [];
  return (
    <>
      <h1 className="mb-2 text-xl font-bold">Import from screenshots</h1>
      <ImportTool
        schools={schools.map((s) => ({
          id: s.id,
          name: s.name,
          campuses: allCampuses(s),
        }))}
      />
    </>
  );
}
