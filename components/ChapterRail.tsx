"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";

export const CHAPTERS: { id: string; label: string }[] = [
  { id: "machine", label: "the machine" },
  { id: "pixels", label: "pixels" },
  { id: "layer-1", label: "strokes" },
  { id: "middle", label: "shapes" },
  { id: "output", label: "the vote" },
  { id: "softmax", label: "softmax" },
  { id: "wrong", label: "mistakes" },
  { id: "training", label: "training" },
  { id: "bigger", label: "vs. gpt" },
  { id: "glossary", label: "glossary" },
  { id: "reading", label: "reading" },
  { id: "about", label: "about" },
];

/** tracks which chapter is on screen right now, shared by the desktop rail
 *  and the mobile chapter strip so both stay in sync off one observer. */
function useChapterProgress() {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(false);
  const observed = useRef(false);

  useEffect(() => {
    if (observed.current) return;
    observed.current = true;
    const els = CHAPTERS.map((c) => document.getElementById(c.id)).filter(
      (el): el is HTMLElement => !!el
    );
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            const idx = els.findIndex((el) => el === entry.target);
            if (idx !== -1) setActive(idx);
          }
        }
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    for (const el of els) io.observe(el);
    return () => io.disconnect();
  }, []);

  return { active, visible };
}

export default function ChapterRail() {
  const { active, visible } = useChapterProgress();
  const reducedMotion = useApp((s) => s.reducedMotion);

  return (
    <nav
      aria-label="chapters"
      className={`hidden lg:flex fixed left-6 top-1/2 -translate-y-1/2 z-10 flex-col gap-2.5 transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {CHAPTERS.map((c, i) => {
        const isActive = i === active;
        return (
          <a
            key={c.id}
            href={`#${c.id}`}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById(c.id)?.scrollIntoView({
                behavior: reducedMotion ? "auto" : "smooth",
                block: "start",
              });
            }}
            className="group flex items-center gap-2.5"
          >
            <span
              className={`text-[10px] font-mono tabular-nums transition-colors duration-300 ${
                isActive ? "text-copper" : "text-faint/60"
              }`}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span
              className={`h-px transition-all duration-300 ${
                isActive ? "w-6 bg-copper" : "w-3 bg-graphite"
              }`}
            />
            <span
              className={`text-[11px] whitespace-nowrap transition-all duration-300 overflow-hidden ${
                isActive
                  ? "max-w-[120px] opacity-100 text-ink"
                  : "max-w-0 opacity-0 group-hover:max-w-[120px] group-hover:opacity-70"
              }`}
            >
              {c.label}
            </span>
          </a>
        );
      })}
    </nav>
  );
}

/** same chapter tracking as the rail, but a bottom-fixed horizontal strip
 *  for phones and tablets, which never get the fixed side rail (there's no
 *  room for it without eating into the reading column). lets touch users
 *  jump between sections the same way a mouse user can with the rail. */
export function MobileChapterNav() {
  const { active, visible } = useChapterProgress();
  const reducedMotion = useApp((s) => s.reducedMotion);
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const btn = stripRef.current?.children[active] as HTMLElement | undefined;
    btn?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [active, reducedMotion]);

  return (
    <nav
      aria-label="chapters"
      className={`lg:hidden fixed bottom-0 inset-x-0 z-20 panel border-t border-graphite transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div
        ref={stripRef}
        className="flex gap-1 overflow-x-auto px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {CHAPTERS.map((c, i) => {
          const isActive = i === active;
          return (
            <a
              key={c.id}
              href={`#${c.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(c.id)?.scrollIntoView({
                  behavior: reducedMotion ? "auto" : "smooth",
                  block: "start",
                });
              }}
              className={`shrink-0 whitespace-nowrap px-2.5 py-1.5 text-[12px] border ${
                isActive
                  ? "border-copper text-copper"
                  : "border-graphite text-faint"
              }`}
            >
              {String(i + 1).padStart(2, "0")} {c.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
