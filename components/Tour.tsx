"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/store";

interface Step {
  text: string;
  /** camera focus while on this step (see store.focus) */
  focus: number | null;
  /** what has to happen before "next" unlocks */
  needs?: "input" | "run";
}

const STEPS: Step[] = [
  {
    text: "hey, i'm vedant. let me walk you through the thing i built. first, draw any number from 0 to 9 on the pad.",
    focus: null,
    needs: "input",
  },
  {
    text: "nice. now hit the run button and watch the wave travel left to right. that's your number becoming an answer.",
    focus: null,
    needs: "run",
  },
  {
    text: "this square is everything the network actually sees: your drawing squished down to 28 by 28 brightness numbers. that's the whole input. no magic yet.",
    focus: 0,
  },
  {
    text: "these 64 dots each scanned all 784 of your pixels against their own learned stencil. the bright ones found their pattern in your drawing. after the tour, click one and you can literally see its stencil as an image.",
    focus: 1,
  },
  {
    text: "from here on the network never sees your pixels again. these middle layers only combine what the previous layer found. strokes get combined into loops, tails, crossbars.",
    focus: 2,
  },
  {
    text: "by the last hidden layer, your whole drawing has been boiled down to just 16 numbers. that's the summary everything gets judged on.",
    focus: 4,
  },
  {
    text: "and these ten dots vote. each one adds up evidence for its digit, and softmax turns the scores into the percentages on the right. the bright one is the answer.",
    focus: 5,
  },
  {
    text: "that's the loop. now it's yours: click any dot to open it up, drag the slider inside to mess with its brain, slow the wave down, and scroll down for the full story with the actual math.",
    focus: -1,
  },
];

/** the guided walkthrough. it waits for you to actually do things. */
export default function Tour() {
  const tour = useApp((s) => s.tour);
  const setTour = useApp((s) => s.setTour);
  const setFocus = useApp((s) => s.setFocus);
  const input = useApp((s) => s.input);
  const run = useApp((s) => s.run);

  const step = tour !== null ? STEPS[tour] : null;

  useEffect(() => {
    if (step) setFocus(step.focus);
  }, [step, setFocus]);

  if (tour === null || !step) return null;

  const blocked =
    (step.needs === "input" && !input) || (step.needs === "run" && !run);
  const last = tour === STEPS.length - 1;

  return (
    <div className="fixed bottom-[4.75rem] lg:bottom-4 inset-x-4 z-30 mx-auto max-w-md panel px-4 py-3 shadow-lg">
      <p className="text-[15px] leading-relaxed text-ink">{step.text}</p>
      <div className="mt-2.5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            setTour(null);
            setFocus(-1);
          }}
          className="text-[12px] text-faint underline underline-offset-2 hover:text-ink"
        >
          {last ? "" : "skip the tour"}
        </button>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-faint">
            {tour + 1}/{STEPS.length}
          </span>
          <button
            type="button"
            disabled={blocked}
            onClick={() => {
              if (last) {
                setTour(null);
                setFocus(-1);
              } else {
                setTour(tour + 1);
              }
            }}
            className="px-4 py-1.5 text-[13px] font-medium bg-copper text-paper hover:bg-ember disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {last ? "done, let me play" : blocked ? (step.needs === "input" ? "draw first" : "hit run first") : "next"}
          </button>
        </div>
      </div>
    </div>
  );
}
