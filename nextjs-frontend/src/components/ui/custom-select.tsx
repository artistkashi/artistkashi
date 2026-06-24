"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Option {
  value: string | number;
  label: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder: string;
  className?: string;
  buttonClassName?: string;
  label?: string;
  error?: string;
  dropdownPosition?: "top" | "bottom";
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder,
  className,
  buttonClassName,
  label,
  error,
  dropdownPosition = "bottom",
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      className={cn("space-y-1 w-full flex flex-col justify-center", className)}
      ref={containerRef}
    >
      {label && (
        <label className="text-label! font-mono tracking-widest uppercase text-text-muted block mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full bg-surface border border-border px-4 py-3 text-sm text-foreground flex items-center justify-between rounded-sm transition-all duration-300 focus:outline-none focus:border-primary",
            buttonClassName,
            isOpen && "border-primary bg-surface",
            error && "border-danger danger-glow"
          )}
        >
          <span
            className={cn(
              "truncate",
              !selectedOption &&
                "text-text-muted/50 uppercase font-mono text-2xs"
            )}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronRight
            size={12}
            className={cn(
              "text-primary/60 transition-transform duration-300",
              isOpen ? "-rotate-90" : "rotate-90"
            )}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: dropdownPosition === "top" ? 10 : -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: dropdownPosition === "top" ? 10 : -10 }}
              className={cn(
                "absolute z-50 w-full bg-surface border border-border backdrop-blur-xl max-h-60 overflow-y-auto scrollbar-hide shadow-lg rounded card-luxury",
                dropdownPosition === "top"
                  ? "bottom-full mb-1"
                  : "top-full mt-1"
              )}
            >
              <div className="py-1">
                {options.length > 0 ? (
                  options.map((option) => (
                    <button
                      key={`select-opt-${option.value}`}
                      type="button"
                      onClick={() => {
                        onChange(option.value);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full px-4 py-2.5 text-left text-2xs uppercase font-mono tracking-wider transition-colors flex items-center justify-between",
                        option.value === value
                          ? "bg-gold-bg text-primary"
                          : "text-text-muted hover:bg-gold-bg hover:text-foreground"
                      )}
                    >
                      {option.label}
                      {option.value === value && <Check size={10} />}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-2xs uppercase font-mono tracking-wider text-text-muted opacity-50">
                    No options available
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {error && <p className="text-xs text-danger font-mono mt-1">{error}</p>}
    </div>
  );
}
