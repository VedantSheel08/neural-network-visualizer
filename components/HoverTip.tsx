"use client";

import { useApp } from "@/lib/store";

/** Screen-space readout that follows the pointer over nodes and fibers. */
export default function HoverTip() {
  const hover = useApp((s) => s.hover);
  if (!hover) return null;
  return (
    <div
      className="pointer-events-none fixed z-50 panel rounded-sm px-3 py-2 font-mono text-[11px] leading-relaxed"
      style={{ left: hover.x + 14, top: hover.y + 14 }}
      role="status"
    >
      <div className="text-faint">{hover.title}</div>
      {hover.lines.map((l, i) => (
        <div key={i} className="text-ink">
          {l}
        </div>
      ))}
    </div>
  );
}
