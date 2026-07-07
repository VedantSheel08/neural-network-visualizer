/**
 * Shared tokens for the 3D scene (the DOM reads the same values from CSS
 * variables in globals.css; keep the two in sync). Minimal neutral palette
 * with one warm accent. `gold` is reserved for the winning digit only.
 */

export type Mode = "light" | "dark";

export interface Palette {
  paper: string; // scene background
  card: string; // panel surfaces
  graphite: string; // dormant structure
  ink: string; // text / labels
  faint: string; // secondary text
  copper: string; // active signal
  ember: string; // wavefront peak (light-hot in dark, burnt-deep in light)
  gold: string; // verdict only
}

export const PALETTES: Record<Mode, Palette> = {
  light: {
    paper: "#fcfcfa",
    card: "#f3f3ee",
    graphite: "#d9d9d1",
    ink: "#191917",
    faint: "#75756d",
    copper: "#d4551a",
    ember: "#7a2e08",
    gold: "#8f3a0e",
  },
  dark: {
    paper: "#131312",
    card: "#1c1c1a",
    graphite: "#3b3b37",
    ink: "#ebebe7",
    faint: "#8f8f87",
    copper: "#ff7a3d",
    ember: "#ffd9c0",
    gold: "#ffb37a",
  },
};

/** Network architecture: input, four hidden layers, output. */
export const ARCH = [784, 64, 48, 32, 16, 10] as const;
export const N_TRANSITIONS = ARCH.length - 1; // 4 weight layers

/**
 * Propagation timeline for one run, as fractions of [0, 1]. The input plane
 * flashes first; then each transition gets an edge-pulse window followed by
 * (slightly overlapping) a node-illumination window.
 */
export interface StageWindows {
  input: [number, number];
  edges: [number, number][]; // one per transition
  nodes: [number, number][]; // one per transition (node layer that lights up)
}

export function buildStages(transitions = N_TRANSITIONS): StageWindows {
  const inputSpan = 0.06;
  const span = (1 - inputSpan) / transitions; // per transition
  const edges: [number, number][] = [];
  const nodes: [number, number][] = [];
  for (let k = 0; k < transitions; k++) {
    const start = inputSpan + k * span;
    edges.push([start, start + span * 0.72]);
    nodes.push([start + span * 0.55, start + span]);
  }
  return { input: [0, inputSpan], edges, nodes };
}

export const STAGES = buildStages();

/** Base run duration at 1x speed. Effective duration = RUN_MS / speed. */
export const RUN_MS = 6200;

/**
 * Checkpoints for manual step-through: pause after the input flash and after
 * each layer finishes lighting up.
 */
export const STEP_CHECKPOINTS: number[] = [
  STAGES.input[1],
  ...STAGES.nodes.map(([, end]) => end),
];

/** 0..1 progress of a stage window given global run progress. */
export function stageProgress(stage: readonly [number, number] | readonly number[], t: number): number {
  const [start, end] = stage;
  if (t <= start) return 0;
  if (t >= end) return 1;
  return (t - start) / (end - start);
}
