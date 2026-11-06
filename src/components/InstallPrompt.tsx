"use client";

// A small, dismissible tip on school pages: "Add Univents to your home screen".
// - Android (Chrome etc.): shows an "Install" button that opens the real prompt.
// - iPhone/iPad Safari: shows how to do it (Share → Add to Home Screen), since
//   Apple doesn't allow an install button.
// - Hidden if already installed, on computers, or after "Not now".

import { useEffect, useState } from "react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<unknown>;
};

const DISMISSED = "univents-install-dismissed";

export default function InstallPrompt({ appName }: { appName: string }) {
  const [mode, setMode] = useState<"hidden" | "android" | "ios">("hidden");
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISSED) === "1";
    } catch {}
    const installed =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (dismissed || installed) return;

    const ua = navigator.userAgent;
    const isIos =
      /iPhone|iPad|iPod/.test(ua) ||
      (ua.includes("Mac") && "ontouchend" in document);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    // Decide after the page has painted, so the tip never delays the page.
    const timer = setTimeout(() => {
      if (isIos && isSafari) setMode("ios");
    }, 0);

    const onPrompt = (e: Event) => {
      e.preventDefault(); // we show our own button instead of the browser's bar
      setInstallEvent(e as InstallEvent);
      setMode("android");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED, "1");
    } catch {}
    setMode("hidden");
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setMode("hidden");
  }

  if (mode === "hidden") return null;

  return (
    <div
      role="region"
      aria-label={`Install ${appName}`}
      className="mb-4 flex items-start gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/icon-192.png"
        alt=""
        width={40}
        height={40}
        className="h-10 w-10 shrink-0 rounded-xl"
      />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">Get {appName} on your home screen</p>
        {mode === "ios" ? (
          <p className="mt-0.5 text-neutral-600">
            Tap <ShareIcon /> <strong>Share</strong>, then{" "}
            <strong>Add to Home Screen</strong>.
          </p>
        ) : (
          <p className="mt-0.5 text-neutral-600">
            Open it like an app, in one tap.
          </p>
        )}
        <div className="mt-2 flex gap-2">
          {mode === "android" && (
            <button
              type="button"
              onClick={install}
              className="min-h-10 rounded-full bg-brand px-4 font-semibold text-white active:opacity-80"
            >
              Install
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            className="min-h-10 rounded-full px-3 font-medium text-neutral-600 active:bg-neutral-100"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="inline h-4 w-4 align-[-2px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </svg>
  );
}
