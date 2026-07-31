"use client";

/**
 * the one card treatment used across the page: a quiet header row with a
 * small label, an optional bit of chrome on the right (like the network
 * view's enlarge toggle or the inspector's close button), then the body.
 */
export default function Panel({
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
    <div className={`panel flex flex-col overflow-hidden ${className}`}>
      <div className="shrink-0 h-9 flex items-center gap-2 px-4 border-b border-graphite">
        <span className="flex-1 min-w-0 truncate text-[11px] font-medium uppercase tracking-[0.08em] text-faint">
          {label}
        </span>
        {right}
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
