"use client";

import type { WishlistRead } from "@/api/openapi-client";
import { useAuth } from "@/lib/auth-store";
import { useCartStore } from "@/lib/cart-store";
import { useWishlistStore } from "@/lib/wishlist-store";
import { cn, displayPrice } from "@/lib/utils";
import {
  ArrowRight,
  Heart,
  Loader2,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function WishlistPage() {
  const { user } = useAuth();
  const {
    items,
    loaded,
    fetchWishlist,
    removeItem,
    toggleProduct,
    toggleCourse,
  } = useWishlistStore();
  const addItemToCart = useCartStore((s) => s.addItem);
  const [activeTab, setActiveTab] = useState<"courses" | "paintings">(
    "paintings"
  );
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    if (!loaded) fetchWishlist();
  }, [loaded, fetchWishlist]);

  const productItems = items.filter((i) => i.product_id && i.product);
  const courseItems = items.filter((i) => i.course_id && i.course);

  const handleRemove = async (item: WishlistRead) => {
    setProcessingId(item.id);
    try {
      await removeItem(item.id);
      toast.success("Removed from wishlist");
    } catch {
      toast.error("Failed to remove item");
    } finally {
      setProcessingId(null);
    }
  };

  const handleAddToCart = async (item: WishlistRead) => {
    if (!item.product_id && !item.course_id) return;
    setProcessingId(item.id);
    try {
      await addItemToCart(item.product_id || item.course_id!, item.product_id ? "product" : "course");
      toast.success("Added to cart");
    } catch {
      toast.error("Failed to add to cart");
    } finally {
      setProcessingId(null);
    }
  };

  const currentItems =
    activeTab === "paintings" ? productItems : courseItems;

  return (
    <div className="pt-32 pb-24 px-6 bg-background min-h-screen">
      <div className="max-w-[1920px] mx-auto px-6 md:px-12 lg:px-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8 border-b border-border pb-12">
          <div>
            <span className="text-primary text-2xs uppercase tracking-[0.5em] mb-4 font-bold block font-mono">
              Curated Interests
            </span>
            <h1 className="text-4xl md:text-5xl italic uppercase tracking-tighter text-foreground">
              Your Wishlist
            </h1>
          </div>
          <p className="max-w-xs text-2xs uppercase tracking-widest text-text-muted leading-loose font-mono">
            Refine your vision. A sanctuary for the masterworks and
            masterclasses that resonate with your spirit.
          </p>
        </div>

        {!loaded ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-text-muted" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <Heart size={48} className="mx-auto text-text-muted/30 mb-6" />
            <p className="text-text-muted text-sm mb-8">
              Your wishlist is empty. Discover artworks and courses that inspire
              you.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 px-6 py-3 border border-primary/30 text-primary text-xs font-mono tracking-widest uppercase hover:bg-primary/10 transition-colors rounded"
              >
                Browse Artworks <ArrowRight size={14} />
              </Link>
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 px-6 py-3 border border-border/60 text-text-muted text-xs font-mono tracking-widest uppercase hover:text-text-main transition-colors rounded"
              >
                Explore Courses <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Tab Switcher */}
            <div className="flex gap-12 border-b border-border mb-12">
              <button
                onClick={() => setActiveTab("paintings")}
                className={cn(
                  "pb-4 text-xs font-black uppercase tracking-[0.3em] transition-all relative font-mono",
                  activeTab === "paintings"
                    ? "text-primary"
                    : "text-text-muted hover:text-foreground"
                )}
              >
                Paintings & Artworks ({productItems.length})
                {activeTab === "paintings" && (
                  <motion.div
                    layoutId="wishlistTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  />
                )}
              </button>
              <button
                onClick={() => setActiveTab("courses")}
                className={cn(
                  "pb-4 text-xs font-black uppercase tracking-[0.3em] transition-all relative font-mono",
                  activeTab === "courses"
                    ? "text-primary"
                    : "text-text-muted hover:text-foreground"
                )}
              >
                Academy Courses ({courseItems.length})
                {activeTab === "courses" && (
                  <motion.div
                    layoutId="wishlistTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  />
                )}
              </button>
            </div>

            {/* Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {currentItems.map((item) => {
                  const isProduct = !!item.product;
                  const title = isProduct
                    ? item.product?.title ?? "Artwork"
                    : item.course?.title ?? "Course";
                  const slug = isProduct
                    ? item.product?.slug
                    : item.course?.slug;
                  const href = isProduct
                    ? `/shop/${slug}`
                    : `/courses/${slug}`;
                  const image = isProduct
                    ? item.product?.primary_image
                    : item.course?.thumbnail_url ?? item.course?.computed_thumbnail_url;
                  const price = isProduct
                    ? item.product?.price
                      ? Number(item.product.price)
                      : 0
                    : item.course?.price
                      ? Number(item.course.price)
                      : 0;
                  const subtitle = isProduct
                    ? item.product?.medium?.name ?? "Original Work"
                    : item.course?.category?.name ?? "Course";

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group bg-surface border border-border overflow-hidden"
                    >
                      <Link href={href} className="block">
                        <div className="aspect-4/3 overflow-hidden bg-muted-light/50">
                          {image ? (
                            <img
                              src={image}
                              alt={title}
                              className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-text-muted/20 text-2xs font-mono uppercase">
                              No Image
                            </div>
                          )}
                        </div>
                      </Link>
                      <div className="p-5">
                        <div className="text-2xs font-mono text-text-muted uppercase tracking-widest mb-1">
                          {subtitle}
                        </div>
                        <Link
                          href={href}
                          className="text-text-main font-semibold text-sm hover:text-primary transition-colors line-clamp-1"
                        >
                          {title}
                        </Link>
                        {price > 0 && (
                          <div className="text-primary font-bold text-sm mt-2 italic">
                            {displayPrice(price)}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/10">
                          <button
                            onClick={() => handleAddToCart(item)}
                            disabled={processingId === item.id}
                            className="flex items-center justify-center gap-2 flex-1 px-3 py-2 border border-border/60 text-text-muted text-2xs font-mono tracking-widest uppercase hover:text-primary hover:border-primary/40 transition-all rounded-sm disabled:opacity-50"
                          >
                            {processingId === item.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <ShoppingBag size={12} />
                            )}
                            Add to Cart
                          </button>
                          <button
                            onClick={() => handleRemove(item)}
                            disabled={processingId === item.id}
                            className="flex items-center justify-center w-9 h-9 border border-border/60 text-text-muted hover:text-danger hover:border-danger/40 transition-all rounded-sm disabled:opacity-50"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
