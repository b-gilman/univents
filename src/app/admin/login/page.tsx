import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import AdminShell from "../AdminShell";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: `Admin login · ${SITE.name}`,
  robots: { index: false, follow: false }, // keep admin pages out of Google
};

export default function AdminLoginPage() {
  return (
    <AdminShell>
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h1 className="text-xl font-bold">Log in</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Enter the admin password to review submitted events.
        </p>
        <LoginForm />
      </div>
    </AdminShell>
  );
}
