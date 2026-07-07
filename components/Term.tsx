"use client";

import { useId, useState } from "react";

/**
 * a word with a dotted underline that explains itself when you hover it
 * (or tap it, or tab to it). used all over the explainer so nobody has to
 * pretend they know what "logit" means.
 */
export default function Term({ d, children }: { d: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="relative">
      <button
        type="button"
        className="term text-inherit"
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
      >
        {children}
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute left-1/2 bottom-full z-40 mb-1.5 w-60 -translate-x-1/2 rounded panel px-3 py-2 text-[12px] leading-relaxed text-ink shadow-sm normal-case font-normal"
        >
          {d}
        </span>
      )}
    </span>
  );
}
