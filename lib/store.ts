"use client";

import { create } from "zustand";
import {
  forwardPass,
  inputRegionContributions,
  loadWeights,
  type ActivationOverride,
  type ForwardResult,
  type ModelWeights,
} from "@/lib/inference";
import { STEP_CHECKPOINTS, type Mode } from "@/lib/theme";

/** Everything the scene needs for one inference run — all real numbers. */
export interface RunState {
  id: number;
  result: ForwardResult;
  /** Signed per-edge signal (weight x upstream activation), one per transition. */
  edges: Float32Array[];
  /** True when the result should display immediately (perturbation, reduced motion). */
  instant: boolean;
}

export type Selection =
  | { kind: "node"; layer: number; index: number } // layer 1..4 (4 = output)
  | { kind: "edge"; transition: number; from: number; to: number };

export interface HistoryItem {
  id: number;
  input: Float32Array;
  prediction: number;
  confidence: number;
}

function edgeSignals(weights: number[][], upstream: Float32Array): Float32Array {
  const nOut = weights.length;
  const nIn = weights[0].length;
  const out = new Float32Array(nOut * nIn);
  for (let i = 0; i < nOut; i++) {
    for (let j = 0; j < nIn; j++) out[i * nIn + j] = weights[i][j] * upstream[j];
  }
  return out;
}

interface AppState {
  mode: Mode;
  setMode(mode: Mode): void;
  reducedMotion: boolean;
  lowPower: boolean;
  setEnv(env: { reducedMotion?: boolean; lowPower?: boolean }): void;

  model: ModelWeights | null;
  modelError: boolean;
  loadModel(): void;

  input: Float32Array | null;
  setInput(input: Float32Array | null): void;
  /** Perturbation: toggle one input pixel and recompute instantly. */
  togglePixel(index: number): void;

  run: RunState | null;
  settled: boolean;
  /** "run" animates propagation and logs history; "perturb" updates instantly. */
  execute(kind?: "run" | "perturb"): void;
  markSettled(): void;

  /** Perturbation: clamp one hidden activation; null restores the true pass. */
  override: ActivationOverride | null;
  setOverride(o: ActivationOverride | null): void;

  speed: number;
  setSpeed(s: number): void;
  stepMode: boolean;
  setStepMode(v: boolean): void;
  stepIndex: number;
  nextStep(): void;

  selection: Selection | null;
  select(s: Selection | null): void;
  hover: { x: number; y: number; title: string; lines: string[] } | null;
  setHover(h: AppState["hover"]): void;

  history: HistoryItem[];
  pendingHistory: HistoryItem | null;
}

export const useApp = create<AppState>((set, get) => ({
  mode: "dark",
  setMode(mode) {
    set({ mode });
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.classList.add("theme-anim");
      root.classList.toggle("dark", mode === "dark");
      window.setTimeout(() => root.classList.remove("theme-anim"), 450);
      try {
        localStorage.setItem("fp-theme", mode);
      } catch {}
    }
  },
  reducedMotion: false,
  lowPower: false,
  setEnv(env) {
    set(env);
  },

  model: null,
  modelError: false,
  loadModel() {
    if (get().model) return;
    loadWeights()
      .then((model) => set({ model }))
      .catch(() => set({ modelError: true }));
  },

  input: null,
  setInput(input) {
    set({ input });
  },
  togglePixel(index) {
    const prev = get().input;
    const input = prev ? prev.slice() : new Float32Array(784);
    input[index] = input[index] > 0.05 ? 0 : 1;
    set({ input });
    if (get().run) get().execute("perturb");
  },

  run: null,
  settled: false,
  execute(kind = "run") {
    const { model, input, reducedMotion } = get();
    if (!model || !input) return;
    const override = kind === "perturb" ? get().override : null;
    const result = forwardPass(model, input, override);
    const edges: Float32Array[] = [inputRegionContributions(model.layers[0], input, 4)];
    for (let l = 1; l < model.layers.length; l++) {
      edges.push(edgeSignals(model.layers[l].weights, result.layers[l - 1].a));
    }
    const instant = kind === "perturb" || reducedMotion;
    const id = (get().run?.id ?? 0) + 1;
    const next: Partial<AppState> = {
      run: { id, result, edges, instant },
      settled: instant,
      stepIndex: 0,
    };
    if (kind === "run") {
      next.override = null;
      const item: HistoryItem = {
        id,
        input: input.slice(),
        prediction: result.prediction,
        confidence: result.confidence,
      };
      if (instant) next.history = [item, ...get().history].slice(0, 8);
      else next.pendingHistory = item;
    }
    set(next);
  },
  markSettled() {
    const { settled, pendingHistory, history } = get();
    if (settled) return;
    set({
      settled: true,
      pendingHistory: null,
      history: pendingHistory ? [pendingHistory, ...history].slice(0, 8) : history,
    });
  },

  override: null,
  setOverride(override) {
    set({ override });
    if (get().run) get().execute("perturb");
  },

  speed: 1,
  setSpeed(speed) {
    set({ speed });
  },
  stepMode: false,
  setStepMode(stepMode) {
    set({ stepMode });
  },
  stepIndex: 0,
  nextStep() {
    set({ stepIndex: Math.min(get().stepIndex + 1, STEP_CHECKPOINTS.length - 1) });
  },

  selection: null,
  select(selection) {
    set({ selection });
  },
  hover: null,
  setHover(hover) {
    set({ hover });
  },

  history: [],
  pendingHistory: null,
}));
