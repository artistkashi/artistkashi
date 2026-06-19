"use client";

import { ProductCard } from "@/components/shop/ProductCard";
import { PrimaryBtn } from "@/components/ui/buttons";
import { RevealBlock } from "@/components/ui/misc";
import { PAINTINGS } from "@/data/constants";
import { cn } from "@/lib/utils";
import { ArrowRight, Grid, List } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export default function ShopPage() {
  const [view, setView] = useState<"grid" | "list">("grid");

  return (
    <main className="pt-32 min-h-screen ">
      <div className="max-w-360 mx-auto px-8 lg:px-16">
        <RevealBlock>
          <div className="border-b border-border pb-16 mb-12">
            <div className="text-label! font-mono text-primary tracking-[0.2em] uppercase mb-4">
              The Gallery Shop
            </div>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
              <h1 className="text-h1 font-extrabold tracking-[-0.03em] text-foreground leading-[0.9]">
                Original Works
                <br />& Art Prints
              </h1>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setView("grid")}
                  className={cn(
                    "p-2 border transition-all duration-300",
                    view === "grid"
                      ? "border-primary text-primary bg-gold-bg"
                      : "border-border text-text-muted hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  <Grid size={16} />
                </button>
                <button
                  onClick={() => setView("list")}
                  className={cn(
                    "p-2 border transition-all duration-300",
                    view === "list"
                      ? "border-primary text-primary bg-gold-bg"
                      : "border-border text-text-muted hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>
        </RevealBlock>

        <div
          className={cn(
            "gap-px ",
            view === "grid"
              ? "grid grid-cols-2 lg:grid-cols-4"
              : "grid grid-cols-1 md:grid-cols-2"
          )}
        >
          {PAINTINGS.map((p, i) => (
            <ProductCard
              key={`shop-product-${p.id}`}
              product={p}
              delay={i * 0.08}
              view={view}
            />
          ))}
        </div>

        {/* Custom commission CTA */}
        <RevealBlock>
          <div className="mt-24 border border-border p-card card-luxury grid grid-cols-1 md:grid-cols-2 gap-10 items-center overflow-hidden">
            <div>
              <div className="text-label! font-mono text-primary tracking-[0.2em] uppercase mb-4">
                Bespoke
              </div>
              <h2 className="text-h3 font-extrabold tracking-tight text-foreground mb-4">
                Commission a Custom Work
              </h2>
              <p className="text-text-muted leading-relaxed text-sm mb-8 font-mono tracking-wide">
                Work directly with an artist from our roster to bring a specific
                vision to canvas. We manage the brief, timeline, and secure
                delivery.
              </p>
              <PrimaryBtn>
                Begin a Commission <ArrowRight size={16} />
              </PrimaryBtn>
            </div>
            <div className="relative aspect-video overflow-hidden bg-muted-light border border-border shadow-inner">
              <Image
                src="https://images.unsplash.com/photo-1762463464555-baf824f1e601?w=600&h=400&fit=crop&auto=format"
                alt="Framed art"
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover grayscale opacity-60 transition-all duration-1000 hover:grayscale-0 hover:scale-105"
              />
            </div>
          </div>
        </RevealBlock>
      </div>
    </main>
  );
}
