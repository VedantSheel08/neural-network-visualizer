"use client";

import dynamic from "next/dynamic";
import { motion, useReducedMotion, useScroll } from "framer-motion";
import { useEffect, useRef } from "react";
import Controls from "@/components/Controls";
import DrawPad, { type DrawPadHandle } from "@/components/DrawPad";
import History from "@/components/History";
import HoverTip from "@/components/HoverTip";
import Inspector from "@/components/Inspector";
import Readout from "@/components/Readout";
import ThemeToggle from "@/components/ThemeToggle";
import { useApp } from "@/lib/store";

const NetworkScene = dynamic(() => import("@/components/NetworkScene"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center text-faint text-sm">
      loading the network…
    </div>
  ),
});

export default function Hero() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const padRef = useRef<DrawPadHandle>(null);
  const prefersReduced = useReducedMotion() ?? false;

  const loadModel = useApp((s) => s.loadModel);
  const setEnv = useApp((s) => s.setEnv);
  const model = useApp((s) => s.model);
  const modelError = useApp((s) => s.modelError);
  const input = useApp((s) => s.input);
  const execute = useApp((s) => s.execute);
  const reducedMotion = useApp((s) => s.reducedMotion);

  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ["start start", "end end"],
  });

  useEffect(() => {
    loadModel();
    setEnv({
      reducedMotion: prefersReduced,
      lowPower: window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768,
    });
  }, [loadModel, setEnv, prefersReduced]);

  const panel = {
    initial: reducedMotion ? false : ({ opacity: 0, y: 10 } as const),
    animate: { opacity: 1, y: 0 },
  };

  return (
    <div ref={wrapRef} className="relative md:h-[200vh]">
      <section className="relative flex flex-col md:block md:sticky md:top-0 md:h-dvh">
        <div className="cursor-zone relative h-[52dvh] min-h-[320px] md:h-full md:absolute md:inset-0">
          <NetworkScene scrollT={scrollYProgress} />
        </div>

        <motion.header
          {...panel}
          transition={{ duration: 0.4 }}
          className="absolute top-0 inset-x-0 z-20 flex items-start justify-between gap-4 px-4 md:px-7 py-4 pointer-events-none"
        >
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-ink lowercase">vedant sheel</h1>
            <p className="mt-0.5 text-[13px] text-faint max-w-[340px]">
              i trained a neural network and put it in your browser. draw a
              number, hit run, and watch it actually think. hover and click
              anything in the network — it&apos;s all real math, live.
            </p>
          </div>
          <div className="flex items-center gap-3 pointer-events-auto">
            <span className="hidden md:inline font-mono text-[11px] text-faint">
              784→64→48→32→16→10 · 96.9% accurate
            </span>
            <ThemeToggle />
          </div>
        </motion.header>

        <div className="z-10 flex flex-col gap-4 p-4 md:p-0 md:contents">
          <motion.div
            {...panel}
            transition={{ duration: 0.4, delay: reducedMotion ? 0 : 0.1 }}
            className="md:absolute md:left-6 md:bottom-6 md:z-10 flex flex-col gap-3 w-full max-w-xs"
          >
            <div className="panel rounded p-4">
              <DrawPad ref={padRef} />
              <div className="mt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => padRef.current?.clear()}
                  className="px-3 py-2 text-[12px] text-faint hover:text-ink border border-graphite rounded"
                >
                  clear
                </button>
                <button
                  type="button"
                  onClick={() => execute("run")}
                  disabled={!model || !input}
                  className="px-5 py-2 text-[13px] font-medium rounded bg-copper text-paper hover:bg-ember disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  run it
                </button>
              </div>
              {modelError && (
                <p className="mt-3 text-[12px] text-copper">
                  couldn&apos;t load the network weights. try reloading.
                </p>
              )}
            </div>
            <div className="panel rounded p-4 hidden md:block">
              <Controls />
            </div>
          </motion.div>

          <motion.div
            {...panel}
            transition={{ duration: 0.4, delay: reducedMotion ? 0 : 0.2 }}
            className="md:absolute md:right-6 md:top-16 md:z-10 flex flex-col gap-3 w-full max-w-xs md:max-h-[calc(100dvh-6rem)]"
          >
            <Inspector />
            <div className="panel rounded p-4">
              <Readout />
            </div>
            <div className="panel rounded p-4 empty:hidden">
              <History />
            </div>
          </motion.div>

          <div className="panel rounded p-4 md:hidden">
            <Controls />
          </div>
        </div>

        <div
          aria-hidden
          className="hidden md:block absolute bottom-5 left-1/2 -translate-x-1/2 text-[12px] text-faint"
        >
          keep scrolling — i&apos;ll explain every single part ↓
        </div>
      </section>

      <HoverTip />
    </div>
  );
}
