"use client";

import { useEffect } from "react";

// Sets the phone's address-bar colour (the "theme-color" tag) to `color`
// while this page is open. The site default comes from the root layout.
export default function ThemeColor({ color }: { color: string }) {
  useEffect(() => {
    let tag = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    if (!tag) {
      tag = document.createElement("meta");
      tag.name = "theme-color";
      document.head.appendChild(tag);
    }
    const previous = tag.content;
    tag.content = color;
    return () => {
      tag.content = previous;
    };
  }, [color]);
  return null;
}
