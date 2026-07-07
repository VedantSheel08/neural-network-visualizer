"use client";

import { useCallback, useImperativeHandle, useRef, type Ref } from "react";
import { canvasToModelInput } from "@/lib/preprocess";
import { PALETTES } from "@/lib/theme";
import { useApp } from "@/lib/store";

const PAD_SIZE = 280;

export interface DrawPadHandle {
  clear(): void;
}

interface DrawPadProps {
  ref?: Ref<DrawPadHandle>;
}

/**
 * 280px pad downsampled to the 28x28 MNIST frame. Strokes are stored white
 * internally (the preprocessing pipeline reads luminance); in light mode a
 * CSS invert renders them as ink on paper.
 */
export default function DrawPad({ ref }: DrawPadProps) {
  const mode = useApp((s) => s.mode);
  const setInput = useApp((s) => s.setInput);
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

  useImperativeHandle(ref, () => ({
    clear() {
      const canvas = canvasRef.current;
      canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
      previewRef.current?.getContext("2d")?.clearRect(0, 0, 28, 28);
      setInput(null);
    },
  }));

  const grid = PALETTES[mode].graphite;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <span className="text-[13px] font-medium text-ink">draw a number here (0–9)</span>
        <span className="font-mono text-[10px] text-faint">28×28</span>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={PAD_SIZE}
          height={PAD_SIZE}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full max-w-[280px] aspect-square rounded-sm border border-graphite/60 touch-none cursor-crosshair bg-paper"
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
            className="w-14 h-14 pixelated rounded-[2px] border border-graphite/60 bg-paper/90"
            aria-label="Preview of the 28 by 28 image the model receives"
          />
          <span className="font-mono text-[9px] text-faint">what it sees</span>
        </div>
      </div>
    </div>
  );
}
