"use client";

import { useCallback, useImperativeHandle, useRef, type Ref } from "react";
import { canvasToModelInput } from "@/lib/preprocess";
import { PALETTE } from "@/lib/theme";

const PAD_SIZE = 280;

export interface DrawPadHandle {
  clear(): void;
}

interface DrawPadProps {
  /** Fired (throttled) with the 784-vector the model will see, or null when cleared. */
  onInputChange: (input: Float32Array | null) => void;
  disabled?: boolean;
  ref?: Ref<DrawPadHandle>;
}

export default function DrawPad({ onInputChange, disabled, ref }: DrawPadProps) {
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
      onInputChange(empty ? null : input);

      // Live preview of exactly what the model will see after downsampling.
      const preview = previewRef.current;
      const ctx = preview?.getContext("2d");
      if (!preview || !ctx) return;
      const img = ctx.createImageData(28, 28);
      const [r, g, b] = [0x5f, 0xd4, 0xf5]; // signal
      for (let i = 0; i < 784; i++) {
        const v = input[i];
        img.data[i * 4] = r;
        img.data[i * 4 + 1] = g;
        img.data[i * 4 + 2] = b;
        img.data[i * 4 + 3] = Math.round(v * 255);
      }
      ctx.clearRect(0, 0, 28, 28);
      ctx.putImageData(img, 0, 0);
    });
  }, [onInputChange]);

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
    ctx.strokeStyle = "#ffffff";
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
    if (disabled) return;
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
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      previewRef.current?.getContext("2d")?.clearRect(0, 0, 28, 28);
      onInputChange(null);
    },
  }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <span className="text-[10px] uppercase tracking-[0.2em] text-signal/70">
          Input — draw a digit
        </span>
        <span className="text-[10px] tracking-wider text-trace">28×28</span>
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
          className="w-full max-w-[280px] aspect-square rounded-sm border border-trace/60 bg-abyss touch-none cursor-crosshair"
          style={{
            backgroundImage:
              `linear-gradient(${PALETTE.trace}22 1px, transparent 1px),` +
              `linear-gradient(90deg, ${PALETTE.trace}22 1px, transparent 1px)`,
            backgroundSize: "10% 10%",
          }}
          aria-label="Drawing pad: draw a digit from 0 to 9"
        />
        <div className="absolute bottom-2 right-2 flex flex-col items-end gap-1 pointer-events-none">
          <canvas
            ref={previewRef}
            width={28}
            height={28}
            className="w-14 h-14 pixelated rounded-[2px] border border-trace/60 bg-abyss/80"
            aria-label="Preview of the 28 by 28 image the model receives"
          />
          <span className="text-[9px] tracking-wider text-trace">model view</span>
        </div>
      </div>
    </div>
  );
}
