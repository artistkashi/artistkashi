"use client";

import { RevealBlock } from "@/components/shared/RevealBlock";
import { PrimaryBtn } from "@/components/ui/buttons";
import { cn, displayPrice } from "@/lib/utils";
import { ArrowRight, ShieldCheck, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";

export default function CartPage() {
  const [activeTab, setActiveTab] = useState<"courses" | "paintings">(
    "courses"
  );
  const [items, setItems] = useState([
    {
      id: 1,
      type: "course",
      title: "The Cinematic Eye",
      price: 299,
      image:
        "https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=400",
    },
    {
      id: 101,
      type: "painting",
      title: "Shadows of Banaras",
      price: 12500,
      image:
        "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=400",
    },
  ]);

  const removeItem = (id: number) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const total = items.reduce((acc, item) => acc + item.price, 0);
  const filteredItems = items.filter((i) =>
    activeTab === "courses" ? i.type === "course" : i.type === "painting"
  );

  return (
    <div className="pt-32 pb-24 px-6 bg-background min-h-screen">
      <div className="max-w-480 mx-auto px-6 md:px-12 lg:px-24">
        <RevealBlock direction="down">
          <h1 className="text-6xl italic uppercase tracking-tighter mb-12">
            Your Collection
          </h1>
        </RevealBlock>

        <div className="flex flex-col lg:flex-row gap-16">
          <div className="lg:w-2/3">
            {/* Tab Switcher */}
            <div className="flex gap-12 border-b border-border mb-12">
              <button
                onClick={() => setActiveTab("courses")}
                className={cn(
                  "pb-4 text-xs font-black uppercase tracking-[0.3em] transition-all relative",
                  activeTab === "courses"
                    ? "text-primary"
                    : "text-text-muted hover:text-foreground"
                )}
              >
                Academy Courses (
                {items.filter((i) => i.type === "course").length})
                {activeTab === "courses" && (
                  <motion.div
                    layoutId="cartTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  />
                )}
              </button>
              <button
                onClick={() => setActiveTab("paintings")}
                className={cn(
                  "pb-4 text-xs font-black uppercase tracking-[0.3em] transition-all relative",
                  activeTab === "paintings"
                    ? "text-primary"
                    : "text-text-muted hover:text-foreground"
                )}
              >
                Original Art (
                {items.filter((i) => i.type === "painting").length})
                {activeTab === "paintings" && (
                  <motion.div
                    layoutId="cartTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  />
                )}
              </button>
            </div>

            <div className="space-y-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {filteredItems.length > 0 ? (
                    filteredItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex gap-6 p-card card-luxury-hover group relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-linear-to-r from-foreground/5 to-transparent pointer-events-none" />
                        <div className="w-24 h-24 md:w-32 md:h-32 shrink-0 bg-background border border-border overflow-hidden">
                          <img
                            src={item.image}
                            className="w-full h-full object-cover grayscale transition-transform duration-700 group-hover:scale-110 group-hover:grayscale-0"
                            alt=""
                          />
                        </div>
                        <div className="flex-1 flex flex-col justify-between py-2">
                          <div>
                            <h3 className="text-xl font-bold uppercase tracking-tight italic text-foreground">
                              {item.title}
                            </h3>
                            <p className="text-2xs text-text-muted uppercase tracking-widest mt-1 font-mono">
                              {item.type === "course"
                                ? "Instant Digital Access"
                                : "Museum-Grade Physical Work"}
                            </p>
                          </div>
                          <span className="text-2xl font-black italic text-primary">
                            {displayPrice(item.price)}
                          </span>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-text-muted hover:text-danger transition-colors self-start p-2"
                        >
                          <X className="w-6 h-6" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="py-24 text-center border border-border bg-muted/30">
                      <p className="text-2xs uppercase tracking-widest text-text-muted font-mono">
                        The collection is empty in this realm.
                      </p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Checkout Summary */}
          <div className="lg:w-1/3">
            <div className="p-8 card-luxury sticky top-32 bg-surface">
              <h3 className="text-sm font-bold uppercase tracking-widest border-b border-border pb-4 mb-8 text-center text-foreground">
                Chronicle Summary
              </h3>
              <div className="space-y-4 mb-8 text-xs uppercase tracking-widest font-mono">
                <div className="flex justify-between">
                  <span className="text-text-muted">Subtotal</span>
                  <span className="text-foreground">{displayPrice(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Shipping</span>
                  <span className="text-primary italic">Complimentary</span>
                </div>
                <div className="flex justify-between border-t border-border pt-4 mt-4">
                  <span className="font-black text-foreground">Total</span>
                  <span className="text-xl font-black italic text-primary">
                    {displayPrice(total)}
                  </span>
                </div>
              </div>

              <Link href="/checkout" className="block w-full">
                <PrimaryBtn className="w-full text-2xs tracking-[0.4em]">
                  PROCEED TO BILLING <ArrowRight className="w-4 h-4" />
                </PrimaryBtn>
              </Link>

              <div className="mt-8 flex items-center justify-center gap-3 text-2xs text-text-muted uppercase tracking-widest font-mono">
                <ShieldCheck className="w-4 h-4 text-primary" /> Encrypted
                Checkout
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
