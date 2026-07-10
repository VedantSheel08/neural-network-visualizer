"use client";

import dynamic from "next/dynamic";
import { motion, useReducedMotion, useScroll } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Controls from "@/components/Controls";
import DrawPad from "@/components/DrawPad";
import FocusBar from "@/components/FocusBar";
import History from "@/components/History";
import HoverTip from "@/components/HoverTip";
import Inspector from "@/components/Inspector";
import Readout from "@/components/Readout";
import TerminalPanel from "@/components/TerminalPanel";
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
  const prefersReduced = useReducedMotion() ?? false;
  const [expanded, setExpanded] = useState(false);

  const loadModel = useApp((s) => s.loadModel);
  const setEnv = useApp((s) => s.setEnv);
  const model = useApp((s) => s.model);
  const modelError = useApp((s) => s.modelError);
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
        <motion.header
          {...panel}
          transition={{ duration: 0.4 }}
          className="relative md:absolute md:top-0 inset-x-0 z-20 px-4 md:px-7 py-4 pointer-events-none"
        >
          <div className="flex justify-end pointer-events-auto">
            <ThemeToggle />
          </div>
          <div className="mt-1 flex flex-col items-center text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-ink lowercase">neural network visualizer</h1>
            <p className="mt-1 text-[13px] text-faint pointer-events-auto">
              by{" "}
              <a className="plain" href="https://vedantsheel.com" target="_blank" rel="noopener noreferrer">
                vedant sheel
              </a>
            </p>
            <p className="mt-2.5 text-[15px] md:text-base text-ink/80 max-w-[440px] leading-snug">
              i trained a neural network and put it in your browser. draw a
              number, hit run, and watch it actually think. everything you see
              is real math happening live, and you can click all of it.
            </p>
            <p className="mt-1.5 text-[12px] text-faint pointer-events-auto">
              vedant.sheel [at] uwaterloo [dot] com
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

        <TerminalPanel
          label={`network.forward() — ${modelError ? "error" : model ? "live" : "loading…"}`}
          bodyClassName="relative flex-1"
          className={`cursor-zone relative mx-3 mt-3 md:mt-0 md:h-auto md:absolute transition-[height] duration-300 ${
            expanded
              ? "h-[62dvh] min-h-[380px] md:inset-x-8 md:top-72 md:bottom-24"
              : "h-[36dvh] min-h-[240px] md:inset-x-20 md:top-80 md:bottom-32"
          }`}
          right={
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? "shrink the network view" : "enlarge the network view"}
              className="shrink-0 text-[11px] text-faint hover:text-ink border border-graphite px-2 py-0.5"
            >
              {expanded ? "shrink" : "enlarge"}
            </button>
          }
        >
          <NetworkScene scrollT={scrollYProgress} />
        </TerminalPanel>

        <div className="z-10 flex flex-col gap-5 p-4 md:p-0 md:contents">
          <motion.div
            {...panel}
            transition={{ duration: 0.4, delay: reducedMotion ? 0 : 0.1 }}
            className="md:absolute md:left-8 md:bottom-8 md:z-10 flex flex-col gap-4 w-full max-w-xs"
          >
            <DrawPad />
            <div className="panel p-5 hidden md:block">
              <Controls />
            </div>
          </motion.div>

          <div className="panel p-5 md:hidden">
            <FocusBar />
          </div>

          <motion.div
            {...panel}
            transition={{ duration: 0.4, delay: reducedMotion ? 0 : 0.2 }}
            className="md:absolute md:right-8 md:top-20 md:z-10 flex flex-col gap-4 w-full max-w-xs md:max-h-[calc(100dvh-7rem)] md:overflow-y-auto"
          >
            <Inspector />
            <div className="panel p-5">
              <Readout />
            </div>
            <div className="panel p-5 empty:hidden">
              <History />
            </div>
          </motion.div>

          <div className="panel p-5 md:hidden">
            <Controls />
          </div>
        </div>

        {tour === null && (
          <div className="hidden md:block absolute bottom-20 left-1/2 -translate-x-1/2 z-10 panel px-4 py-2.5">
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
