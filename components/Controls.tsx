"use client";

import { useApp } from "@/lib/store";
import { ARCH, STEP_CHECKPOINTS } from "@/lib/theme";

const STEP_LABELS = [
  "the drawing",
  ...ARCH.slice(1, -1).map((_, i) => `layer ${i + 1}`),
  "the answer",
];

export default function Controls() {
  const speed = useApp((s) => s.speed);
  const setSpeed = useApp((s) => s.setSpeed);
  const stepMode = useApp((s) => s.stepMode);
  const setStepMode = useApp((s) => s.setStepMode);
  const stepIndex = useApp((s) => s.stepIndex);
  const nextStep = useApp((s) => s.nextStep);
  const run = useApp((s) => s.run);
  const settled = useApp((s) => s.settled);
  const execute = useApp((s) => s.execute);
  const input = useApp((s) => s.input);

  const stepping = stepMode && run && !settled;

  return (
    <div className="flex flex-col gap-3">
      <span className="text-[13px] font-medium text-ink">watch it slower</span>

      <label className="flex items-center gap-3 text-[12px] text-faint">
        <span className="w-10">speed</span>
        <input
          type="range"
          min={0.25}
          max={2}
          step={0.25}
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          disabled={stepMode}
          className="flex-1 disabled:opacity-40"
          aria-label="how fast the signal travels"
        />
        <span className="w-10 text-right font-mono tabular-nums text-ink">{speed.toFixed(2)}×</span>
      </label>

      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-[12px] text-faint cursor-pointer">
          <input
            type="checkbox"
            checked={stepMode}
            onChange={(e) => setStepMode(e.target.checked)}
            className="accent-[var(--copper)]"
          />
          one layer at a time
        </label>
        <button
          type="button"
          onClick={nextStep}
          disabled={!stepping || stepIndex >= STEP_CHECKPOINTS.length - 1}
          className="px-3 py-1.5 text-[12px] rounded border border-graphite text-ink hover:border-copper disabled:opacity-30 disabled:cursor-not-allowed"
        >
          next layer
        </button>
      </div>

      {stepMode && (
        <div className="flex items-center gap-1" aria-hidden>
          {STEP_LABELS.map((label, i) => (
            <div
              key={label}
              className={`flex-1 h-1 rounded-full ${run && i <= stepIndex ? "bg-copper" : "bg-graphite/60"}`}
              title={label}
            />
          ))}
        </div>
      )}
      {stepping && (
        <p className="text-[11px] text-faint">
          paused after {STEP_LABELS[stepIndex]}. hit &ldquo;next layer&rdquo; when you&apos;re ready.
        </p>
      )}

      <button
        type="button"
        onClick={() => execute("run")}
        disabled={!input || !run}
        className="self-start px-3 py-1.5 text-[12px] rounded border border-graphite text-faint hover:text-ink hover:border-copper disabled:opacity-30"
      >
        run it again
      </button>
    </div>
  );
}
