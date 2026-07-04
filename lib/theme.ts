/**
 * Design tokens — "signal in deep water." A forward pass rendered as
 * bioluminescent ink propagating through darkness. Amber is reserved
 * exclusively for the verdict (the winning digit); nothing else may use it.
 */
export const PALETTE = {
  abyss: "#060B14", // page background — water at depth
  hull: "#0D1524", // instrument panel surfaces
  trace: "#26374F", // dormant synapses, grid, inactive structure
  signal: "#5FD4F5", // active ink-light — the propagating signal
  core: "#EAF8FF", // white-hot node core at peak activation
  verdict: "#FFAF5F", // amber — the prediction, and only the prediction
} as const;

/**
 * Propagation timeline: fractions of one run (0..1) during which each stage
 * animates. Edges pulse during their window and keep a residual glow after;
 * node layers fade in over theirs. Total run duration lives in RUN_MS.
 */
export const STAGES = {
  input: [0.0, 0.08],
  edges1: [0.08, 0.3],
  hidden1: [0.26, 0.38],
  edges2: [0.38, 0.6],
  hidden2: [0.56, 0.68],
  edges3: [0.68, 0.9],
  output: [0.86, 1.0],
} as const;

export const RUN_MS = 3800;

/** 0..1 progress of a stage given global run progress. */
export function stageProgress(stage: readonly [number, number] | readonly number[], t: number): number {
  const [start, end] = stage;
  if (t <= start) return 0;
  if (t >= end) return 1;
  return (t - start) / (end - start);
}
