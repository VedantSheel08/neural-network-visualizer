"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/store";

/** plain text switch. no pill, no spring, just does the thing. */
export default function ThemeToggle() {
  const mode = useApp((s) => s.mode);
  const setMode = useApp((s) => s.setMode);

  // adopt whatever the pre-paint script decided (stored choice or dark default)
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    useApp.setState({ mode: isDark ? "dark" : "light" });
  }, []);

  const dark = mode === "dark";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? "switch to light mode" : "switch to dark mode"}
      onClick={() => setMode(dark ? "light" : "dark")}
      className="text-[12px] text-faint hover:text-ink border border-graphite px-2.5 py-1.5 md:py-1"
    >
      {dark ? "lights on" : "lights off"}
    </button>
  );
}
