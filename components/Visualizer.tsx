"use client";

import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import DrawPad, { type DrawPadHandle } from "@/components/DrawPad";
import Readout from "@/components/Readout";
import type { RunState } from "@/components/NetworkScene";
import {
  forwardPass,
  inputRegionContributions,
  loadWeights,
  type ModelWeights,
} from "@/lib/inference";
import { RUN_MS } from "@/lib/theme";

const NetworkScene = dynamic(() => import("@/components/NetworkScene"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center text-trace text-xs tracking-[0.3em] uppercase">
      initializing scope…
    </div>
  ),
});

/** Signed per-edge signal (weight x upstream activation) for a weight layer. */
function edgeSignals(weights: number[][], upstream: Float32Array): Float32Array {
  const nOut = weights.length;
  const nIn = weights[0].length;
  const out = new Float32Array(nOut * nIn);
  for (let i = 0; i < nOut; i++) {
    for (let j = 0; j < nIn; j++) out[i * nIn + j] = weights[i][j] * upstream[j];
  }
  return out;
}

export default function Visualizer() {
  const [model, setModel] = useState<ModelWeights | null>(null);
  const [modelError, setModelError] = useState(false);
  const [input, setInput] = useState<Float32Array | null>(null);
  const [run, setRun] = useState<RunState | null>(null);
  const [settled, setSettled] = useState(false);
  const [lowPower, setLowPower] = useState(false);
  const padRef = useRef<DrawPadHandle>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = useReducedMotion() ?? false;

  useEffect(() => {
    loadWeights().then(setModel).catch(() => setModelError(true));
    setLowPower(
      window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768
    );
  }, []);

  const handleRun = useCallback(() => {
    if (!model || !input) return;
    const result = forwardPass(model, input);
    const edges: RunState["edges"] = [
      inputRegionContributions(model.layers[0], input, 4),
      edgeSignals(model.layers[1].weights, result.layers[0].a),
      edgeSignals(model.layers[2].weights, result.layers[1].a),
    ];
    setRun((prev) => ({ id: (prev?.id ?? 0) + 1, result, edges }));
    setSettled(false);
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(
      () => setSettled(true),
      reducedMotion ? 0 : RUN_MS
    );
  }, [model, input, reducedMotion]);

  const handleClear = useCallback(() => {
    padRef.current?.clear();
  }, []);

  const panel = {
    initial: reducedMotion ? {} : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
  };

  return (
    <section className="relative md:h-dvh md:min-h-[640px] flex flex-col md:block">
      {/* The network is the page. */}
      <div className="relative h-[52dvh] min-h-[320px] md:h-full md:absolute md:inset-0">
        <NetworkScene
          input={input}
          run={run}
          reducedMotion={reducedMotion}
          lowPower={lowPower}
        />
      </div>

      {/* Header strip */}
      <motion.header
        {...panel}
        transition={{ duration: 0.5 }}
        className="absolute top-0 inset-x-0 flex items-baseline justify-between gap-4 px-4 md:px-6 py-3 pointer-events-none"
      >
        <h1 className="font-display text-lg md:text-xl tracking-wide text-core">
          FORWARD<span className="text-signal"> PASS</span>
        </h1>
        <p className="text-[10px] md:text-[11px] text-trace tracking-wider text-right">
          <span className="hidden md:inline">784→16→16→10 · trained on MNIST · 94.1% test accuracy · </span>
          runs in your browser
        </p>
      </motion.header>

      {/* Instrument panels */}
      <div className="flex flex-col gap-4 p-4 md:p-0 md:contents">
        <motion.div
          {...panel}
          transition={{ duration: 0.5, delay: reducedMotion ? 0 : 0.1 }}
          className="panel rounded-md p-4 w-full max-w-xs md:absolute md:left-6 md:bottom-6"
        >
          <DrawPad ref={padRef} onInputChange={setInput} disabled={!model} />
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-2 text-[11px] uppercase tracking-[0.15em] text-core/60 hover:text-core border border-trace/40 hover:border-trace rounded-sm transition-colors motion-reduce:transition-none"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleRun}
              disabled={!model || !input}
              className="px-5 py-2 text-[12px] font-display font-semibold uppercase tracking-[0.2em] rounded-sm bg-signal text-abyss hover:bg-core disabled:opacity-30 disabled:cursor-not-allowed transition-colors motion-reduce:transition-none"
            >
              Run ▸
            </button>
          </div>
          {modelError && (
            <p className="mt-3 text-[11px] text-verdict">
              Failed to load model weights — reload the page.
            </p>
          )}
        </motion.div>

        <motion.div
          {...panel}
          transition={{ duration: 0.5, delay: reducedMotion ? 0 : 0.2 }}
          className="panel rounded-md p-4 w-full max-w-xs md:absolute md:right-6 md:top-16"
        >
          <Readout result={run?.result ?? null} settled={settled} />
        </motion.div>
      </div>
    </section>
  );
}
