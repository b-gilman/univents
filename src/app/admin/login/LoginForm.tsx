"use client";

import { useActionState } from "react";
import { login } from "../actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, { error: "" });
  return (
    <form action={action} className="mt-4 flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="block min-h-11 w-full rounded-xl border-0 bg-white px-3 text-base ring-1 ring-black/15 focus:outline-none focus:ring-2 focus:ring-concordia"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-xl bg-neutral-900 px-4 font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Checking…" : "Log in"}
      </button>
    </form>
  );
}
