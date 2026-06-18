"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, Info, X, XCircle } from "lucide-react";
import { useEffect } from "react";
import { GhostBtn, PrimaryBtn } from "./buttons";

export type ModalType = "success" | "error" | "warning" | "info";

interface StatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: ModalType;
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
  secondaryText?: string;
  onSecondary?: () => void;
}

export function StatusModal({
  isOpen,
  onClose,
  type = "success",
  title,
  message,
  actionText,
  onAction,
  secondaryText,
  onSecondary,
}: StatusModalProps) {
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const config = {
    success: {
      icon: <Check className="w-12 h-12 text-white" />,
      color: "bg-emerald-500",
      lightColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
      shadow: "shadow-emerald-500/20",
      glow: "bg-emerald-500/20",
    },
    error: {
      icon: <XCircle className="w-12 h-12 text-white" />,
      color: "bg-red-500",
      lightColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
      shadow: "shadow-red-500/20",
      glow: "bg-red-500/20",
    },
    warning: {
      icon: <AlertTriangle className="w-12 h-12 text-white" />,
      color: "bg-amber-500",
      lightColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
      shadow: "shadow-amber-500/20",
      glow: "bg-amber-500/20",
    },
    info: {
      icon: <Info className="w-12 h-12 text-white" />,
      color: "bg-blue-500",
      lightColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
      shadow: "shadow-blue-500/20",
      glow: "bg-blue-500/20",
    },
  };

  const current = config[type];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "relative w-full max-w-sm bg-surface border rounded-xl shadow-2xl overflow-hidden",
              current.borderColor
            )}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-text-muted hover:text-text-main transition-colors z-10"
            >
              <X size={20} />
            </button>

            <div className="pt-12 pb-8 px-8 text-center flex flex-col items-center">
              {/* Animated Icon Container */}
              <div className="relative mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                  className={cn(
                    "w-24 h-24 rounded-full flex items-center justify-center relative z-10",
                    current.color,
                    current.shadow,
                    "shadow-lg"
                  )}
                >
                  {current.icon}
                </motion.div>

                {/* Decorative pulse */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1.5, opacity: 1 }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                  className={cn("absolute inset-0 rounded-full", current.glow)}
                />
              </div>

              {/* Text Content */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-3"
              >
                <h3 className="text-xl font-bold uppercase tracking-wider text-text-main">
                  {title}
                </h3>
                <p className="text-sm text-text-muted leading-relaxed font-mono uppercase tracking-tighter">
                  {message}
                </p>
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-8 flex flex-col gap-3 w-full"
              >
                {actionText && (
                  <PrimaryBtn
                    onClick={onAction || onClose}
                    className={cn(
                      "w-full justify-center py-4 text-xs tracking-[0.2em]",
                      type === "error" &&
                        "bg-red-500 hover:bg-red-600 border-red-400"
                    )}
                  >
                    {actionText}
                  </PrimaryBtn>
                )}
                {secondaryText && (
                  <GhostBtn
                    onClick={onSecondary || onClose}
                    className="w-full justify-center py-4 text-xs tracking-[0.2em] border-border/50"
                  >
                    {secondaryText}
                  </GhostBtn>
                )}
              </motion.div>
            </div>

            {/* Bottom Progress/Decorative Line */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className={cn("h-1", current.color)}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
