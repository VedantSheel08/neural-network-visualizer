"use client";

import { useCallback, useRef } from "react";
import { canvasToModelInput } from "@/lib/preprocess";
import { PALETTES } from "@/lib/theme";
import { useApp } from "@/lib/store";
import Panel from "@/components/Panel";

const PAD_SIZE = 280;

/**
 * 280px pad downsampled to the 28x28 MNIST frame. Strokes are stored white
 * internally (the preprocessing pipeline reads luminance); in light mode a
 * CSS invert renders them as ink on paper. Owns its own clear / run it
 * controls so the whole draw-and-run loop lives in one terminal box.
 */
export default function DrawPad() {
  const mode = useApp((s) => s.mode);
  const setInput = useApp((s) => s.setInput);
  const model = useApp((s) => s.model);
  const modelError = useApp((s) => s.modelError);
  const input = useApp((s) => s.input);
  const execute = useApp((s) => s.execute);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const pending = useRef(false);

  const emitInput = useCallback(() => {
    if (pending.current) return;
    pending.current = true;
    requestAnimationFrame(() => {
      pending.current = false;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const { input, empty } = canvasToModelInput(canvas);
      setInput(empty ? null : input);

      const preview = previewRef.current;
      const ctx = preview?.getContext("2d");
      if (!preview || !ctx) return;
      const copper = PALETTES[useApp.getState().mode].copper;
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
    });
  }, [setInput]);

  const clear = () => {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    previewRef.current?.getContext("2d")?.clearRect(0, 0, 28, 28);
    setInput(null);
  };

  const pointFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * PAD_SIZE,
      y: ((e.clientY - rect.top) / rect.height) * PAD_SIZE,
    };
  };

  const strokeTo = (point: { x: number; y: number }) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const from = lastPoint.current ?? point;
    // Coverage lives in alpha; color is purely presentational per mode.
    ctx.strokeStyle = PALETTES[useApp.getState().mode].ink;
    ctx.lineWidth = 20;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPoint.current = point;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    lastPoint.current = null;
    strokeTo(pointFromEvent(e));
    emitInput();
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    strokeTo(pointFromEvent(e));
    emitInput();
  };
  const handlePointerUp = () => {
    drawing.current = false;
    lastPoint.current = null;
    emitInput();
  };

  const grid = PALETTES[mode].graphite;
  return (
    <Panel label="draw a digit">
      <div className="flex flex-col gap-4 items-center">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={PAD_SIZE}
            height={PAD_SIZE}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="w-full max-w-[240px] aspect-square border border-graphite/60 touch-none cursor-crosshair bg-paper"
            style={{
              backgroundImage:
                `linear-gradient(${grid}33 1px, transparent 1px),` +
                `linear-gradient(90deg, ${grid}33 1px, transparent 1px)`,
              backgroundSize: "10% 10%",
            }}
            aria-label="Drawing pad: draw a digit from 0 to 9"
          />
          <div className="absolute bottom-2 right-2 flex flex-col items-end gap-1 pointer-events-none">
            <canvas
              ref={previewRef}
              width={28}
              height={28}
              className="w-12 h-12 pixelated border border-graphite/60 bg-paper/90"
              aria-label="Preview of the 28 by 28 image the model receives"
            />
            <span className="font-mono text-[10px] text-faint">what it sees</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 w-full max-w-[240px]">
          <button
            type="button"
            onClick={clear}
            className="px-3 py-2 text-[13px] text-faint hover:text-ink border border-graphite"
          >
            clear
          </button>
          <button
            type="button"
            onClick={() => execute("run")}
            disabled={!model || !input}
            className="px-5 py-2 text-[13px] font-medium bg-copper text-paper hover:bg-ember disabled:opacity-30 disabled:cursor-not-allowed"
          >
            run it
          </button>
        </div>

        {modelError && (
          <p className="text-[12px] text-copper text-center">
            couldn&apos;t load the network weights. try reloading.
          </p>
        )}
      </div>
    </Panel>
  );
}
