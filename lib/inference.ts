/**
 * Client-side inference engine for the tiny MNIST net (784 -> 16 -> 16 -> 10).
 *
 * Pure functions, no React, no ML library — just the matrix math. Weight
 * matrices follow the PyTorch nn.Linear convention: weights[i][j] is the
 * weight from input j to output i.
 */

export interface LayerWeights {
  weights: number[][]; // [out][in]
  biases: number[];
}

export interface ModelWeights {
  layers: LayerWeights[];
}

export interface LayerActivations {
  /** Pre-activation values (Wx + b) — useful for edge/line intensity. */
  z: Float32Array;
  /** Post-activation values (ReLU, or softmax on the final layer). */
  a: Float32Array;
}

export interface ForwardResult {
  /** One entry per weight layer: hidden1, hidden2, output. */
  layers: LayerActivations[];
  /** Softmax probabilities over the 10 digits. */
  probabilities: Float32Array;
  /** argmax of probabilities. */
  prediction: number;
  /** probabilities[prediction]. */
  confidence: number;
}

export async function loadWeights(url = "/model/weights.json"): Promise<ModelWeights> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load weights: ${res.status}`);
  return (await res.json()) as ModelWeights;
}

function matVec(layer: LayerWeights, x: Float32Array): Float32Array {
  const out = new Float32Array(layer.biases.length);
  for (let i = 0; i < out.length; i++) {
    const row = layer.weights[i];
    let sum = layer.biases[i];
    for (let j = 0; j < row.length; j++) sum += row[j] * x[j];
    out[i] = sum;
  }
  return out;
}

function relu(z: Float32Array): Float32Array {
  const a = new Float32Array(z.length);
  for (let i = 0; i < z.length; i++) a[i] = z[i] > 0 ? z[i] : 0;
  return a;
}

export function softmax(z: Float32Array): Float32Array {
  let max = -Infinity;
  for (let i = 0; i < z.length; i++) if (z[i] > max) max = z[i];
  const exp = new Float32Array(z.length);
  let sum = 0;
  for (let i = 0; i < z.length; i++) {
    exp[i] = Math.exp(z[i] - max);
    sum += exp[i];
  }
  for (let i = 0; i < exp.length; i++) exp[i] /= sum;
  return exp;
}

/**
 * Run the full forward pass, returning every intermediate layer's state so
 * the visualization can animate real propagation, not a canned sequence.
 */
export function forwardPass(model: ModelWeights, input: Float32Array): ForwardResult {
  const layers: LayerActivations[] = [];
  let x = input;
  for (let l = 0; l < model.layers.length; l++) {
    const z = matVec(model.layers[l], x);
    const isLast = l === model.layers.length - 1;
    const a = isLast ? softmax(z) : relu(z);
    layers.push({ z, a });
    x = a;
  }
  const probabilities = layers[layers.length - 1].a;
  let prediction = 0;
  for (let i = 1; i < probabilities.length; i++) {
    if (probabilities[i] > probabilities[prediction]) prediction = i;
  }
  return { layers, probabilities, prediction, confidence: probabilities[prediction] };
}

/**
 * How much signal each spatial region of the 28x28 input actually sends to
 * each first-hidden-layer node: sum of w[i][j] * x[j] over the pixels j in
 * each cell of a grid x grid partition of the image.
 *
 * Returns Float32Array of length grid*grid*nOut, indexed [cell * nOut + i].
 * Used to drive the fan of edges from the input plane into hidden layer 1
 * with real per-region contributions instead of a decorative fade.
 */
export function inputRegionContributions(
  layer: LayerWeights,
  input: Float32Array,
  grid = 2,
  side = 28
): Float32Array {
  const nOut = layer.biases.length;
  const out = new Float32Array(grid * grid * nOut);
  const cellSize = side / grid;
  for (let i = 0; i < nOut; i++) {
    const row = layer.weights[i];
    for (let j = 0; j < row.length; j++) {
      const x = input[j];
      if (x === 0) continue;
      const pr = Math.floor(Math.floor(j / side) / cellSize);
      const pc = Math.floor((j % side) / cellSize);
      const cell = pr * grid + pc;
      out[cell * nOut + i] += row[j] * x;
    }
  }
  return out;
}
