"use client";

// The Sign up and Log in forms (they run in the browser to show errors and
// a "please wait" state).

import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import {
  type AuthState,
  logIn,
  requestPasswordReset,
  signUp,
  updatePassword,
} from "@/app/account/actions";

const input =
  "block min-h-11 w-full rounded-xl border-0 bg-white px-3 py-2 text-base ring-1 ring-black/15 focus:outline-none focus:ring-2 focus:ring-brand";
const button =
  "flex min-h-12 w-full items-center justify-center rounded-xl bg-brand px-4 text-base font-semibold text-white active:opacity-80 disabled:opacity-60";

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && !error && (
        <span className="text-xs text-neutral-500">{hint}</span>
      )}
      {error && <span className="text-sm text-red-700">{error}</span>}
    </label>
  );
}

function Alert({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
    >
      {children}
    </p>
  );
}

const withNext = (path: string, next: string | null) =>
  next ? `${path}?next=${encodeURIComponent(next)}` : path;

export function SignupForm({
  schools,
  defaultSchool,
  next,
}: {
  schools: { id: string; name: string }[];
  defaultSchool: string | null;
  next: string | null;
}) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    signUp,
    {},
  );
  const v = state.values ?? {};
  const e = state.errors ?? {};

  if (state.notice) {
    return (
      <p className="rounded-xl bg-emerald-50 px-4 py-3 font-medium text-emerald-800">
        {state.notice}
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error && <Alert>{state.error}</Alert>}
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="Full name" error={e.full_name}>
        <input
          name="full_name"
          required
          minLength={2}
          maxLength={100}
          autoComplete="name"
          defaultValue={v.full_name}
          className={input}
        />
      </Field>
      <Field label="Email" error={e.email}>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          defaultValue={v.email}
          className={input}
        />
      </Field>
      <Field label="Password" error={e.password} hint="At least 8 characters.">
        <input
          name="password"
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          className={input}
        />
      </Field>
      <Field label="School" error={e.school}>
        <select
          name="school"
          required
          defaultValue={v.school || defaultSchool || ""}
          className={input}
        >
          <option value="" disabled>
            Choose your school
          </option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      <button type="submit" disabled={pending} className={button}>
        {pending ? "Creating your account…" : "Create account"}
      </button>
      <p className="-mt-2 text-center text-xs text-neutral-500">
        By creating an account you agree to how we handle your information in
        our{" "}
        <Link href="/privacy" className="underline">
          privacy policy
        </Link>
        . The club hosting an event you RSVP to can see your name.
      </p>
      <p className="text-center text-sm text-neutral-600">
        Already have an account?{" "}
        <Link
          href={withNext("/login", next)}
          className="font-semibold text-brand"
        >
          Log in
        </Link>
      </p>
    </form>
  );
}

export function LoginForm({ next }: { next: string | null }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    logIn,
    {},
  );
  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error && <Alert>{state.error}</Alert>}
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="Email">
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          defaultValue={state.values?.email}
          className={input}
        />
      </Field>
      <Field label="Password">
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={input}
        />
      </Field>
      <Link
        href={withNext("/forgot-password", next)}
        className="-mt-2 self-end text-sm font-medium text-brand"
      >
        Forgot your password?
      </Link>
      <button type="submit" disabled={pending} className={button}>
        {pending ? "Logging in…" : "Log in"}
      </button>
      <p className="text-center text-sm text-neutral-600">
        New here?{" "}
        <Link
          href={withNext("/signup", next)}
          className="font-semibold text-brand"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    requestPasswordReset,
    {},
  );
  if (state.notice) {
    return (
      <p className="rounded-xl bg-emerald-50 px-4 py-3 font-medium text-emerald-800">
        {state.notice}
      </p>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error && <Alert>{state.error}</Alert>}
      <Field label="Email">
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          defaultValue={state.values?.email}
          className={input}
        />
      </Field>
      <button type="submit" disabled={pending} className={button}>
        {pending ? "Sending…" : "Email me a reset link"}
      </button>
      <p className="text-center text-sm text-neutral-600">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-brand">
          Log in
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    updatePassword,
    {},
  );
  const e = state.errors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error && <Alert>{state.error}</Alert>}
      <Field
        label="New password"
        error={e.password}
        hint="At least 8 characters."
      >
        <input
          name="password"
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          className={input}
        />
      </Field>
      <Field label="Type it again" error={e.confirm}>
        <input
          name="confirm"
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          className={input}
        />
      </Field>
      <button type="submit" disabled={pending} className={button}>
        {pending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
