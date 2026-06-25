"use client";

import { ProductCardRead } from "@/api/openapi-client";
import { RevealBlock } from "@/components/ui/misc";
import { useAuth } from "@/lib/auth-store";
import { useCartStore } from "@/lib/cart-store";
import { displayPrice } from "@/lib/utils";
import { useWishlistStore } from "@/lib/wishlist-store";
import { ArrowUpRight, Check, Heart, Loader2, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

function compactNum(n: number): string {
  if (n < 1000) return String(n);
  if (n < 100000)
    return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1).replace(/\.0$/, "") + "k";
  return (n / 100000).toFixed(1) + "L";
}

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
  const { user } = useAuth();
  const price =
    typeof product.price === "string"
      ? parseFloat(product.price)
      : (product.price ?? 0);

  const storeWishlisted = useWishlistStore((s) => s.productIds[product.id]);
  const wishlisted = product.is_wishlisted ?? !!storeWishlisted;
  const toggleProduct = useWishlistStore((s) => s.toggleProduct);
  const productIds = useCartStore((s) => s.productIds);
  const storeInCart = Object.keys(productIds).some(
    (k) => k === product.id || k.startsWith(`${product.id}:`)
  );
  const inCart = product.is_in_cart ?? storeInCart;
  const addItem = useCartStore((s) => s.addItem);
  const [cartLoading, setCartLoading] = useState(false);

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await toggleProduct(product.id);
    } catch {
      toast.error("Failed to update wishlist");
    }
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    setCartLoading(true);
    try {
      await addItem(product.id);
    } catch {
      toast.error("Failed to add to cart");
    } finally {
      setCartLoading(false);
    }
  };

  const rating = product.average_rating ?? 0;
  const reviewCount = product.review_count ?? 0;
  const soldCount = product.sold_count ?? 0;

  if (view === "list") {
    return (
      <RevealBlock delay={delay}>
        <Link
          href={`/shop/${product.slug}`}
          className="group bg-background flex border border-border/20 hover:border-border/60 transition-all duration-300 rounded-sm overflow-hidden"
        >
          <div className="w-28 md:w-40 shrink-0 overflow-hidden bg-muted-light relative">
            {product.primary_image ? (
              <img
                src={product.primary_image}
                alt={product.title}
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full text-text-muted/20">
                <ShoppingBag size={24} strokeWidth={1} />
              </div>
            )}
          </div>
          <div className="flex-1 flex flex-col justify-between p-4 md:p-5 min-w-0">
            <div className="min-w-0">
              <div className="text-2xs font-mono text-text-muted tracking-widest uppercase mb-1">
                {product.medium?.name || "Original Work"}
              </div>
              <h3 className="text-foreground font-bold text-sm md:text-base leading-tight tracking-wide group-hover:text-primary transition-colors truncate">
                {product.title}
              </h3>
              {product.short_description && (
                <p className="text-text-muted text-xs mt-1.5 line-clamp-2 leading-relaxed">
                  {product.short_description}
                </p>
              )}
            </div>
            {(rating > 0 || reviewCount > 0 || soldCount > 0) && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3">
                {(rating > 0 || reviewCount > 0) && (
                  <span className="text-xs text-foreground">
                    ⭐ {rating > 0 ? rating.toFixed(1) : "—"}{" "}
                    {reviewCount > 0 && (
                      <span className="text-text-muted">
                        ({compactNum(reviewCount)} review
                        {reviewCount !== 1 ? "s" : ""})
                      </span>
                    )}
                  </span>
                )}
                {soldCount > 0 && (
                  <span className="text-2xs text-text-muted">
                    {compactNum(soldCount)} sold
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/10">
              <span className="text-primary font-bold text-base md:text-lg italic">
                {displayPrice(price)}
              </span>
              <div className="flex items-center gap-2">
                {user && (
                  <button
                    onClick={handleWishlist}
                    className="w-9 h-9 flex items-center justify-center rounded-full border border-border/40 hover:border-primary/40 transition-all text-text-muted hover:text-primary"
                  >
                    <Heart
                      size={14}
                      fill={wishlisted ? "var(--color-gold)" : "none"}
                      className={wishlisted ? "text-primary" : ""}
                    />
                  </button>
                )}
                <button
                  onClick={handleAddToCart}
                  disabled={cartLoading}
                  className="px-4 py-2 bg-primary/10 text-primary text-2xs font-mono tracking-widest uppercase rounded-sm hover:bg-primary hover:text-dark transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {cartLoading ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : inCart ? (
                    <Check size={12} />
                  ) : (
                    <ShoppingBag size={12} />
                  )}
                  {cartLoading ? "Adding..." : inCart ? "Added" : "Add to Cart"}
                </button>
              </div>
            </div>
          </div>
        </Link>
      </RevealBlock>
    );
  }

  return (
    <RevealBlock delay={delay}>
      <div className="group bg-background relative h-full flex flex-col transition-all duration-500 hover:shadow-lg card-luxury">
        <Link href={`/shop/${product.slug}`} className="block w-full">
          <div className="relative overflow-hidden bg-muted-light aspect-3/4">
            {product.primary_image ? (
              <img
                src={product.primary_image}
                alt={product.title}
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full text-text-muted/20">
                <ShoppingBag size={32} strokeWidth={1} />
              </div>
            )}
            <div className="absolute inset-0 bg-linear-to-t from-dark/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-card">
              <span className="text-foreground text-xs font-mono tracking-widest uppercase flex items-center gap-2">
                View Artwork <ArrowUpRight size={12} className="text-primary" />
              </span>
            </div>
          </div>
        </Link>
        {user && (
          <button
            onClick={handleWishlist}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-black/40 backdrop-blur-sm border border-white/20 rounded-sm hover:bg-danger/20 hover:border-danger/40 transition-all z-10"
          >
            <Heart
              size={14}
              className={
                wishlisted ? "fill-danger text-danger" : "text-white/80"
              }
            />
          </button>
        )}
        <div className="p-card flex-1 flex flex-col justify-between">
          <div>
            <div className="text-2xs font-mono text-text-muted tracking-widest uppercase mb-2">
              {product.medium?.name || "Original Work"}
            </div>
            <div className="text-foreground font-bold tracking-wide group-hover:text-primary transition-colors leading-tight">
              {product.title}
            </div>
            {(rating > 0 || reviewCount > 0) && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-foreground">
                  ⭐ {rating > 0 ? rating.toFixed(1) : "—"}{" "}
                  {reviewCount > 0 && (
                    <span className="text-text-muted">
                      ({compactNum(reviewCount)})
                    </span>
                  )}
                </span>
              </div>
            )}
            {soldCount > 0 && (
              <span className="text-2xs text-text-muted mt-0.5 block">
                {compactNum(soldCount)} sold
              </span>
            )}
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/10">
            <span className="text-primary font-bold text-lg italic">
              {displayPrice(price)}
            </span>
            <button
              onClick={handleAddToCart}
              disabled={cartLoading}
              className="text-2xs font-mono text-text-muted tracking-widest uppercase hover:text-foreground transition-colors flex items-center gap-1.5 border-b border-transparent hover:border-primary/40 disabled:opacity-50"
            >
              {cartLoading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : inCart ? (
                <Check size={12} className="text-primary" />
              ) : (
                <ShoppingBag size={12} />
              )}
              {cartLoading ? "Adding..." : inCart ? "Added" : "Add to Cart"}
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

  const rating = product.average_rating ?? 0;
  const reviewCount = product.review_count ?? 0;

  return (
    <RevealBlock delay={delay}>
      <Link
        href={`/shop/${product.slug}`}
        className="group bg-surface flex gap-6 p-card w-full text-left transition-all duration-500 card-luxury-hover"
      >
        <div className="w-24 h-32 shrink-0 overflow-hidden bg-background border border-border">
          {product.primary_image ? (
            <img
              src={product.primary_image}
              alt={product.title}
              className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-1000"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-text-muted/20">
              <ShoppingBag size={24} strokeWidth={1} />
            </div>
          )}
        </div>
        <div className="flex flex-col justify-between py-1 min-w-0">
          <div>
            <div className="text-2xs font-mono text-text-muted tracking-[0.2em] uppercase mb-2">
              {product.medium?.name || "Original Work"}
            </div>
            <div className="text-foreground font-bold text-lg leading-tight tracking-wide group-hover:text-primary transition-colors italic truncate">
              {product.title}
            </div>
            {(rating > 0 || reviewCount > 0) && (
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs text-foreground">
                  ⭐ {rating > 0 ? rating.toFixed(1) : "—"}{" "}
                  {reviewCount > 0 && (
                    <span className="text-text-muted">
                      ({compactNum(reviewCount)})
                    </span>
                  )}
                </span>
              </div>
            )}
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
