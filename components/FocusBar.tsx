"use client";

import { useApp } from "@/lib/store";

const STOPS: { label: string; f: number }[] = [
  { label: "your drawing", f: 0 },
  { label: "layer 1", f: 1 },
  { label: "layer 2", f: 2 },
  { label: "layer 3", f: 3 },
  { label: "layer 4", f: 4 },
  { label: "the answer", f: 5 },
];

/** buttons that fly the camera up close to each part of the network */
export default function FocusBar() {
  const focus = useApp((s) => s.focus);
  const setFocus = useApp((s) => s.setFocus);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[12px] text-faint mr-1">look closer:</span>
      {STOPS.map(({ label, f }) => (
        <button
          key={f}
          type="button"
          onClick={() => setFocus(f)}
          className={`px-2.5 py-1 text-[12px] border ${
            focus === f
              ? "border-copper text-copper"
              : "border-ink/25 text-ink/80 hover:border-copper hover:text-copper"
          }`}
        >
          {label}
        </button>
      ))}
      <button
        type="button"
        onClick={() => setFocus(-1)}
        className="px-2.5 py-1 text-[12px] border border-ink/25 text-faint hover:border-copper hover:text-copper"
      >
        back out
      </button>
    </div>
  );
}
