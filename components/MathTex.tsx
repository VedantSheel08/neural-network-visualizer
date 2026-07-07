"use client";

import katex from "katex";
import { useMemo } from "react";

interface MathTexProps {
  tex: string;
  block?: boolean;
  className?: string;
}

/** Render a LaTeX string with KaTeX. Numbers inside are live data upstream. */
export default function MathTex({ tex, block = false, className }: MathTexProps) {
  const html = useMemo(
    () =>
      katex.renderToString(tex, {
        displayMode: block,
        throwOnError: false,
        strict: false,
      }),
    [tex, block]
  );
  const Tag = block ? "div" : "span";
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
