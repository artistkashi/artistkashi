"use client";

import type { LucideIcon } from "lucide-react";
import { AnimatedCounter } from "./AnimatedCounter";

interface StatsCardProps {
  label: string;
  value: number;
  suffix?: string;
  icon: LucideIcon;
}

export function StatsCard({ label, value, suffix = "", icon: Icon }: StatsCardProps) {
  return (
    <div className="group card-luxury-hover bg-surface border border-border rounded p-4 md:p-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-20 h-20 bg-gold/5 rounded-bl-full transition-all duration-500 group-hover:bg-gold/10" />
      <div className="relative">
        <div className="w-9 h-9 rounded-sm bg-gold-bg border border-gold/20 flex items-center justify-center mb-3">
          <Icon size={16} className="text-gold" />
        </div>
        <div className="text-text-main font-extrabold text-2xl md:text-3xl tracking-tight">
          <AnimatedCounter target={value} suffix={suffix} />
        </div>
        <div className="text-text-muted text-tiny font-mono mt-1.5 uppercase tracking-widest">
          {label}
        </div>
      </div>
    </div>
  );
}
