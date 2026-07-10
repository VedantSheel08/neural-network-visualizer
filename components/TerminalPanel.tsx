"use client";

/**
 * the bordered, title-barred window treatment used everywhere on the page:
 * three dots, a code-flavored label, an optional bit of chrome on the right
 * (like the network view's enlarge toggle or the inspector's close button),
 * then the body. one shared shell instead of every panel inventing its own.
 */
export default function TerminalPanel({
  label,
  right,
  children,
  className = "",
  bodyClassName = "p-5",
}: {
  label: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={`panel border border-graphite flex flex-col overflow-hidden ${className}`}>
      <div className="shrink-0 h-8 flex items-center gap-2 px-3 border-b border-graphite">
        <span className="flex gap-[6px] shrink-0" aria-hidden="true">
          <svg width="9" height="9"><circle cx="4.5" cy="4.5" r="4.5" fill="#e0605a" /></svg>
          <svg width="9" height="9"><circle cx="4.5" cy="4.5" r="4.5" fill="#e0b04a" /></svg>
          <svg width="9" height="9"><circle cx="4.5" cy="4.5" r="4.5" fill="#5fae5f" /></svg>
        </span>
        <span className="flex-1 min-w-0 truncate text-[11px] text-faint tracking-tight font-mono">
          {label}
        </span>
        {right}
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
