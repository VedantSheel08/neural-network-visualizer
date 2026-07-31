"use client";

import { useEffect, useRef } from "react";
import { useApp } from "@/lib/store";
import { PALETTES } from "@/lib/theme";
import Panel from "@/components/Panel";

function Thumb({ input }: { input: Float32Array }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const mode = useApp((s) => s.mode);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const copper = PALETTES[mode].copper;
    const r = parseInt(copper.slice(1, 3), 16);
    const g = parseInt(copper.slice(3, 5), 16);
    const b = parseInt(copper.slice(5, 7), 16);
    const img = ctx.createImageData(28, 28);
    for (let i = 0; i < 784; i++) {
      img.data[i * 4] = r;
      img.data[i * 4 + 1] = g;
      img.data[i * 4 + 2] = b;
      img.data[i * 4 + 3] = Math.round(input[i] * 255);
    }
    ctx.clearRect(0, 0, 28, 28);
    ctx.putImageData(img, 0, 0);
  }, [input, mode]);
  return (
    <canvas ref={ref} width={28} height={28} className="w-9 h-9 pixelated bg-paper border border-graphite/50" />
  );
}

/** log of recent runs — the page remembers between draws */
export default function History() {
  const history = useApp((s) => s.history);
  if (history.length === 0) return null;
  return (
    <Panel label={`history — ${history.length} run${history.length === 1 ? "" : "s"}`}>
      <ul className="flex gap-2 flex-wrap">
        {history.map((h) => (
          <li key={h.id} className="flex flex-col items-center gap-1">
            <Thumb input={h.input} />
            <span className="font-mono text-[10px] text-ink tabular-nums">
              {h.prediction}
              <span className="text-faint"> · {(h.confidence * 100).toFixed(0)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
