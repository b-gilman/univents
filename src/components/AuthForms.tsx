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
import { type Locale, messages } from "@/lib/i18n";

const input =
  "block min-h-11 w-full rounded-xl border-0 bg-card px-3 py-2 text-base ring-1 ring-black/15 focus:outline-none focus:ring-2 focus:ring-brand";
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
  locale,
}: {
  schools: { id: string; name: string }[];
  defaultSchool: string | null;
  next: string | null;
  locale: Locale;
}) {
  const t = messages(locale).auth;
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
      <Field label={t.fullName} error={e.full_name}>
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
      <Field label={t.email} error={e.email}>
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
      <Field label={t.password} error={e.password} hint={t.atLeast8}>
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
      <Field label={t.school} error={e.school}>
        <select
          name="school"
          required
          defaultValue={v.school || defaultSchool || ""}
          className={input}
        >
          <option value="" disabled>
            {t.chooseSchool}
          </option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      <button type="submit" disabled={pending} className={button}>
        {pending ? t.creating : t.createAccount}
      </button>
      <p className="-mt-2 text-center text-xs text-neutral-500">
        {t.agreeStart}{" "}
        <Link href="/privacy" className="underline">
          {t.privacyPolicy}
        </Link>
        {t.agreeEnd}
      </p>
      <p className="text-center text-sm text-neutral-600">
        {t.haveAccount}{" "}
        <Link
          href={withNext("/login", next)}
          className="font-semibold text-brand"
        >
          {t.logIn}
        </Link>
      </p>
    </form>
  );
}

export function LoginForm({
  next,
  locale,
}: {
  next: string | null;
  locale: Locale;
}) {
  const t = messages(locale).auth;
  const [state, action, pending] = useActionState<AuthState, FormData>(
    logIn,
    {},
  );
  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error && <Alert>{state.error}</Alert>}
      {next && <input type="hidden" name="next" value={next} />}
      <Field label={t.email}>
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
      <Field label={t.password}>
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
        {t.forgotLink}
      </Link>
      <button type="submit" disabled={pending} className={button}>
        {pending ? t.loggingIn : t.logIn}
      </button>
      <p className="text-center text-sm text-neutral-600">
        {t.newHere}{" "}
        <Link
          href={withNext("/signup", next)}
          className="font-semibold text-brand"
        >
          {t.createAnAccount}
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm({ locale }: { locale: Locale }) {
  const t = messages(locale).auth;
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
      <Field label={t.email}>
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
        {pending ? t.sending : t.emailMeLink}
      </button>
      <p className="text-center text-sm text-neutral-600">
        {t.remembered}{" "}
        <Link href="/login" className="font-semibold text-brand">
          {t.logIn}
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ locale }: { locale: Locale }) {
  const t = messages(locale).auth;
  const [state, action, pending] = useActionState<AuthState, FormData>(
    updatePassword,
    {},
  );
  const e = state.errors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error && <Alert>{state.error}</Alert>}
      <Field label={t.newPassword} error={e.password} hint={t.atLeast8}>
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
      <Field label={t.typeAgain} error={e.confirm}>
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
        {pending ? t.saving : t.saveNewPassword}
      </button>
    </form>
  );
}
