/**
 * Build LaTeX strings from live arrays so KaTeX renders the actual numbers
 * flowing through the network, elided with dots where matrices are too big
 * to show in full.
 */

const fmt = (v: number, digits: number) => {
  const s = v.toFixed(digits);
  return s === "-" + (0).toFixed(digits) ? (0).toFixed(digits) : s;
};

/** Column vector, showing at most `max` entries with \vdots elision. */
export function vecLatex(v: ArrayLike<number>, max = 4, digits = 2): string {
  const n = v.length;
  const rows: string[] = [];
  if (n <= max) {
    for (let i = 0; i < n; i++) rows.push(fmt(v[i], digits));
  } else {
    for (let i = 0; i < max - 1; i++) rows.push(fmt(v[i], digits));
    rows.push("\\vdots");
    rows.push(fmt(v[n - 1], digits));
  }
  return `\\begin{bmatrix}${rows.join("\\\\")}\\end{bmatrix}`;
}

/** Matrix slice: up to maxR rows and maxC cols with dots elision. */
export function matLatex(
  m: number[][],
  maxR = 4,
  maxC = 5,
  digits = 2
): string {
  const R = m.length;
  const C = m[0].length;
  const rowIdx = pickIdx(R, maxR);
  const colIdx = pickIdx(C, maxC);
  const lines: string[] = [];
  for (const r of rowIdx) {
    if (r === -1) {
      lines.push(colIdx.map((c) => (c === -1 ? "\\ddots" : "\\vdots")).join(" & "));
    } else {
      lines.push(
        colIdx.map((c) => (c === -1 ? "\\cdots" : fmt(m[r][c], digits))).join(" & ")
      );
    }
  }
  return `\\begin{bmatrix}${lines.join("\\\\")}\\end{bmatrix}`;
}

/** Indices to show, with -1 marking the elision slot. */
function pickIdx(n: number, max: number): number[] {
  if (n <= max) return Array.from({ length: n }, (_, i) => i);
  const head = Array.from({ length: max - 2 }, (_, i) => i);
  return [...head, -1, n - 1];
}
