/**
 * Convert a free-hand drawing canvas into the 784-length input vector the
 * model was trained on. MNIST digits are size-normalized to a 20x20 box and
 * centered by center of mass in the 28x28 frame — reproducing that here is
 * the difference between ~60% and ~94% perceived accuracy on hand drawings.
 */

export interface ProcessedInput {
  /** 784 floats in [0, 1], row-major 28x28. */
  input: Float32Array;
  /** True if the canvas had no visible strokes. */
  empty: boolean;
}

export function canvasToModelInput(source: HTMLCanvasElement): ProcessedInput {
  const ctx = source.getContext("2d");
  if (!ctx) return { input: new Float32Array(784), empty: true };
  const { width, height } = source;
  const data = ctx.getImageData(0, 0, width, height).data;

  // Bounding box of drawn ink (drawing is white-on-transparent-black; use
  // alpha * luminance so both stroke styles work).
  let minX = width, minY = height, maxX = -1, maxY = -1;
  const lum = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const v = (data[idx] / 255) * (data[idx + 3] / 255);
      lum[y * width + x] = v;
      if (v > 0.05) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { input: new Float32Array(784), empty: true };

  const boxW = maxX - minX + 1;
  const boxH = maxY - minY + 1;

  // Scale the ink bounding box into a 20x20 field, preserving aspect.
  const scale = 20 / Math.max(boxW, boxH);
  const scaledW = Math.max(1, Math.round(boxW * scale));
  const scaledH = Math.max(1, Math.round(boxH * scale));

  const crop = document.createElement("canvas");
  crop.width = scaledW;
  crop.height = scaledH;
  const cropCtx = crop.getContext("2d")!;
  cropCtx.imageSmoothingEnabled = true;
  cropCtx.imageSmoothingQuality = "high";
  cropCtx.drawImage(source, minX, minY, boxW, boxH, 0, 0, scaledW, scaledH);

  // Center of mass of the scaled ink, to place it like MNIST does.
  const cropData = cropCtx.getImageData(0, 0, scaledW, scaledH).data;
  let mass = 0, mx = 0, my = 0;
  for (let y = 0; y < scaledH; y++) {
    for (let x = 0; x < scaledW; x++) {
      const idx = (y * scaledW + x) * 4;
      const v = (cropData[idx] / 255) * (cropData[idx + 3] / 255);
      mass += v;
      mx += v * x;
      my += v * y;
    }
  }
  const comX = mass > 0 ? mx / mass : scaledW / 2;
  const comY = mass > 0 ? my / mass : scaledH / 2;

  const frame = document.createElement("canvas");
  frame.width = 28;
  frame.height = 28;
  const frameCtx = frame.getContext("2d")!;
  frameCtx.drawImage(crop, Math.round(14 - comX), Math.round(14 - comY));

  const out = new Float32Array(784);
  const frameData = frameCtx.getImageData(0, 0, 28, 28).data;
  for (let i = 0; i < 784; i++) {
    out[i] = (frameData[i * 4] / 255) * (frameData[i * 4 + 3] / 255);
  }
  return { input: out, empty: false };
}
