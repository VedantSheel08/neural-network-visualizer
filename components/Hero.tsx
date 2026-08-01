"use client";

import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import Controls from "@/components/Controls";
import DrawPad from "@/components/DrawPad";
import FocusBar from "@/components/FocusBar";
import History from "@/components/History";
import HoverTip from "@/components/HoverTip";
import Inspector from "@/components/Inspector";
import Panel from "@/components/Panel";
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
  const prefersReduced = useReducedMotion() ?? false;
  const [showScrollCue, setShowScrollCue] = useState(true);

  const loadModel = useApp((s) => s.loadModel);
  const setEnv = useApp((s) => s.setEnv);
  const model = useApp((s) => s.model);
  const modelError = useApp((s) => s.modelError);
  const reducedMotion = useApp((s) => s.reducedMotion);
  const tour = useApp((s) => s.tour);
  const setTour = useApp((s) => s.setTour);

  useEffect(() => {
    loadModel();
    setEnv({
      reducedMotion: prefersReduced,
      lowPower: window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768,
    });
  }, [loadModel, setEnv, prefersReduced]);

  // hides the floating "keep scrolling" cue once you've actually started
  useEffect(() => {
    const onScroll = () => setShowScrollCue(window.scrollY < 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToChapters = () =>
    document.getElementById("machine")?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
    });

  const rise = {
    initial: reducedMotion ? false : ({ opacity: 0, y: 8 } as const),
    animate: { opacity: 1, y: 0 },
  };

  return (
    <div className="relative">
      <header className="sticky top-0 z-30 border-b border-graphite bg-paper/85 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">
          <span className="flex items-center gap-2.5">
            <svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
              <rect width="64" height="64" rx="16" fill="#161513" />
              <line x1="20" y1="20" x2="45" y2="32" stroke="#ff7a3d" strokeWidth="4.5" strokeLinecap="round" />
              <line x1="20" y1="44" x2="45" y2="32" stroke="#ff7a3d" strokeWidth="4.5" strokeLinecap="round" />
              <circle cx="20" cy="20" r="7.5" fill="#4a473e" />
              <circle cx="20" cy="44" r="7.5" fill="#4a473e" />
              <circle cx="46" cy="32" r="10" fill="#ffb37a" />
            </svg>
            <span className="text-[15px] font-semibold tracking-tight text-ink">
              neural network visualizer
            </span>
          </span>
          <nav className="flex items-center gap-2 md:gap-4">
            <button
              type="button"
              onClick={scrollToChapters}
              className="hidden sm:block text-[13px] text-faint hover:text-ink"
            >
              how it works
            </button>
            <a
              className="hidden sm:block text-[13px] text-faint hover:text-ink"
              href="https://github.com/VedantSheel08/neural-network-visualizer"
              target="_blank"
              rel="noopener noreferrer"
            >
              github
            </a>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <motion.section
        {...rise}
        transition={{ duration: 0.4 }}
        className="max-w-2xl mx-auto px-4 md:px-6 pt-12 md:pt-16 pb-10 text-center"
      >
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-ink">
          watch a neural network think
        </h1>
        <p className="mt-3 text-[13px] text-faint">
          by{" "}
          <a className="plain" href="https://vedantsheel.com" target="_blank" rel="noopener noreferrer">
            vedant sheel
          </a>
        </p>
        <p className="mt-4 text-[16px] md:text-[17px] text-ink/85 leading-relaxed max-w-[520px] mx-auto">
          i trained a neural network and put it in your browser. draw a number,
          hit run, and watch it actually think. everything you see is real math
          happening live, and you can click all of it.
        </p>
        <p className="mt-3 text-[12px] text-faint font-mono">
          784 → 64 → 48 → 32 → 16 → 10 · 96.9% test accuracy
        </p>
        {tour === null && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setTour(0)}
              className="px-4 py-2 text-[14px] font-medium bg-copper text-paper hover:bg-ember"
            >
              new here? walk me through it
            </button>
            <button
              type="button"
              onClick={scrollToChapters}
              className="px-4 py-2 text-[14px] text-ink border border-graphite hover:border-copper hover:text-copper"
            >
              how does it work?
            </button>
          </div>
        )}
      </motion.section>

      <motion.section
        {...rise}
        transition={{ duration: 0.4, delay: reducedMotion ? 0 : 0.1 }}
        className="max-w-6xl mx-auto px-4 md:px-6 pb-16"
      >
        <div className="grid lg:grid-cols-[340px_minmax(0,1fr)] gap-4 items-start">
          <div className="flex flex-col gap-4 order-2 lg:order-1">
            <DrawPad />
            <Readout />
            <Controls />
          </div>

          <div className="flex flex-col gap-4 order-1 lg:order-2">
            <Panel
              label={`network — ${modelError ? "error" : model ? "live" : "loading…"}`}
              bodyClassName="relative flex-1"
              className="cursor-zone relative h-[46dvh] min-h-[300px] lg:h-[560px]"
            >
              <NetworkScene />
            </Panel>
            <Panel label="camera" bodyClassName="px-4 py-3">
              <FocusBar />
            </Panel>
            <History />
          </div>
        </div>
      </motion.section>

      <div className="fixed right-4 top-20 z-40 w-[min(20rem,calc(100vw-2rem))] pointer-events-none">
        <Inspector />
      </div>

      <button
        type="button"
        onClick={scrollToChapters}
        aria-label="scroll down to how it works"
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-20 w-10 h-10 grid place-items-center rounded-full border border-graphite bg-paper/90 backdrop-blur text-faint hover:text-copper hover:border-copper transition-opacity duration-300 ${
          showScrollCue && tour === null ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <motion.svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          animate={reducedMotion ? {} : { y: [0, 4, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </button>

      <HoverTip />
      <Tour />
    </div>
  );
}
