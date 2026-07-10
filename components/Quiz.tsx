"use client";

import { useState } from "react";

interface QuizProps {
  q: string;
  options: string[];
  answer: number; // index into options
  explain: string;
}

/**
 * a quick multiple-choice check. no score, no streaks, just "did that land".
 * picking wrong tells you why, picking right confirms your reasoning.
 */
export default function Quiz({ q, options, answer, explain }: QuizProps) {
  const [picked, setPicked] = useState<number | null>(null);
  const done = picked !== null;
  return (
    <div className="my-6 border border-graphite bg-card p-4 max-w-xl">
      <p className="text-[13px] font-medium text-ink mb-3">quick check: {q}</p>
      <div className="flex flex-col gap-1.5">
        {options.map((opt, i) => {
          const isPick = picked === i;
          const isRight = i === answer;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setPicked(i)}
              disabled={done}
              className={`text-left text-[13px] border px-3 py-2 disabled:cursor-default ${
                done && isRight
                  ? "border-copper bg-copper/10 text-ink"
                  : done && isPick
                    ? "border-graphite text-faint line-through"
                    : done
                      ? "border-transparent text-faint"
                      : "border-graphite text-ink hover:border-copper"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {done && (
        <p className="mt-3 text-[13px] leading-relaxed text-ink/85">
          {picked === answer ? "yep. " : "not quite. "}
          {explain}
          {"  "}
          <button
            type="button"
            onClick={() => setPicked(null)}
            className="text-faint underline underline-offset-2 hover:text-ink"
          >
            reset
          </button>
        </p>
      )}
    </div>
  );
}
