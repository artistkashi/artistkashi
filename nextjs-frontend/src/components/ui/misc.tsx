"use client";

import { cn } from "@/lib/utils";
import { motion, useInView } from "motion/react";
import React, { useEffect, useRef, useState } from "react";

export function RevealBlock({
  children,
  delay = 0,
  className = "",
  direction = "up",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  direction?: "up" | "down" | "left" | "right" | "none";
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(
      window.matchMedia("(hover: none), (pointer: coarse)").matches
    );
  }, []);

  const variants = {
    hidden: isTouch
      ? { opacity: 0 }
      : {
          opacity: 0,
          y: direction === "up" ? 80 : direction === "down" ? -80 : 0,
          x: direction === "left" ? 80 : direction === "right" ? -80 : 0,
          scale: 0.9,
          rotateX: 20,
        },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
      rotateX: 0,
      transition: {
        duration: isTouch ? 0.5 : 1.2,
        delay,
      },
    },
  } as const;

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : {}}
      variants={variants}
      className={cn(
        "will-change-transform origin-bottom touch-manipulation",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

export function GoldDivider({ className }: { className?: string }) {
  return <div className={cn("w-12 h-px bg-gold my-6", className)} />;
}

export function Tag({ label }: { label: string }) {
  return (
    <span className="text-label tracking-[0.15em] uppercase font-mono text-text-muted border border-border px-3 py-1 rounded">
      {label}
    </span>
  );
}
