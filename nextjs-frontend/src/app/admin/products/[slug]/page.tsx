"use client";

import { unwrap, unwrapPaginated } from "@/api/client-service";
import {
  getProductBySlug,
  listAllReviews,
  ProductImageRead,
  ProductVariantRead,
  ReviewRead
} from "@/api/openapi-client";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { Tag } from "@/components/ui/misc";
import { cn, displayPrice } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  Edit3,
  ExternalLink,
  Info,
  Layers,
  MessageSquare,
  Package,
  RefreshCcw,
  Search,
  Star,
} from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";

import { GhostBtn, PrimaryBtn } from "@/components/ui/buttons";
import ProductUploadModal from "../ProductUploadModal";

// ─── Custom Hooks ──────────────────────────────────────────────────────────

function useProduct(slug: string) {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: () => unwrap(getProductBySlug({ path: { slug } })),
    enabled: !!slug,
  });
}

function useReviews(productId: string | null) {
  return useQuery({
    queryKey: ["reviews", productId],
    queryFn: async () => {
      const result = await unwrapPaginated(
        listAllReviews({
          query: {
            entity_id: productId!,
            review_type: "product",
          },
        })
      );
      return result.data;
    },
    enabled: !!productId,
  });
}

// ─── Section Components ──────────────────────────────────────────────────────

function ProductHeaderSection({
  query,
  onEdit,
}: {
  query: ReturnType<typeof useProduct>;
  onEdit: () => void;
}) {
  const { data: product, isLoading, error, refetch } = query;

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-gold/10 pb-6">
      <div className="space-y-4">
        <Link
          href="/admin/products"
          className="flex items-center gap-2 text-2xs font-mono uppercase tracking-[0.2em] text-text-muted hover:text-gold transition-colors group"
        >
          <ChevronLeft
            size={14}
            className="group-hover:-translate-x-1 transition-transform"
          />{" "}
          Back to Archive
        </Link>
        <div className="space-y-1">
          {isLoading ? (
            <Skeleton className="h-10 w-64 mb-2" />
          ) : error ? (
            <SectionError
              message={(error as Error).message || "Failed to load header"}
              onRetry={refetch}
            />
          ) : (
            <h1 className="text-h4 font-bold tracking-widest text-text-main uppercase">
              {product?.title}
            </h1>
          )}
          <div className="flex items-center gap-3">
            {isLoading ? (
              <Skeleton className="h-4 w-32" />
            ) : error ? null : (
              <Tag label={product?.status || "Draft"} />
            )}
            {isLoading ? (
              <Skeleton className="h-4 w-24" />
            ) : error ? null : (
              <span className="text-2xs font-mono uppercase tracking-widest text-text-muted">
                Slug: {product?.slug}
              </span>
            )}
          </div>
        </div>
      </div>
      {!isLoading && !error && product && (
        <div className="flex gap-3">
          <PrimaryBtn onClick={onEdit} className="px-5 py-2.5 text-2xs">
            <Edit3 size={14} className="mr-2" /> Refine Piece
          </PrimaryBtn>

          {product.status === "published" ? (
            <Link href={`/shop/${product.slug}`} target="_blank">
              <GhostBtn className="px-5 py-2.5 text-2xs">
                <ExternalLink size={14} /> Public View
              </GhostBtn>
            </Link>
          ) : (
            <GhostBtn
              disabled
              title="Only published pieces can be viewed on the public gallery"
              className="px-5 py-2.5 text-2xs"
            >
              <ExternalLink size={14} /> Public View
            </GhostBtn>
          )}
        </div>
      )}
    </div>
  );
}

function ProductVisualsSection({
  query,
}: {
  query: ReturnType<typeof useProduct>;
}) {
  const { data: product, isLoading, error, refetch } = query;
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Update selectedImage when product data loads or changes
  useEffect(() => {
    if (product?.primary_image) {
      setSelectedImage(product.primary_image);
    }
  }, [product?.primary_image]);

  if (isLoading) {
    return (
      <div className="lg:col-span-1 space-y-8">
        <div className="space-y-4">
          <h3 className="text-2xs font-mono uppercase tracking-[0.3em] text-gold/60 flex items-center gap-2">
            <Package size={14} /> Primary Visual
          </h3>
          <div className="aspect-4/5 border border-border bg-dark/5 overflow-hidden rounded-sm">
            <Skeleton className="w-full h-full" />
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="text-2xs font-mono uppercase tracking-[0.3em] text-gold/60">
            Supporting Gallery
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-sm" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lg:col-span-1">
        <SectionError
          message={(error as Error).message || "Failed to load visuals"}
          onRetry={refetch}
        />
      </div>
    );
  }

  return (
    <div className="lg:col-span-1 space-y-8">
      <div className="space-y-4">
        <h3 className="text-2xs font-mono uppercase tracking-[0.3em] text-gold/60 flex items-center gap-2">
          <Package size={14} />{" "}
          {selectedImage === product?.primary_image
            ? "Primary Visual"
            : "Preview Visual"}
        </h3>
        <div className="aspect-4/5 border border-border bg-dark/5 overflow-hidden rounded-sm transition-all duration-500">
          <ImageWithFallback
            src={selectedImage}
            alt={product?.title || "Product"}
            unoptimized
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-2xs font-mono uppercase tracking-[0.3em] text-gold/60">
          Supporting Gallery
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {/* Main/Primary image also included in gallery for easy switching back */}
          {product?.images?.map((img: ProductImageRead, i: number) => (
            <button
              key={i}
              onClick={() => setSelectedImage(img.image_url)}
              className={cn(
                "aspect-square border bg-dark/5 overflow-hidden rounded-sm transition-all duration-300 hover:border-gold/50",
                selectedImage === img.image_url
                  ? "border-gold ring-1 ring-gold/30"
                  : "border-border"
              )}
            >
              <ImageWithFallback
                src={img.image_url}
                alt="Gallery"
                unoptimized
                className="w-full h-full object-cover"
              />
            </button>
          ))}
          {(!product?.images || product.images.length === 0) && (
            <div className="col-span-3 py-8 border border-dashed border-border/40 flex items-center justify-center rounded">
              <p className="text-2xs font-mono uppercase tracking-widest text-text-muted opacity-40">
                No supporting visuals
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductDetailsSection({
  query,
}: {
  query: ReturnType<typeof useProduct>;
}) {
  const { data: product, isLoading, error, refetch } = query;

  if (error) {
    return (
      <SectionError
        message={(error as Error).message || "Failed to load details"}
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-gold border-b border-gold/10 pb-2 flex items-center gap-2">
        <Info size={14} /> Archival Records
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
        <DetailItem
          label="Medium"
          value={product?.medium?.name || undefined}
          loading={isLoading}
        />
        <DetailItem
          label="Category"
          value={product?.category?.name || undefined}
          loading={isLoading}
        />
        <DetailItem
          label="Style"
          value={product?.style || undefined}
          loading={isLoading}
        />
        <DetailItem
          label="Subject"
          value={product?.subject || undefined}
          loading={isLoading}
        />
        <DetailItem
          label="Year Created"
          value={product?.year_created?.toString() || undefined}
          loading={isLoading}
        />
        <DetailItem
          label="Weight"
          value={product?.weight_grams ? `${product.weight_grams}g` : undefined}
          loading={isLoading}
        />
        <DetailItem
          label="Original Available"
          value={product?.is_original_available ? "Yes" : "No"}
          loading={isLoading}
        />
        <DetailItem
          label="Framed"
          value={product?.is_framed ? "Yes" : "No"}
          loading={isLoading}
        />
      </div>

      <div className="space-y-3 pt-4">
        <p className="text-2xs font-mono uppercase tracking-widest text-text-muted">
          Description
        </p>
        {isLoading ? (
          <SkeletonText lines={4} />
        ) : (
          <p className="text-sm text-text-main leading-relaxed font-light">
            {product?.description || "No description provided."}
          </p>
        )}
      </div>
    </div>
  );
}

function ProductVariantsSection({
  query,
}: {
  query: ReturnType<typeof useProduct>;
}) {
  const { data: product, isLoading, error, refetch } = query;

  if (error) {
    return (
      <SectionError
        message={(error as Error).message || "Failed to load variants"}
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-gold border-b border-gold/10 pb-2 flex items-center gap-2">
        <Layers size={14} /> Curated Variants
      </h3>
      <div className="overflow-x-auto border border-border/40 bg-dark/5 rounded">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-dark/20 border-b border-border/40">
              <th className="px-5 py-3 text-2xs font-mono uppercase tracking-widest text-gold/60">
                Type
              </th>
              <th className="px-5 py-3 text-2xs font-mono uppercase tracking-widest text-gold/60">
                Dimensions
              </th>
              <th className="px-5 py-3 text-2xs font-mono uppercase tracking-widest text-gold/60">
                Stock
              </th>
              <th className="px-5 py-3 text-2xs font-mono uppercase tracking-widest text-gold/60">
                Price
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/10">
            {isLoading
              ? Array.from({ length: 2 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-5 py-4">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="px-5 py-4">
                      <Skeleton className="h-4 w-12" />
                    </td>
                    <td className="px-5 py-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                  </tr>
                ))
              : product?.variants?.map((v: ProductVariantRead, i: number) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-4 text-xs font-bold uppercase tracking-widest text-text-main">
                      {v.variant_type_name || "Standard"}
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-text-muted">
                      {v.dimensions || "N/A"}
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-text-main">
                      {v.stock_quantity}
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-gold font-bold">
                      {displayPrice(v.price)}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductSEOSection({
  query,
}: {
  query: ReturnType<typeof useProduct>;
}) {
  const { data: product, isLoading, error, refetch } = query;

  if (error) {
    return (
      <SectionError
        message={(error as Error).message || "Failed to load SEO info"}
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-gold border-b border-gold/10 pb-2 flex items-center gap-2">
        <Search size={14} /> Discoverability (SEO)
      </h3>
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-2xs font-mono uppercase tracking-widest text-text-muted">
            Meta Title
          </p>
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <div className="p-4 bg-dark/20 border border-border text-xs text-text-main font-mono rounded">
              {product?.meta_title || "Not Set"}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-2xs font-mono uppercase tracking-widest text-text-muted">
            Meta Description
          </p>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="p-4 bg-dark/20 border border-border text-xs text-text-main font-mono leading-relaxed rounded">
              {product?.meta_description || "Not Set"}
            </div>
          )}
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
    <div className="space-y-6 pt-12">
      <div className="flex justify-between items-center border-b border-gold/10 pb-2">
        <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-gold flex items-center gap-2">
          <MessageSquare size={14} /> Archival Feedback (Reviews)
        </h3>
        <button
          onClick={() => refetch()}
          className="text-2xs font-mono uppercase tracking-widest text-text-muted hover:text-gold transition-colors flex items-center gap-2"
        >
          <RefreshCcw size={12} /> Refresh
        </button>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="p-4 border border-border/40 bg-dark/5 space-y-3"
            >
              <div className="flex justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
              <SkeletonText lines={2} />
            </div>
          ))
        ) : error ? (
          <SectionError
            message={(error as Error).message || "Failed to load reviews"}
            onRetry={refetch}
          />
        ) : !reviews || reviews.length === 0 ? (
          <div className="py-12 border border-dashed border-border/40 flex flex-col items-center justify-center gap-2">
            <p className="text-2xs font-mono uppercase tracking-widest text-text-muted opacity-40 rounded">
              No archival feedback recorded
            </p>
          </div>
        ) : (
          reviews.map((review: ReviewRead) => (
            <div
              key={review.id}
              className="p-4 border border-border bg-dark/10 space-y-4 hover:border-gold/20 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-text-main uppercase tracking-widest">
                    Anonymous Curator
                  </p>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={10}
                        className={cn(
                          i < review.rating
                            ? "text-gold fill-gold"
                            : "text-border"
                        )}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-2xs font-mono text-text-muted uppercase">
                  {review.created_at
                    ? new Date(review.created_at).toLocaleDateString()
                    : ""}
                </span>
              </div>
              <p className="text-xs text-text-muted italic leading-relaxed">
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
    <div className="py-8 border border-dashed border-red-500/20 flex flex-col items-center gap-3">
      <p className="text-xs text-red-500 font-mono">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-2xs font-mono uppercase tracking-widest text-gold hover:text-text-main transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

function DetailItem({
  label,
  value,
  loading,
}: {
  label: string;
  value?: string;
  loading: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-2xs font-mono uppercase tracking-widest text-text-muted">
        {label}
      </p>
      {loading ? (
        <Skeleton className="h-5 w-32" />
      ) : (
        <p className="text-xs font-bold uppercase tracking-widest text-text-main">
          {value || "Not Recorded"}
        </p>
      )}
    </div>
  );
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function AdminProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const productQuery = useProduct(slug);
  const reviewsQuery = useReviews(productQuery.data?.id ?? null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  return (
    <div className="space-y-9 pb-20">
      <ProductHeaderSection
        query={productQuery}
        onEdit={() => setIsEditModalOpen(true)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <ProductVisualsSection query={productQuery} />

        <div className="lg:col-span-2 space-y-12">
          <ProductDetailsSection query={productQuery} />
          <ProductVariantsSection query={productQuery} />
          <ProductSEOSection query={productQuery} />
          <ProductReviewsSection query={reviewsQuery} />
        </div>
      </div>

      <ProductUploadModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        product={productQuery.data}
        onSuccess={() => {
          setIsEditModalOpen(false);
          productQuery.refetch();
        }}
      />
    </div>
  );
}
