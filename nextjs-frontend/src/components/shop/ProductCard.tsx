"use client";

import { ProductCardRead } from "@/api/openapi-client";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { RevealBlock } from "@/components/ui/misc";
import { cn, displayPrice } from "@/lib/utils";
import { ArrowUpRight, Heart, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface ProductCardProps {
  product: ProductCardRead;
  delay?: number;
  view?: "grid" | "list";
}

export function ProductCard({
  product,
  delay = 0,
  view = "grid",
}: ProductCardProps) {
  const [wishlisted, setWishlisted] = useState(false);
  const price =
    typeof product.price === "string"
      ? parseFloat(product.price)
      : (product.price ?? 0);

  return (
    <RevealBlock delay={delay}>
      <div className="group bg-background relative h-full flex flex-col transition-all duration-500 hover:shadow-lg card-luxury">
        <Link href={`/shop/${product.slug}`} className="block w-full">
          <div
            className={cn(
              "relative overflow-hidden bg-muted-light",
              view === "grid" ? "aspect-3/4" : "aspect-video"
            )}
          >
            <ImageWithFallback
              src={product.primary_image || ""}
              alt={product.title}
              className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000"
            />
            <div className="absolute inset-0 bg-linear-to-t from-dark/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-card backdrop-blur-[2px]">
              <span className="text-foreground text-xs font-mono tracking-widest uppercase flex items-center gap-2">
                View Artwork <ArrowUpRight size={12} className="text-primary" />
              </span>
            </div>
          </div>
        </Link>
        <button
          onClick={(e) => {
            e.preventDefault();
            setWishlisted(!wishlisted);
          }}
          className="absolute top-4 right-4 w-10 h-10 bg-background/60 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10 rounded-full border border-border hover:border-primary"
        >
          <Heart
            size={16}
            fill={wishlisted ? "var(--color-gold)" : "none"}
            className={wishlisted ? "text-primary" : "text-text-muted"}
          />
        </button>
        <div className="p-card flex-1 flex flex-col justify-between">
          <div>
            <div className="text-2xs font-mono text-text-muted tracking-widest uppercase mb-2">
              {product.medium?.name || "Original Work"}
            </div>
            <div className="text-foreground font-bold tracking-wide group-hover:text-primary transition-colors">
              {product.title}
            </div>
          </div>
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/10">
            <span className="text-primary font-bold text-lg italic">
              {displayPrice(price)}
            </span>
            <button className="text-2xs font-mono text-text-muted tracking-widest uppercase hover:text-foreground transition-colors flex items-center gap-1.5 border-b border-transparent hover:border-primary/40">
              <ShoppingBag size={12} /> Inquire
            </button>
          </div>
        </div>
      </div>
    </RevealBlock>
  );
}

export function BestSellerCard({
  product,
  delay = 0,
}: {
  product: ProductCardRead;
  delay?: number;
}) {
  const price =
    typeof product.price === "string"
      ? parseFloat(product.price)
      : (product.price ?? 0);

  return (
    <RevealBlock delay={delay}>
      <Link
        href={`/shop/${product.slug}`}
        className="group bg-surface flex gap-6 p-card w-full text-left transition-all duration-500 card-luxury-hover"
      >
        <div className="w-24 h-32 shrink-0 overflow-hidden bg-background border border-border">
          <ImageWithFallback
            src={product.primary_image || ""}
            alt={product.title}
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-1000"
          />
        </div>
        <div className="flex flex-col justify-between py-1">
          <div>
            <div className="text-2xs font-mono text-text-muted tracking-[0.2em] uppercase mb-2">
              {product.medium?.name || "Original Work"}
            </div>
            <div className="text-foreground font-bold text-lg leading-tight tracking-wide group-hover:text-primary transition-colors italic">
              {product.title}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-primary font-bold text-lg">
              {displayPrice(price)}
            </span>
            <span className="text-text-muted text-2xs font-mono flex items-center gap-1.5 group-hover:text-foreground transition-colors uppercase tracking-widest">
              View <ArrowUpRight size={12} className="text-primary" />
            </span>
          </div>
        </div>
      </Link>
    </RevealBlock>
  );
}
