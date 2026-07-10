"use client";

import { useApp } from "@/lib/store";

/**
 * The answer panel. One hue for the bars (single series); the winner is the
 * full-opacity one with bold labels. Everything here is the actual softmax
 * output of the last run.
 */
export default function Readout() {
  const run = useApp((s) => s.run);
  const settled = useApp((s) => s.settled);
  const override = useApp((s) => s.override);
  const result = run?.result ?? null;
  const show = result !== null && settled;
  const probs = result ? Array.from(result.probabilities) : new Array<number>(10).fill(0);

  return (
    <div className="flex flex-col gap-4" aria-live="polite">
      <span className="text-[13px] font-medium text-ink">what it thinks you drew</span>

      <div className="flex items-center gap-4">
        <div
          className="w-20 h-20 shrink-0 border border-graphite bg-paper grid place-items-center font-mono text-5xl"
          style={{ color: show ? "var(--gold)" : "var(--graphite)" }}
        >
          {show ? result.prediction : "?"}
        </div>
        <div className="flex flex-col gap-0.5 min-w-0 text-[12px]">
          <span className="font-mono text-2xl tabular-nums text-ink">
            {show ? `${(result.confidence * 100).toFixed(1)}%` : "--"}
          </span>
          <span className="text-faint">
            {show
              ? override
                ? "sure (but you're messing with a neuron right now)"
                : "sure"
              : result
                ? "thinking…"
                : "waiting for a drawing"}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-[5px]" role="img" aria-label="probability for each digit, 0 through 9">
        {probs.map((prob, digit) => {
          const isWinner = show && digit === result.prediction;
          const width = show ? Math.max(prob * 100, 0.75) : 0.75;
          return (
            <div key={digit} className="flex items-center gap-2 font-mono text-[11px]">
              <span className={`w-3 text-right ${isWinner ? "text-gold font-bold" : "text-faint"}`}>
                {digit}
              </span>
              <div className="flex-1 h-[9px] bg-paper overflow-hidden border border-graphite/50">
                <div
                  className={`h-full bg-copper transition-[width] duration-500 motion-reduce:transition-none ${
                    isWinner ? "" : "opacity-55"
                  }`}
                  style={{ width: `${width}%` }}
                />
              </div>
              <span className={`w-12 text-right tabular-nums ${isWinner ? "text-gold font-bold" : "text-faint"}`}>
                {show ? `${(prob * 100).toFixed(1)}%` : "·"}
              </span>
            </div>
          );
        })}
      </div>
      {show && (
        <p className="text-[11px] leading-relaxed text-faint">
          these ten numbers always add up to 100%. that&apos;s the softmax
          step, there&apos;s a whole section on it below.
        </p>
      )}
    </div>
  );
}
