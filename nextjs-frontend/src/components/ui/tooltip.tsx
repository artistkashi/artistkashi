"use client";

import type { ReactNode } from "react";

export function Tooltip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="relative group">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-2xs font-mono uppercase tracking-wider whitespace-nowrap rounded bg-dark border border-border text-text-muted pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
        {label}
      </div>
    </div>
  );
}
