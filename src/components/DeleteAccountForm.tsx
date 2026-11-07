"use client";

// "Delete my account": hidden behind a tap, with a warning and a checkbox,
// so nobody deletes their account by accident.

import { useActionState } from "react";
import { type DeleteState, deleteAccount } from "@/app/account/actions";
import { type Locale, messages } from "@/lib/i18n";

export default function DeleteAccountForm({ locale }: { locale: Locale }) {
  const t = messages(locale).account;
  const [state, action, pending] = useActionState<DeleteState, FormData>(
    deleteAccount,
    {},
  );
  return (
    <details className="group">
      <summary className="flex min-h-11 cursor-pointer list-none items-center font-semibold text-red-700 [&::-webkit-details-marker]:hidden">
        {t.deleteAccount}
        <span aria-hidden="true" className="ml-1 group-open:rotate-90">
          ›
        </span>
      </summary>
      <form action={action} className="mt-2 flex flex-col gap-3">
        <p className="rounded-xl bg-red-50 px-4 py-3 text-red-800">
          {t.deleteWarning}
        </p>
        {state.error && (
          <p role="alert" className="font-medium text-red-700">
            {state.error}
          </p>
        )}
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            name="confirm"
            required
            className="h-5 w-5 shrink-0 accent-red-600"
          />
          {t.deleteConfirm}
        </label>
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 w-full rounded-xl bg-red-600 px-4 font-semibold text-white active:opacity-80 disabled:opacity-60"
        >
          {pending ? t.deleting : t.deleteButton}
        </button>
      </form>
    </details>
  );
}
