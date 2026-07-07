"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import MathTex from "@/components/MathTex";
import { useApp } from "@/lib/store";
import { ARCH, PALETTES } from "@/lib/theme";

const layerName = (layer: number) =>
  layer === ARCH.length - 1 ? "output layer" : `layer ${layer} (${ARCH[layer]} neurons)`;

/** a first-layer neuron's 784 weights drawn as a 28x28 image — literally the
 * pattern of pixels this neuron is looking for. */
function WeightHeatmap({ weights }: { weights: number[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const mode = useApp((s) => s.mode);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const p = PALETTES[mode];
    const pos = [
      parseInt(p.copper.slice(1, 3), 16),
      parseInt(p.copper.slice(3, 5), 16),
      parseInt(p.copper.slice(5, 7), 16),
    ];
    const neg = [
      parseInt(p.faint.slice(1, 3), 16),
      parseInt(p.faint.slice(3, 5), 16),
      parseInt(p.faint.slice(5, 7), 16),
    ];
    let max = 0;
    for (const w of weights) max = Math.max(max, Math.abs(w));
    const img = ctx.createImageData(28, 28);
    for (let i = 0; i < 784; i++) {
      const w = weights[i];
      const c = w >= 0 ? pos : neg;
      img.data[i * 4] = c[0];
      img.data[i * 4 + 1] = c[1];
      img.data[i * 4 + 2] = c[2];
      img.data[i * 4 + 3] = max > 0 ? Math.round((Math.abs(w) / max) * 255) : 0;
    }
    ctx.clearRect(0, 0, 28, 28);
    ctx.putImageData(img, 0, 0);
  }, [weights, mode]);
  return (
    <div className="flex flex-col gap-1">
      <canvas
        ref={ref}
        width={28}
        height={28}
        className="w-32 h-32 pixelated rounded border border-graphite bg-paper"
      />
      <span className="text-[10px] leading-snug text-faint">
        this neuron&apos;s 784 weights, drawn as pixels. orange pixels help it
        fire when inked, gray ones hold it back. this is genuinely what it
        looks for.
      </span>
    </div>
  );
}

/** signed micro-bars for a deeper neuron's incoming weights */
function WeightBars({ weights }: { weights: number[] }) {
  let max = 0;
  for (const w of weights) max = Math.max(max, Math.abs(w));
  return (
    <div className="flex flex-col gap-[3px]">
      {weights.map((w, j) => (
        <div key={j} className="flex items-center gap-1.5 font-mono text-[9px] text-faint">
          <span className="w-5 text-right">{j}</span>
          <div className="relative flex-1 h-[6px]">
            <div className="absolute inset-y-0 left-1/2 w-px bg-graphite" />
            <div
              className={`absolute inset-y-0 rounded-[1px] ${w >= 0 ? "bg-copper left-1/2" : "bg-faint right-1/2"}`}
              style={{ width: `${max > 0 ? (Math.abs(w) / max) * 50 : 0}%` }}
            />
          </div>
          <span className="w-11 text-right tabular-nums">{w.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

export default function Inspector() {
  const selection = useApp((s) => s.selection);
  const select = useApp((s) => s.select);
  const model = useApp((s) => s.model);
  const run = useApp((s) => s.run);
  const override = useApp((s) => s.override);
  const setOverride = useApp((s) => s.setOverride);
  const reducedMotion = useApp((s) => s.reducedMotion);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") select(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [select]);

  if (!model) return null;

  let body: React.ReactNode = null;
  let title = "";

  if (selection?.kind === "node") {
    const { layer, index } = selection;
    const acts = run?.result.layers[layer - 1];
    const weightsIn = model.layers[layer - 1].weights[index];
    const bias = model.layers[layer - 1].biases[index];
    const isOutput = layer === ARCH.length - 1;
    const overridden = override && override.layer === layer && override.index === index;
    title = isOutput ? `the "${index}" output` : `${layerName(layer)}, neuron ${index}`;

    body = (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2 font-mono text-[12px]">
          <div className="rounded bg-paper border border-graphite px-2 py-1.5">
            <div className="text-[9px] text-faint">weighted sum (z)</div>
            <div className="text-ink tabular-nums">{acts ? acts.z[index].toFixed(4) : "run first"}</div>
          </div>
          <div className="rounded bg-paper border border-graphite px-2 py-1.5">
            <div className="text-[9px] text-faint">{isOutput ? "probability" : "output (after relu)"}</div>
            <div className={`tabular-nums ${overridden ? "text-gold" : "text-ink"}`}>
              {acts
                ? isOutput
                  ? `${(acts.a[index] * 100).toFixed(2)}%`
                  : acts.a[index].toFixed(4)
                : "run first"}
            </div>
          </div>
        </div>

        <MathTex
          block
          className="text-ink"
          tex={
            isOutput
              ? `p_{${index}} = \\frac{e^{z_{${index}}}}{\\sum_{k=0}^{9} e^{z_k}}${
                  acts ? ` = ${(acts.a[index] * 100).toFixed(2)}\\%` : ""
                }`
              : `z_{${index}} = \\mathbf{w}_{${index}} \\cdot \\mathbf{a}^{(${layer - 1})} + \\underbrace{${bias.toFixed(3)}}_{\\text{bias}}${
                  acts ? ` = ${acts.z[index].toFixed(3)}` : ""
                }`
          }
        />

        {layer === 1 ? (
          <WeightHeatmap weights={weightsIn} />
        ) : (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-faint">
              its {weightsIn.length} incoming weights (orange = for, gray = against)
            </span>
            <div className="max-h-40 overflow-y-auto pr-1">
              <WeightBars weights={weightsIn} />
            </div>
          </div>
        )}

        {!isOutput && (
          <div className="flex flex-col gap-1.5 border-t border-graphite pt-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-ink">mess with it</span>
              {overridden && (
                <button
                  type="button"
                  onClick={() => setOverride(null)}
                  className="text-[11px] text-gold hover:text-ink underline underline-offset-2"
                >
                  put it back
                </button>
              )}
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(3, Math.ceil(((acts?.a[index] ?? 0) + 1) * 1.5))}
              step={0.05}
              value={overridden ? override.value : (acts?.a[index] ?? 0)}
              disabled={!run}
              onChange={(e) => setOverride({ layer, index, value: Number(e.target.value) })}
              aria-label="force this neuron's output to a value of your choosing"
            />
            <p className="text-[11px] leading-relaxed text-faint">
              {run
                ? "drag to force this neuron's output and watch everything downstream recompute. the prediction can actually change. this is real math, not an animation."
                : "run a drawing first, then you can mess with this neuron."}
            </p>
          </div>
        )}
      </div>
    );
  } else if (selection?.kind === "edge") {
    const { transition, from, to } = selection;
    const w = model.layers[transition].weights[to][from];
    const upstream = run?.result.layers[transition - 1].a[from];
    title = `one weight, layer ${transition} → ${transition === ARCH.length - 2 ? `"${to}" output` : `layer ${transition + 1}`}`;
    body = (
      <div className="flex flex-col gap-3">
        <div className="font-mono text-2xl tabular-nums text-ink">{w.toFixed(4)}</div>
        <MathTex
          block
          className="text-ink"
          tex={`w \\cdot a = ${w.toFixed(3)} \\times ${
            upstream !== undefined ? upstream.toFixed(3) : "a"
          }${upstream !== undefined ? ` = ${(w * upstream).toFixed(3)}` : ""}`}
        />
        <p className="text-[12px] leading-relaxed text-faint">
          {w >= 0
            ? "this weight is positive: when the neuron on the left fires, it pushes the one on the right to fire too. think of it as a vote in favor."
            : "this weight is negative: when the neuron on the left fires, it actively holds the one on the right back. the network learned to rule things out, not just in. that's most of how it avoids confusing similar digits."}
        </p>
        <p className="text-[11px] text-faint">
          the network has 55,626 of these. every single one was tuned during training.
        </p>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {selection && (
        <motion.aside
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 24 }}
          transition={{ type: "spring", stiffness: 380, damping: 34 }}
          className="panel rounded p-4 w-full max-w-xs max-h-[70vh] overflow-y-auto"
          aria-label="Inspector"
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <h3 className="text-[13px] font-medium text-ink">{title}</h3>
            <button
              type="button"
              onClick={() => select(null)}
              aria-label="close"
              className="text-faint hover:text-ink leading-none text-lg -mt-1"
            >
              ×
            </button>
          </div>
          {body}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
