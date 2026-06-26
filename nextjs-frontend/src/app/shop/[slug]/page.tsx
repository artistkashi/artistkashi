"use client";

import { unwrap, unwrapPaginated } from "@/api/client-service";
import {
  listProductReviews,
  ProductDetailRead,
  productsGetProduct,
  ProductVariantRead,
  ReviewReadPublic,
  UserRead,
} from "@/api/openapi-client";
import { GhostBtn, PrimaryBtn } from "@/components/ui/buttons";
import { CircularGallery } from "@/components/ui/circular-gallery";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth-store";
import { getSafeReturnTo } from "@/lib/auth-utils";
import { useCartStore } from "@/lib/cart-store";
import { useCheckoutStore } from "@/lib/checkout-store";
import { cn, displayPrice } from "@/lib/utils";
import { useWishlistStore } from "@/lib/wishlist-store";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Award,
  Check,
  Eye,
  Heart,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  RefreshCcw,
  Ruler,
  ShieldCheck,
  ShoppingBag,
  Star,
  X,
} from "lucide-react";
import Link from "next/link";
import { notFound, usePathname, useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { toast } from "sonner";

// ─── Wishlist Button ───────────────────────────────────────────────────────

function WishlistButton({
  product,
  isWishlisted,
  user,
}: {
  product: ProductDetailRead;
  isWishlisted?: boolean;
  user: UserRead | null;
}) {
  if (!user) return null;

  const wishlisted = isWishlisted ?? product.is_wishlisted ?? false;
  const productId = product.id;
  const toggleProduct = useWishlistStore((s) => s.toggleProduct);
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      await toggleProduct(productId);
      toast.success(wishlisted ? "Removed from wishlist" : "Added to wishlist");
    } catch {
      toast.error("Failed to update wishlist");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="absolute top-6 right-6 text-white/70 hover:text-primary transition-all duration-500 z-10 hover:scale-110 active:scale-90 group/heart drop-shadow-sm"
    >
      {loading ? (
        <Loader2 size={20} className="animate-spin" />
      ) : (
        <Heart
          size={22}
          strokeWidth={1.5}
          fill={wishlisted ? "var(--color-gold)" : "none"}
          className={cn(
            "transition-transform group-hover/heart:scale-110",
            wishlisted && "text-primary"
          )}
        />
      )}
    </button>
  );
}

// ─── Custom Hooks ──────────────────────────────────────────────────────────

function useProduct(slug: string) {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: () => unwrap(productsGetProduct({ path: { slug } })),
    enabled: !!slug,
    retry: false,
  });
}

function useReviews(productId: string | null) {
  return useQuery({
    queryKey: ["reviews", productId],
    queryFn: async () => {
      const result = await unwrapPaginated(
        listProductReviews({
          path: {
            product_id: productId!,
          },
        })
      );
      return result.data;
    },
    enabled: !!productId,
  });
}

// ─── Section Components ──────────────────────────────────────────────────────

function VariantSelector({
  product,
  selectedVariant,
  setSelectedVariant,
  className,
}: {
  product: ProductDetailRead | undefined;
  selectedVariant: ProductVariantRead | null;
  setSelectedVariant: (v: ProductVariantRead | null) => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4 pt-4 border-t border-border/10", className)}>
      <h3 className="text-2xs font-mono text-text-muted uppercase tracking-[0.2em]">
        Select Format & Valuation
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {product?.variants?.map((variant: ProductVariantRead) => (
          <button
            key={variant.id}
            onClick={() => setSelectedVariant(variant)}
            className={cn(
              "px-4 py-3 border text-left transition-all duration-500 group rounded-sm relative overflow-hidden flex items-center justify-between gap-4",
              selectedVariant?.id === variant.id
                ? "border-primary bg-primary/5"
                : "border-border/20 hover:border-primary/40 bg-surface/30"
            )}
          >
            <div className="relative z-10 flex flex-col gap-0.5 min-w-0">
              <span
                className={cn(
                  "text-xs font-bold uppercase tracking-widest transition-colors truncate",
                  selectedVariant?.id === variant.id
                    ? "text-primary"
                    : "text-text-main group-hover:text-primary"
                )}
              >
                {variant.variant_type_name || "Standard"}
              </span>
              {variant.dimensions && (
                <span className="text-2xs font-mono text-text-muted uppercase tracking-tighter block truncate">
                  {variant.dimensions}
                </span>
              )}
            </div>

            <div className="relative z-10 text-sm font-bold tracking-tighter text-right whitespace-nowrap">
              <span
                className={
                  selectedVariant?.id === variant.id
                    ? "text-primary"
                    : "text-text-main"
                }
              >
                {displayPrice(variant.price)}
              </span>
            </div>

            {selectedVariant?.id === variant.id && (
              <motion.div
                layoutId="variant-active-bg"
                className="absolute inset-0 bg-primary/5"
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function ProductVisualsSection({
  query,
  selectedVariant,
  setSelectedVariant,
}: {
  query: ReturnType<typeof useProduct>;
  selectedVariant: ProductVariantRead | null;
  setSelectedVariant: (v: ProductVariantRead | null) => void;
}) {
  const { data: product, isLoading, error, refetch } = query;
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (product) {
      setActiveImage(
        product.primary_image || (product.images?.[0]?.image_url ?? null)
      );
    }
  }, [product]);

  // Prevent background scroll when zoomed
  useEffect(() => {
    if (zoomed) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [zoomed]);

  const allImages = product?.images?.map((img) => img.image_url) || [];
  const currentIndex = activeImage ? allImages.indexOf(activeImage) : 0;

  if (isLoading) {
    return (
      <div className="lg:col-span-7 grid grid-cols-1 lg:grid-cols-7 gap-4">
        <div className="lg:col-span-1 flex lg:flex-col gap-4 order-2 lg:order-1 overflow-x-auto lg:overflow-x-visible no-scrollbar pb-4 lg:pb-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="w-16 h-20 shrink-0" />
          ))}
        </div>
        <div className="lg:col-span-6 order-1 lg:order-2 space-y-8">
          <div className="relative aspect-4/5 bg-muted-light/5 border border-border/40 overflow-hidden rounded-sm">
            <Skeleton className="w-full h-full" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lg:col-span-7">
        <SectionError
          message={(error as Error).message || "Failed to load visuals"}
          onRetry={refetch}
        />
      </div>
    );
  }

  return (
    <div className="lg:col-span-7 grid grid-cols-1 lg:grid-cols-7 gap-x-6 gap-y-8">
      {/* Side Thumbnails */}
      <div className="lg:col-span-1 flex lg:flex-col gap-4 order-2 lg:order-1 overflow-x-auto lg:overflow-x-visible no-scrollbar pb-4 lg:pb-0">
        {product?.images?.map((img, i) => (
          <button
            key={img.id || i}
            onClick={() => setActiveImage(img.image_url)}
            className={cn(
              "w-16 h-20 shrink-0 border transition-all duration-500 overflow-hidden relative rounded",
              activeImage === img.image_url
                ? "border-gold scale-105"
                : "border-border/40 grayscale hover:grayscale-0"
            )}
          >
            <ImageWithFallback
              src={img.image_url}
              alt=""
              unoptimized
              fill
              className="object-cover"
            />
          </button>
        ))}
      </div>

      {/* Main Preview Area */}
      <div className="lg:col-span-6 order-1 lg:order-2 space-y-8">
        <div className="relative aspect-4/5 group rounded-sm overflow-hidden border border-border/40">
          <motion.div
            layoutId="main-image"
            className="w-full h-full bg-muted-light/5 cursor-zoom-in"
            onClick={() => activeImage && setZoomed(true)}
          >
            <ImageWithFallback
              src={activeImage}
              alt={product?.title || "Masterpiece"}
              unoptimized
              fill
              className="object-cover transition-transform duration-1000 group-hover:scale-110"
            />
            {activeImage && (
              <div className="absolute bottom-6 right-6 bg-dark/80 backdrop-blur-md px-4 py-2 border border-gold/20 opacity-0 group-hover:opacity-100 transition-all duration-500 rounded">
                <span className="text-2xs font-mono text-gold uppercase tracking-widest flex items-center gap-2">
                  <Eye size={12} /> Expand Vision
                </span>
              </div>
            )}
            {!activeImage && (
              <div className="w-full h-full flex flex-col items-center justify-center text-text-muted/20 gap-4 bg-dark">
                <ImageIcon size={48} strokeWidth={1} />
                <span className="text-2xs font-mono uppercase tracking-widest">
                  Image under curation
                </span>
              </div>
            )}
          </motion.div>

          {product && (
            <WishlistButton
              product={product}
              isWishlisted={product.is_wishlisted}
              user={user}
            />
          )}
        </div>

        {/* Variant Selection Hidden on Mobile here, shown only on Desktop */}
        <VariantSelector
          product={product}
          selectedVariant={selectedVariant}
          setSelectedVariant={setSelectedVariant}
          className="hidden lg:block"
        />
      </div>

      {/* 3D Circular Gallery Modal */}
      <AnimatePresence>
        {zoomed && allImages.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-1000 bg-dark/98 backdrop-blur-2xl flex flex-col items-center justify-center p-4"
          >
            {/* Header / Close */}
            <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-center z-50">
              <div className="space-y-1">
                <h2 className="text-xl font-bold tracking-widest text-text-main uppercase">
                  {product?.title}
                </h2>
                <p className="text-2xs font-mono uppercase tracking-[0.3em] text-gold/60">
                  Visual Exploration
                </p>
              </div>
              <button
                onClick={() => setZoomed(false)}
                className="w-10 h-10 flex items-center justify-center hover:text-gold transition-all text-text-muted"
              >
                <X size={20} />
              </button>
            </div>

            {/* The Circulation Section */}
            <div className="w-full max-w-7xl mt-12 flex-1 flex items-center justify-center">
              <CircularGallery
                images={allImages}
                initialIndex={currentIndex}
                onIndexChange={(idx) => setActiveImage(allImages[idx])}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProductPurchaseSection({
  query,
  selectedVariant,
  setSelectedVariant,
}: {
  query: ReturnType<typeof useProduct>;
  selectedVariant: ProductVariantRead | null;
  setSelectedVariant: (v: ProductVariantRead | null) => void;
}) {
  const { data: product, isLoading, error, refetch } = query;
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const returnTo = getSafeReturnTo(pathname) ?? "/";
  const loginHref = `/login?returnTo=${encodeURIComponent(returnTo)}`;

  const setCheckoutItems = useCheckoutStore((state) => state.setItems);
  const addItemToCart = useCartStore((s) => s.addItem);
  const storeInCart = useCartStore((s) => s.productIds);
  const inCartKey = selectedVariant?.id
    ? `${product?.id}:${selectedVariant.id}`
    : (product?.id ?? "");
  const inCart = product?.id
    ? (product.is_in_cart ?? !!storeInCart[inCartKey])
    : false;
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const handleAddToCart = async () => {
    if (!product?.id) return;
    setIsAddingToCart(true);
    try {
      await addItemToCart(product.id, "product", selectedVariant?.id);
    } catch {
      toast.error("Failed to add to cart");
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleAcquireNow = () => {
    if (!user) {
      router.push(loginHref);
      return;
    }

    if (!product) return;

    setCheckoutItems([
      {
        product_id: product.id,
        variant_id: selectedVariant?.id ?? null,
        course_id: null,
        quantity: 1,
        price: selectedVariant?.price ?? product.price ?? 0,
        title: product.title,
        variant_name: selectedVariant?.variant_type_name || "Standard",
        image:
          product.primary_image ||
          (product.images?.[0]?.image_url ?? undefined),
      },
    ]);

    router.push("/checkout");
  };

  if (isLoading) {
    return (
      <div className="lg:col-span-5 order-3 space-y-10">
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-40" />
        <SkeletonText lines={3} />
        <div className="space-y-6 pt-6">
          <div className="grid grid-cols-2 gap-6">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lg:col-span-5 order-3">
        <SectionError
          message={(error as Error).message || "Failed to load valuation data"}
          onRetry={refetch}
        />
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="lg:col-span-5 order-3 space-y-10">
      <div className="space-y-4">
        <div className="inline-flex items-center gap-3 px-3 py-1 bg-gold/5 border border-gold/10 text-2xs font-mono text-gold uppercase tracking-[0.3em]">
          {product.medium?.name || "Original Work"}
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-text-main uppercase tracking-tight leading-none">
          {product.title}
        </h1>
        <div className="flex items-center gap-4 text-xs font-mono text-text-muted uppercase tracking-widest">
          <span>{product.category?.name}</span>
          {product.year_created && (
            <>
              <span className="w-1 h-1 bg-border/40 rounded-full" />
              <span>{product.year_created}</span>
            </>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <span className="text-2xs font-mono text-text-muted uppercase tracking-[0.2em]">
            Current Valuation
          </span>
          <div className="text-5xl font-bold text-primary tracking-tighter">
            {displayPrice(
              selectedVariant ? selectedVariant.price : product.price
            )}
          </div>
        </div>

        {/* Variant Selection Shown on Mobile here, below price */}
        <VariantSelector
          product={product}
          selectedVariant={selectedVariant}
          setSelectedVariant={setSelectedVariant}
          className="lg:hidden"
        />
      </div>

      <p className="text-text-muted text-sm leading-relaxed font-light">
        {product.short_description}
      </p>

      <div className="space-y-6 pt-6">
        <div className="grid grid-cols-2 gap-6">
          <InfoItem
            icon={<Ruler size={14} />}
            label="Dimensions"
            value={selectedVariant?.dimensions || "Inquire for details"}
          />
          <InfoItem
            icon={<ShieldCheck size={14} />}
            label="Authentication"
            value={
              product.certificate_of_authenticity
                ? "Certified Original"
                : "Standard Collection"
            }
          />
        </div>

        {user ? (
          <div className="flex flex-col gap-3">
            <PrimaryBtn
              onClick={handleAcquireNow}
              className="w-full justify-center py-5"
            >
              Acquire Now <ArrowRight size={16} className="ml-2" />
            </PrimaryBtn>
            <GhostBtn
              onClick={handleAddToCart}
              disabled={isAddingToCart}
              className="w-full justify-center py-5 border-border/20 disabled:opacity-50"
            >
              {isAddingToCart ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : inCart ? (
                <Check size={16} className="mr-2 text-green-500" />
              ) : (
                <ShoppingBag size={16} className="mr-2" />
              )}
              {isAddingToCart
                ? "Adding..."
                : inCart
                  ? "Added to Cart"
                  : "Add to Cart"}
            </GhostBtn>
          </div>
        ) : (
          <p className="text-2xs font-mono uppercase tracking-widest text-text-muted opacity-60 italic border-l border-primary/20 pl-4 py-4 text-center">
            <Link href="/login" className="text-gold hover:underline mr-2">
              Login
            </Link>
            or
            <Link href="/signup" className="text-gold hover:underline ml-2">
              Register
            </Link>
            to acquire
          </p>
        )}
      </div>

      <div className="pt-10 border-t border-border/20 space-y-6">
        <h3 className="text-xs font-bold text-text-main uppercase tracking-[0.2em]">
          Archival Details
        </h3>
        <div className="grid grid-cols-1 gap-4">
          {product.style && <DetailRow label="Style" value={product.style} />}
          {product.subject && (
            <DetailRow label="Subject" value={product.subject} />
          )}
          {product.medium?.name && (
            <DetailRow label="Medium" value={product.medium.name} />
          )}
          <DetailRow
            label="Availability"
            value={
              product.is_original_available
                ? "Original Available"
                : "Sold / Collection Only"
            }
          />
          <DetailRow
            label="Framing"
            value={
              product.is_framed
                ? "Includes Bespoke Frame"
                : "Unframed / Gallery Wrap"
            }
          />
        </div>
      </div>
    </div>
  );
}

function ProductNarrativeSection({
  query,
}: {
  query: ReturnType<typeof useProduct>;
}) {
  const { data: product, isLoading, error } = query;

  if (isLoading) {
    return (
      <div className="mt-32 max-w-3xl mx-auto space-y-10">
        <div className="h-px bg-gold/20" />
        <div className="space-y-8">
          <Skeleton className="h-8 w-64 mx-auto" />
          <SkeletonText lines={6} />
        </div>
      </div>
    );
  }

  if (error || !product?.description) return null;

  return (
    <div className="mt-32 max-w-3xl mx-auto space-y-10">
      <div className="flex items-center gap-6">
        <div className="h-px flex-1 bg-gold/20" />
        <Award className="text-gold opacity-40" size={24} />
        <div className="h-px flex-1 bg-gold/20" />
      </div>
      <div className="space-y-8">
        <h2 className="text-2xl font-bold text-text-main uppercase tracking-widest text-center">
          Artist's Narrative
        </h2>
        <div className="text-text-muted leading-loose text-base font-light first-letter:text-5xl first-letter:font-bold first-letter:text-gold first-letter:mr-3 first-letter:float-left">
          {product.description}
        </div>
      </div>
    </div>
  );
}

function ProductReviewsSection({
  query,
}: {
  query: ReturnType<typeof useReviews>;
}) {
  const { data: reviews, isLoading, error, refetch } = query;

  return (
    <div className="mt-32 max-w-3xl mx-auto space-y-12">
      <div className="flex justify-between items-center border-b border-gold/10 pb-4">
        <h3 className="text-xl font-bold text-text-main uppercase tracking-widest flex items-center gap-3">
          <MessageSquare size={20} className="text-gold" /> Archival Feedback
        </h3>
        <button
          onClick={() => refetch()}
          className="text-2xs font-mono uppercase tracking-widest text-text-muted hover:text-gold transition-colors flex items-center gap-2 group"
        >
          <RefreshCcw
            size={12}
            className="group-hover:rotate-180 transition-transform duration-500"
          />{" "}
          Refresh
        </button>
      </div>

      <div className="space-y-8">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="p-8 border border-border/40 bg-dark/5 space-y-4"
            >
              <div className="flex justify-between">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-24" />
              </div>
              <SkeletonText lines={3} />
            </div>
          ))
        ) : error ? (
          <SectionError
            message={(error as Error).message || "Failed to load reviews"}
            onRetry={refetch}
          />
        ) : !reviews || reviews.length === 0 ? (
          <div className="py-20 border border-dashed border-border/40 flex flex-col items-center justify-center gap-4 text-center">
            <MessageSquare size={40} className="text-text-muted opacity-20" />
            <p className="text-xs font-mono uppercase tracking-widest text-text-muted opacity-40">
              No archival feedback recorded for this piece yet.
            </p>
          </div>
        ) : (
          reviews.map((review: ReviewReadPublic) => (
            <div
              key={review.id}
              className="p-8 border border-border bg-dark/10 space-y-6 hover:border-gold/20 transition-all duration-500"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <p className="text-sm font-bold text-text-main uppercase tracking-widest">
                    Collector Response
                  </p>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={12}
                        className={cn(
                          i <
                            (typeof review.rating === "number"
                              ? review.rating
                              : parseFloat(review.rating))
                            ? "text-gold fill-gold"
                            : "text-border"
                        )}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-2xs font-mono text-text-muted uppercase tracking-tighter">
                  {review.created_at
                    ? new Date(review.created_at).toLocaleDateString()
                    : ""}
                </span>
              </div>
              <p className="text-sm text-text-muted italic leading-loose font-light">
                "{review.text}"
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Shared Components ──────────────────────────────────────────────────────

function SectionError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="py-12 border border-dashed border-red-500/20 flex flex-col items-center gap-4 bg-red-500/5">
      <p className="text-xs text-red-500 font-mono tracking-widest uppercase">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-2 border border-gold/40 text-2xs font-mono uppercase tracking-[0.2em] text-gold hover:bg-gold hover:text-dark transition-all"
        >
          Attempt Re-Illumination
        </button>
      )}
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-2xs font-mono text-gold/60 uppercase tracking-widest">
        {icon} {label}
      </div>
      <div className="text-xs text-text-main font-medium">{value}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-border/10 last:border-0">
      <span className="text-2xs font-mono text-text-muted uppercase tracking-widest">
        {label}
      </span>
      <span className="text-xs text-text-main font-medium">{value}</span>
    </div>
  );
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const productQuery = useProduct(slug);
  const reviewsQuery = useReviews(productQuery.data?.id ?? null);

  const [selectedVariant, setSelectedVariant] =
    useState<ProductVariantRead | null>(null);

  useEffect(() => {
    if (productQuery.data?.variants) {
      const defaultV =
        productQuery.data.variants.find((v) => v.is_default) ||
        productQuery.data.variants[0];
      setSelectedVariant(defaultV || null);
    }
  }, [productQuery.data]);

  useEffect(() => {
    if (productQuery.isError) {
      const err = productQuery.error as { response?: { status?: number } } | null;
      if (err?.response?.status === 404) {
        notFound();
      }
      console.error("Product query error:", productQuery.error);
    }
  }, [productQuery.isError, productQuery.error]);

  return (
    <main className="pt-20 min-h-screen pb-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <ProductVisualsSection
            query={productQuery}
            selectedVariant={selectedVariant}
            setSelectedVariant={setSelectedVariant}
          />
          <ProductPurchaseSection
            query={productQuery}
            selectedVariant={selectedVariant}
            setSelectedVariant={setSelectedVariant}
          />
        </div>

        <ProductNarrativeSection query={productQuery} />
        <ProductReviewsSection query={reviewsQuery} />
      </div>
    </main>
  );
}
