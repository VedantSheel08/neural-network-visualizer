"use client";

import type { ForwardResult } from "@/lib/inference";

// Bar fills validated against the #0D1524 panel surface (dataviz six checks).
// Brighter palette tokens stay reserved for glows and text accents.
const BAR_FILL = "#2E9FCE";
const BAR_FILL_WINNER = "#D07F2E";

interface ReadoutProps {
  result: ForwardResult | null;
  /** False while the propagation animation is still traveling. */
  settled: boolean;
}

export default function Readout({ result, settled }: ReadoutProps) {
  const show = result !== null && settled;
  const probs = result ? Array.from(result.probabilities) : new Array<number>(10).fill(0);

  return (
    <div className="flex flex-col gap-4" aria-live="polite">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-[0.2em] text-signal/70">Output</span>
        <span className="text-[10px] tracking-wider text-trace">softmax · 10 classes</span>
      </div>

      <div className="flex items-center gap-4">
        <div
          className="w-20 h-20 shrink-0 rounded-sm border border-trace/60 bg-abyss grid place-items-center font-display text-5xl"
          style={{ color: show ? "var(--color-verdict)" : "var(--color-trace)" }}
        >
          {show ? result.prediction : "—"}
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[10px] uppercase tracking-[0.2em] text-trace">prediction</span>
          <span className="font-display text-xl text-core">
            {show ? `${(result.confidence * 100).toFixed(1)}%` : result ? "propagating…" : "awaiting signal"}
          </span>
          <span className="text-[10px] text-trace">
            {show ? "confidence" : result ? "" : "draw a digit, then run"}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-[6px]" role="img" aria-label="Probability for each digit 0 through 9">
        {probs.map((p, digit) => {
          const isWinner = show && digit === result.prediction;
          const width = show ? Math.max(p * 100, 0.5) : 0.5;
          return (
            <div key={digit} className="flex items-center gap-2 text-[11px]">
              <span className={`w-3 text-right ${isWinner ? "text-verdict" : "text-core/60"}`}>{digit}</span>
              <div className="flex-1 h-[10px] bg-abyss rounded-[3px] overflow-hidden">
                <div
                  className="h-full rounded-[3px] transition-[width] duration-500 motion-reduce:transition-none"
                  style={{ width: `${width}%`, background: isWinner ? BAR_FILL_WINNER : BAR_FILL }}
                />
              </div>
              <span className={`w-11 text-right tabular-nums ${isWinner ? "text-verdict" : "text-trace"}`}>
                {show ? `${(p * 100).toFixed(1)}%` : "·"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
