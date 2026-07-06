"use client";

import { CourseListRead } from "@/api/openapi-client";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { RevealBlock } from "@/components/ui/misc";
import { useAuth } from "@/lib/auth-store";
import { useCartStore } from "@/lib/cart-store";
import { useWishlistStore } from "@/lib/wishlist-store";
import { displayPrice } from "@/lib/utils";
import { Check, Clock, Heart, Play, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "@/lib/toast";

function compactNum(n: number): string {
  if (n < 1000) return String(n);
  if (n < 100000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1).replace(/\.0$/, "") + "k";
  return (n / 100000).toFixed(1) + "L";
}

interface CourseCardProps {
  course: CourseListRead;
  delay?: number;
}

function formatDuration(seconds: number | undefined | null): string {
  if (!seconds) return "Self-paced";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function WishlistHeart({ course }: { course: CourseListRead }) {
  const { user } = useAuth();
  const { toggleCourse, isCourseWishlisted } = useWishlistStore();
  const storeWishlisted = isCourseWishlisted(course.id);
  const wishlisted = course.is_wishlisted ?? storeWishlisted;

  if (!user) return null;

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await toggleCourse(course.id);
      toast.success(wishlisted ? "Removed from wishlist" : "Added to wishlist");
    } catch {
      toast.error("Failed to update wishlist");
    }
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center justify-center w-8 h-8 bg-black/40 backdrop-blur-sm border border-white/20 rounded-sm hover:bg-danger/20 hover:border-danger/40 transition-all"
    >
      <Heart
        size={14}
        className={wishlisted ? "fill-danger text-danger" : "text-white/80"}
      />
    </button>
  );
}

function AddToCartBtn({ course }: { course: CourseListRead }) {
  const { user } = useAuth();
  const storeInCart = useCartStore((s) => s.courseIds);
  const inCart = course.is_in_cart ?? !!(
    course.id && storeInCart[course.id]
  );
  const addItem = useCartStore((s) => s.addItem);
  const [cartLoading, setCartLoading] = useState(false);

  if (!user) return null;

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!course.id) return;
    setCartLoading(true);
    try {
      await addItem(course.id, "course");
    } catch {
      toast.error("Failed to add to cart");
    } finally {
      setCartLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={cartLoading}
      className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-text-muted hover:text-primary transition-colors border-b border-transparent hover:border-primary/40 pb-0.5 disabled:opacity-50"
    >
      {cartLoading ? (
        <span className="animate-pulse">Adding...</span>
      ) : inCart ? (
        <>
          <Check size={11} className="text-primary" /> Added
        </>
      ) : (
        <>
          <ShoppingBag size={11} /> Add to Cart
        </>
      )}
    </button>
  );
}

export function CourseCard({ course, delay = 0 }: CourseCardProps) {
  const { user } = useAuth();

  return (
    <RevealBlock delay={delay}>
      <Link
        href={`/courses/${course.slug}`}
        className="group bg-surface block w-full text-left transition-all duration-500 card-luxury-hover overflow-hidden rounded-sm"
      >
        <div className="relative overflow-hidden aspect-video">
          <ImageWithFallback
            src={course.computed_thumbnail_url}
            alt={course.title}
            fill
            unoptimized
            className="object-fill reveal-image group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-linear-to-t from-dark/80 via-transparent to-transparent opacity-60" />
          <div className="absolute top-4 left-4">
            <span className="bg-background/80 backdrop-blur-sm text-primary text-2xs font-mono tracking-widest uppercase px-3 py-1.5 border border-primary/20">
              {course.level || "Masterclass"}
            </span>
          </div>
          <div className="absolute top-4 right-4 z-10">
            <WishlistHeart course={course} />
          </div>
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 backdrop-blur-[2px]">
            <div className="w-16 h-16 bg-primary/10 border border-primary/30 flex items-center justify-center rounded-full gold-glow">
              <Play
                size={24}
                fill="var(--color-primary)"
                className="text-primary ml-1.5"
              />
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="text-2xs font-mono text-text-muted tracking-[0.2em] uppercase mb-3">
            {course.level ?? "Masterclass"}
          </div>
          <h3 className="text-foreground font-bold text-xl leading-tight mb-3 tracking-wide group-hover:text-primary transition-colors italic">
            {course.title}
          </h3>
          <p className="text-text-muted text-sm mb-6 line-clamp-2 leading-relaxed font-mono">
            {course.short_description}
          </p>
          <div className="flex items-center justify-between pt-6 border-t border-border/10">
            <div className="flex items-center gap-4 text-2xs font-mono text-text-muted uppercase tracking-widest">
              <span className="flex items-center gap-2">
                <Clock size={12} className="text-primary" />
                {formatDuration(course.total_duration_seconds)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {user && <AddToCartBtn course={course} />}
              <span className="text-primary font-bold text-xl italic">
                {displayPrice(course.price)}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </RevealBlock>
  );
}

export function CourseCardGrid({ course, delay = 0 }: CourseCardProps) {
  const { user } = useAuth();
  const storeInCart = useCartStore((s) => s.courseIds);
  const inCart = course.is_in_cart ?? !!(
    course.id && storeInCart[course.id]
  );
  const addItem = useCartStore((s) => s.addItem);
  const [cartLoading, setCartLoading] = useState(false);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!course.id) return;
    setCartLoading(true);
    try {
      await addItem(course.id, "course");
    } catch {
      toast.error("Failed to add to cart");
    } finally {
      setCartLoading(false);
    }
  };

  return (
    <RevealBlock delay={delay}>
      <Link
        href={`/courses/${course.slug}`}
        className="group bg-surface block w-full text-left transition-all duration-500 card-luxury-hover overflow-hidden rounded-sm"
      >
        <div className="relative overflow-hidden aspect-video">
          <ImageWithFallback
            src={course.computed_thumbnail_url}
            alt={course.title}
            unoptimized
            className="object-fill reveal-image group-hover:scale-110 w-full h-full"
          />
          <div className="absolute top-4 left-4 z-10">
            <div className="bg-background/80 backdrop-blur-sm text-foreground text-2xs font-mono tracking-widest px-3 py-1.5 border border-border uppercase rounded">
              {course.level ?? "Beginner"}
            </div>
          </div>
          <div className="absolute top-4 right-4 z-10">
            <WishlistHeart course={course} />
          </div>
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
            <div className="w-12 h-12 bg-primary/20 border border-primary/40 flex items-center justify-center rounded-full gold-glow">
              <Play
                size={20}
                fill="var(--color-primary)"
                className="text-primary ml-1"
              />
            </div>
          </div>
        </div>
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-foreground font-bold text-base mb-1.5 tracking-wide group-hover:text-primary transition-colors italic leading-tight flex-1 min-w-0">
                {course.title}
              </h3>
              <span className="flex items-center gap-1.5 text-2xs font-mono text-text-muted uppercase tracking-widest shrink-0 mt-0.5">
                <Clock size={10} className="text-primary" />
                {formatDuration(course.total_duration_seconds)}
              </span>
            </div>
            <p className="text-text-muted text-xs mb-3 line-clamp-2 leading-relaxed font-mono opacity-80">
              {course.short_description}
            </p>
            {(course.average_rating ?? 0) > 0 || (course.enrollment_count ?? 0) > 0 ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-4">
                {((course.average_rating ?? 0) > 0 || (course.review_count ?? 0) > 0) && (
                  <span className="text-xs text-foreground">
                    ⭐ {(course.average_rating ?? 0) > 0 ? course.average_rating!.toFixed(1) : "—"}{" "}
                    {(course.review_count ?? 0) > 0 && (
                      <span className="text-text-muted">({compactNum(course.review_count ?? 0)} review{(course.review_count ?? 0) !== 1 ? "s" : ""})</span>
                    )}
                  </span>
                )}
                {(course.enrollment_count ?? 0) > 0 && (
                  <span className="text-2xs text-text-muted">
                    {compactNum(course.enrollment_count ?? 0)} enrolled
                  </span>
                )}
              </div>
            ) : null}
            <div className="flex items-center justify-between border-t border-border/10 pt-4">
              <span className="text-primary font-bold text-xl italic">
                {displayPrice(course.price)}
              </span>
              <div className="flex items-center gap-3">
                {user && (
                  <button
                    onClick={handleAddToCart}
                    disabled={cartLoading}
                    className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-text-muted hover:text-primary transition-colors border-b border-transparent hover:border-primary/40 pb-0.5 disabled:opacity-50"
                  >
                    {cartLoading ? (
                      <span className="animate-pulse">Adding...</span>
                    ) : inCart ? (
                      <><Check size={11} className="text-primary" /> Added</>
                    ) : (
                      <><ShoppingBag size={11} /> Add to Cart</>
                    )}
                  </button>
                )}
                <span className="text-text-muted text-xs font-mono uppercase tracking-widest flex items-center gap-1.5 group-hover:text-primary transition-colors border-b border-transparent group-hover:border-primary pb-0.5 leading-none font-medium">
                  Enroll <Play size={11} className="fill-current" />
                </span>
              </div>
            </div>
          </div>
      </Link>
    </RevealBlock>
  );
}

export function CourseCardListItem({ course, delay = 0 }: CourseCardProps) {
  const { user } = useAuth();
  const storeInCart = useCartStore((s) => s.productIds);
  const inCart = course.is_in_cart ?? !!(
    course.id && storeInCart[course.id]
  );
  const addItem = useCartStore((s) => s.addItem);
  const [cartLoading, setCartLoading] = useState(false);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!course.id) return;
    setCartLoading(true);
    try {
      await addItem(course.id);
    } catch {
      toast.error("Failed to add to cart");
    } finally {
      setCartLoading(false);
    }
  };

  return (
    <RevealBlock delay={delay}>
      <Link
        href={`/courses/${course.slug}`}
        className="group bg-surface flex flex-col sm:flex-row items-stretch transition-all duration-500 card-luxury-hover overflow-hidden rounded-sm"
      >
        <div className="relative w-full sm:w-36 lg:w-44 shrink-0 overflow-hidden aspect-video sm:aspect-auto sm:min-h-full">
          <ImageWithFallback
            src={course.computed_thumbnail_url}
            alt={course.title}
            unoptimized
            className="object-fill reveal-image group-hover:scale-110 w-full h-full"
          />
          <div className="absolute top-2 right-2 z-10">
            <WishlistHeart course={course} />
          </div>
          <div className="absolute inset-0 bg-dark/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="w-10 h-10 bg-primary/20 border border-primary/40 flex items-center justify-center rounded-full gold-glow">
              <Play
                size={16}
                fill="var(--color-primary)"
                className="text-primary ml-1"
              />
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-center px-4 py-3 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs font-mono text-text-muted mb-1">
            <span className="uppercase tracking-widest">
              {course.level ?? "Masterclass"}
            </span>
            <span className="text-text-muted/30 hidden xs:inline">|</span>
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {formatDuration(course.total_duration_seconds)}
            </span>
            {(course.average_rating ?? 0) > 0 && (
              <>
                <span className="text-text-muted/30 hidden xs:inline">|</span>
                <span className="text-xs text-foreground">
                  ⭐ {course.average_rating!.toFixed(1)}
                  {course.review_count ? <span className="text-text-muted ml-0.5">({compactNum(course.review_count)})</span> : null}
                </span>
              </>
            )}
            {(course.enrollment_count ?? 0) > 0 && (
              <>
                <span className="text-text-muted/30 hidden xs:inline">|</span>
                <span className="text-2xs text-text-muted">
                  {compactNum(course.enrollment_count ?? 0)} enrolled
                </span>
              </>
            )}
          </div>
          <h3 className="text-foreground font-bold text-sm leading-tight tracking-wide group-hover:text-primary transition-colors italic truncate">
            {course.title}
          </h3>
          {course.short_description && (
            <p className="text-text-muted text-xs leading-relaxed font-mono opacity-70 truncate mt-0.5">
              {course.short_description}
            </p>
          )}
        </div>
        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:gap-1 px-4 sm:pr-5 sm:pl-0 py-3 sm:py-0 border-t sm:border-t-0 border-border/10 sm:border-none shrink-0">
          <span className="text-primary font-bold text-base sm:text-lg italic whitespace-nowrap leading-none">
            {displayPrice(course.price)}
          </span>
          <div className="flex items-center gap-2">
            {user && (
              <button
                onClick={handleAddToCart}
                disabled={cartLoading}
                className="text-2xs font-mono uppercase tracking-widest text-text-muted hover:text-primary transition-colors flex items-center gap-1 border-b border-transparent hover:border-primary/40 pb-0.5 disabled:opacity-50"
              >
                {cartLoading ? (
                  <span className="animate-pulse">Adding...</span>
                ) : inCart ? (
                  <><Check size={10} className="text-primary" /> Added</>
                ) : (
                  <><ShoppingBag size={10} /> Cart</>
                )}
              </button>
            )}
            <span className="text-text-muted text-xs font-mono uppercase tracking-widest flex items-center gap-1.5 group-hover:text-primary transition-colors border-b border-transparent group-hover:border-primary pb-0.5 leading-none font-medium">
              Enroll <Play size={11} className="fill-current" />
            </span>
          </div>
        </div>
      </Link>
    </RevealBlock>
  );
}
