"use client";

import { cn } from "@/lib/utils";
import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function PrimaryBtn({ children, className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "group relative inline-flex items-center justify-center gap-3 px-8 py-4 rounded bg-primary text-dark text-sm font-semibold tracking-[0.08em] uppercase overflow-hidden transition-all duration-300 enabled:hover:scale-[1.02] enabled:active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none gold-glow cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function GhostBtn({ children, className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-3 rounded px-8 py-4 border border-border text-text-muted text-sm font-semibold tracking-[0.08em] uppercase transition-all duration-300 enabled:hover:border-primary enabled:hover:text-primary enabled:hover:bg-gold-bg enabled:hover:scale-[1.02] enabled:active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
