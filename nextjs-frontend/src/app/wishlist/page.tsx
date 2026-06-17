"use client";

import { RevealBlock } from "@/components/shared/RevealBlock";
import { cn } from "@/lib/utils";
import { ArrowRight, Heart, ShoppingBag, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { PrimaryBtn, GhostBtn } from "@/components/ui/buttons";

export default function WishlistPage() {
  const [activeTab, setActiveTab] = useState<"courses" | "paintings">(
    "courses"
  );
  const [wishlistItems, setWishlistItems] = useState([
    {
      id: 1,
      type: "course",
      title: "The Cinematic Eye",
      artist: "Kashi Master",
      price: "₹299",
      image:
        "https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=400",
    },
    {
      id: 101,
      type: "painting",
      title: "Celestial Ghats",
      slug: "celestial-ghats",
      artist: "K. Kashi",
      price: "₹4,500",
      image:
        "https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?q=80&w=400",
    },
    {
      id: 102,
      type: "painting",
      title: "Ancient Echoes",
      slug: "ancient-echoes",
      artist: "M. Verma",
      price: "₹12,000",
      image:
        "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?q=80&w=400",
    },
  ]);

  const removeItem = (id: number) => {
    setWishlistItems(wishlistItems.filter((item) => item.id !== id));
  };

  const filteredItems = wishlistItems.filter((i) =>
    activeTab === "courses" ? i.type === "course" : i.type === "painting"
  );

  return (
    <div className="pt-32 pb-24 px-6 bg-background min-h-screen">
      <div className="max-w-[1920px] mx-auto px-6 md:px-12 lg:px-24">
        <RevealBlock direction="down">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8 border-b border-border pb-12">
            <div>
              <span className="text-primary text-2xs uppercase tracking-[0.5em] mb-4 font-bold block font-mono">
                Curated Interests
              </span>
              <h1 className="text-6xl italic uppercase tracking-tighter text-foreground">
                Your Wishlist
              </h1>
            </div>
            <p className="max-w-xs text-2xs uppercase tracking-widest text-text-muted leading-loose font-mono">
              Refine your vision. A sanctuary for the masterworks and
              masterclasses that resonate with your spirit.
            </p>
          </div>
        </RevealBlock>

        {/* Tab Switcher */}
        <div className="flex gap-12 border-b border-border mb-12">
          <button
            onClick={() => setActiveTab("courses")}
            className={cn(
              "pb-4 text-xs font-black uppercase tracking-[0.3em] transition-all relative font-mono",
              activeTab === "courses"
                ? "text-primary"
                : "text-text-muted hover:text-foreground"
            )}
          >
            Academy Courses (
            {wishlistItems.filter((i) => i.type === "course").length})
            {activeTab === "courses" && (
              <motion.div
                layoutId="wishTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab("paintings")}
            className={cn(
              "pb-4 text-xs font-black uppercase tracking-[0.3em] transition-all relative font-mono",
              activeTab === "paintings"
                ? "text-primary"
                : "text-text-muted hover:text-foreground"
            )}
          >
            Original Art (
            {wishlistItems.filter((i) => i.type === "painting").length})
            {activeTab === "paintings" && (
              <motion.div
                layoutId="wishTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
              />
            )}
          </button>
        </div>

        {wishlistItems.length > 0 ? (
          <div className="min-h-100">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12"
              >
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className="group card-luxury overflow-hidden relative shadow-lg"
                    >
                      {/* Subtle shine */}
                      <div className="absolute inset-0 bg-linear-to-tr from-foreground/5 to-transparent pointer-events-none" />

                      <div className="aspect-video relative overflow-hidden">
                        <img
                          src={item.image}
                          className="w-full h-full object-cover grayscale transition-all duration-1000 group-hover:grayscale-0 group-hover:scale-110"
                          alt={item.title}
                        />
                        <button
                          onClick={() => removeItem(item.id)}
                          className="absolute top-4 right-4 w-10 h-10 bg-background/60 backdrop-blur-md border border-border flex items-center justify-center text-text-muted hover:text-danger hover:border-danger transition-all rounded-full"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="p-8">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-2xl italic uppercase tracking-tighter text-foreground">
                            {item.title}
                          </h3>
                          <span className="text-xl font-black italic text-primary">
                            {item.price}
                          </span>
                        </div>
                        <p className="text-2xs text-text-muted uppercase tracking-widest mb-8 font-mono">
                          By {item.artist}
                        </p>

                        <div className="flex flex-col gap-4">
                          <Link href="/cart" className="block w-full">
                            <PrimaryBtn className="w-full py-4 text-2xs tracking-[0.3em]">
                                MOVE TO COLLECTION <ShoppingBag className="w-4 h-4" />
                            </PrimaryBtn>
                          </Link>
                          <Link
                            href={
                              item.type === "course"
                                ? `/courses/${item.id}`
                                : `/shop/${item.slug}`
                            }
                            className="block w-full"
                          >
                            <GhostBtn className="w-full py-4 text-2xs tracking-[0.3em] font-black">
                                VIEW DETAILS
                            </GhostBtn>
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full py-32 flex flex-col items-center justify-center border border-border bg-surface shadow-inner">
                    <p className="text-2xs uppercase tracking-widest text-text-muted font-mono">
                      No {activeTab} in your sanctuary.
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          <RevealBlock>
            <div className="py-32 flex flex-col items-center justify-center border border-border border-dashed bg-surface card-luxury">
              <Heart className="w-16 h-16 text-primary/10 mb-8" />
              <h3 className="text-2xl italic uppercase tracking-tighter mb-4 text-foreground">
                Your Sanctuary is Empty
              </h3>
              <p className="text-2xs uppercase tracking-widest text-text-muted mb-12 font-mono">
                Return to the gallery to curate your vision.
              </p>
              <Link href="/shop" className="inline-block">
                <PrimaryBtn className="px-12 py-5 text-2xs tracking-widest">
                  EXPLORE THE COLLECTION <ArrowRight className="w-4 h-4" />
                </PrimaryBtn>
              </Link>
            </div>
          </RevealBlock>
        )}

        {/* Suggested Masterclasses at Bottom */}
        <div className="mt-32 pt-24 border-t border-border">
          <h2 className="text-xs uppercase tracking-[0.5em] text-primary font-bold mb-12 text-center md:text-left font-mono">
            RECOMMENDED FOR YOUR VISION
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map((i) => (
              <Link
                key={`suggested-${i}`}
                href="/courses"
                className="card-luxury-hover p-6 flex flex-col gap-4 group cursor-pointer"
              >
                <div className="aspect-square overflow-hidden bg-background border border-border">
                  <img
                    src={`https://images.unsplash.com/photo-1541963463532-d68292c34b19?q=80&w=400&sig=${i}`}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                    alt=""
                  />
                </div>
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-tight italic mb-1 text-foreground">
                    Masterclass 0{i}
                  </h4>
                  <p className="text-2xs text-text-muted uppercase tracking-widest font-mono">
                    Advanced Cinematic Theory
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
