"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Toaster } from "sonner";

import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { AtmosphericGlow } from "@/components/shared/AtmosphericGlow";
import { CustomCursor } from "@/components/shared/CustomCursor";
import { GalaxyBackground } from "@/components/shared/GalaxyBackground";
import { useAuth } from "@/lib/auth-store";

const authRoutes = new Set(["/login", "/signup"]);

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isLoading } = useAuth();

  const isAuthRoute = authRoutes.has(pathname);
  const isAdminRoute = pathname.startsWith("/admin");
  const hideNavFooter = isAuthRoute || isAdminRoute;

  return (
    <>
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loader"
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-1000 bg-background flex flex-col items-center justify-center"
          >
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl italic font-black tracking-tighter text-foreground"
            >
              ARTIST<span className="text-primary">KASHI</span>
            </motion.h1>
            <motion.div className="w-48 h-px bg-border mt-8 relative overflow-hidden">
              <motion.div
                className="absolute inset-0 bg-primary"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <GalaxyBackground />
      <AtmosphericGlow />
      {!isAuthRoute && <CustomCursor />}
      {!hideNavFooter && <Navbar />}
      <main>{children}</main>
      {!hideNavFooter && <Footer />}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-main)",
            borderRadius: "var(--radius-sm)",
          },
        }}
      />
    </>
  );
}
