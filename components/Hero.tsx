"use client";

import dynamic from "next/dynamic";
import { motion, useReducedMotion, useScroll } from "framer-motion";
import { useEffect, useRef } from "react";
import Controls from "@/components/Controls";
import DrawPad, { type DrawPadHandle } from "@/components/DrawPad";
import FocusBar from "@/components/FocusBar";
import History from "@/components/History";
import HoverTip from "@/components/HoverTip";
import Inspector from "@/components/Inspector";
import Readout from "@/components/Readout";
import ThemeToggle from "@/components/ThemeToggle";
import Tour from "@/components/Tour";
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
  const tour = useApp((s) => s.tour);
  const setTour = useApp((s) => s.setTour);

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
        <div className="cursor-zone relative h-[52dvh] min-h-[320px] mx-3 mt-3 md:mt-0 md:h-auto md:absolute md:inset-x-8 md:top-72 md:bottom-24 border border-graphite bg-card flex flex-col overflow-hidden">
          <div className="shrink-0 h-8 flex items-center gap-2 px-3 border-b border-graphite">
            <span className="flex gap-[6px]" aria-hidden="true">
              <svg width="9" height="9"><circle cx="4.5" cy="4.5" r="4.5" fill="#e0605a" /></svg>
              <svg width="9" height="9"><circle cx="4.5" cy="4.5" r="4.5" fill="#e0b04a" /></svg>
              <svg width="9" height="9"><circle cx="4.5" cy="4.5" r="4.5" fill="#5fae5f" /></svg>
            </span>
            <span className="text-[11px] text-faint tracking-tight font-mono">
              network.forward() — {modelError ? "error" : model ? "live" : "loading…"}
            </span>
          </div>
          <div className="relative flex-1">
            <NetworkScene scrollT={scrollYProgress} />
          </div>
        </div>

        <motion.header
          {...panel}
          transition={{ duration: 0.4 }}
          className="relative md:absolute md:top-0 inset-x-0 z-20 px-4 md:px-7 py-4 pointer-events-none"
        >
          <div className="flex justify-end pointer-events-auto">
            <ThemeToggle />
          </div>
          <div className="mt-1 flex flex-col items-center text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-ink lowercase">vedant sheel</h1>
            <p className="mt-1.5 text-[15px] md:text-base text-ink/80 max-w-[440px] leading-snug">
              i trained a neural network and put it in your browser. draw a
              number, hit run, and watch it actually think. everything you see
              is real math happening live, and you can click all of it.
            </p>
            <p className="mt-1.5 text-[13px] text-faint pointer-events-auto">
              <a className="plain" href="https://vedantsheel.com" target="_blank" rel="noopener noreferrer">
                vedantsheel.com
              </a>
              <span> · vedant.sheel [at] uwaterloo [dot] com</span>
            </p>
            <p className="mt-1 text-[12px] text-faint font-mono">
              784→64→48→32→16→10, 96.9% accurate
            </p>
            {tour === null && (
              <button
                type="button"
                onClick={() => setTour(0)}
                className="mt-3 px-4 py-2 text-[14px] font-medium bg-copper text-paper hover:bg-ember pointer-events-auto"
              >
                new here? walk me through it
              </button>
            )}
          </div>
        </motion.header>

        <div className="z-10 flex flex-col gap-4 p-4 md:p-0 md:contents">
          <motion.div
            {...panel}
            transition={{ duration: 0.4, delay: reducedMotion ? 0 : 0.1 }}
            className="md:absolute md:left-6 md:bottom-6 md:z-10 flex flex-col gap-3 w-full max-w-xs"
          >
            <div className="panel p-4">
              <DrawPad ref={padRef} />
              <div className="mt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => padRef.current?.clear()}
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
                <p className="mt-3 text-[12px] text-copper">
                  couldn&apos;t load the network weights. try reloading.
                </p>
              )}
            </div>
            <div className="panel p-4 hidden md:block">
              <Controls />
            </div>
          </motion.div>

          <motion.div
            {...panel}
            transition={{ duration: 0.4, delay: reducedMotion ? 0 : 0.2 }}
            className="md:absolute md:right-6 md:top-16 md:z-10 flex flex-col gap-3 w-full max-w-xs md:max-h-[calc(100dvh-6rem)] md:overflow-y-auto"
          >
            <Inspector />
            <div className="panel p-4">
              <Readout />
            </div>
            <div className="panel p-4 empty:hidden">
              <History />
            </div>
          </motion.div>

          <div className="panel p-4 md:hidden">
            <Controls />
          </div>
          <div className="panel p-4 md:hidden">
            <FocusBar />
          </div>
        </div>

        {tour === null && (
          <div className="hidden md:block absolute bottom-16 left-1/2 -translate-x-1/2 z-10 panel px-3 py-2">
            <FocusBar />
          </div>
        )}

        {tour === null && (
          <button
            type="button"
            onClick={() =>
              document.getElementById("machine")?.scrollIntoView({
                behavior: reducedMotion ? "auto" : "smooth",
              })
            }
            className="self-center my-3 md:my-0 md:absolute md:bottom-4 md:left-1/2 md:-translate-x-1/2 z-10 px-5 py-2.5 text-[15px] md:text-base text-ink bg-paper border border-ink/30 hover:border-copper hover:text-copper"
          >
            so how does it actually work? ↓
          </button>
        )}
      </section>

      <HoverTip />
      <Tour />
    </div>
  );
}
