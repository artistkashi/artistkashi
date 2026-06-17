"use client";

import { unwrap, unwrapPaginated, unwrapVoid } from "@/api/client-service";
import { deleteProduct, getProduct, listProducts } from "@/api/openapi-client";
import {
  ProductCardRead,
  ProductDetailRead,
  ProductStatus,
} from "@/api/openapi-client/types.gen";
import { PrimaryBtn } from "@/components/ui/buttons";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { cn, displayPrice } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  Edit3,
  ExternalLink,
  Filter,
  Grid,
  Info,
  List,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import ProductUploadModal from "./ProductUploadModal";

type ProductFilter = ProductStatus | "all";

function AdminProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const editId = searchParams.get("edit");

  const [products, setProducts] = useState<ProductCardRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProductFilter>("all");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] =
    useState<ProductDetailRead | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await unwrapPaginated(
        listProducts({
          query: {
            search: searchTerm || undefined,
          },
        })
      );

      setProducts(data);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (editId) {
      handleEditProduct(parseInt(editId));
    }
  }, [editId]);

  const handleDeleteProduct = async (id: number) => {
    const confirmed = window.confirm(
      "Are you certain you wish to remove this masterpiece from the archival records?"
    );
    if (!confirmed) return;

    await unwrapVoid(deleteProduct({ path: { product_id: id } }));
    toast.success("Piece successfully de-accessioned");
    fetchProducts();
  };

  const handleEditProduct = async (id: number) => {
    const data = await unwrap(getProduct({ path: { product_id: id } }));
    setEditingProduct(data);
    setIsUploadModalOpen(true);
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-border pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-widest text-foreground uppercase">
            Collection <span className="text-primary">Archive</span>
          </h1>
          <p className="text-label text-text-muted font-mono tracking-[0.3em] uppercase">
            Curating artistic boundaries
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-surface border border-border p-1 rounded-sm">
            <ViewToggle
              active={view === "list"}
              onClick={() => setView("list")}
              icon={<List size={14} />}
            />
            <ViewToggle
              active={view === "grid"}
              onClick={() => setView("grid")}
              icon={<Grid size={14} />}
            />
          </div>
          <PrimaryBtn
            onClick={() => {
              setEditingProduct(null);
              setIsUploadModalOpen(true);
            }}
            className="px-5 py-2.5 text-2xs"
          >
            <Plus size={16} className="mr-2" /> New Piece
          </PrimaryBtn>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
        <div className="relative w-full lg:max-w-sm group">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/30 group-focus-within:text-primary transition-colors"
            size={16}
          />
          <input
            type="text"
            placeholder="Search Archive..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border px-10 py-3 text-xs text-foreground focus:outline-none focus:border-primary transition-all rounded-sm placeholder:text-text-muted/40 font-mono tracking-wider glass-input"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full">
          <Filter size={12} className="text-primary/40 mr-2" />
          {["all", "draft", "published", "sold_out", "archived"].map(
            (status) => (
              <button
                key={`filter-${status}`}
                onClick={() => setStatusFilter(status as ProductFilter)}
                className={cn(
                  "px-4 py-2 text-2xs font-mono tracking-widest uppercase border transition-all whitespace-nowrap rounded-sm",
                  statusFilter === status
                    ? "bg-gold-bg border-primary text-primary gold-glow"
                    : "border-border text-text-muted hover:border-primary/40 hover:text-foreground"
                )}
              >
                {status.replace("_", " ")}
              </button>
            )
          )}
        </div>
      </div>

      {/* Content */}
      <div className="min-h-100">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 gap-4"
            >
              <div className="luxury-loader" />
              <p className="text-2xs font-mono uppercase tracking-[0.4em] text-primary/60">
                Searching Records
              </p>
            </motion.div>
          ) : filteredProducts.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 border border-dashed card-luxury rounded"
            >
              <p className="text-xs text-text-muted uppercase tracking-widest font-mono">
                No records found in this plane.
              </p>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                }}
                className="mt-6 text-2xs font-mono uppercase tracking-widest text-primary hover:text-foreground transition-colors border-b border-primary/20"
              >
                Reset Archive Filters
              </button>
            </motion.div>
          ) : view === "grid" ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
            >
              {filteredProducts.map((product) => (
                <ProductGridCard
                  key={`grid-${product.id}`}
                  product={product}
                  onEdit={() => handleEditProduct(product.id)}
                  onDelete={() => handleDeleteProduct(product.id)}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="overflow-x-auto border border-border rounded backdrop-blur-xs bg-transparent"
            >
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-background/40 border-b border-border">
                    <th className="px-6 py-4 text-2xs font-mono uppercase tracking-widest text-primary/60">
                      The Piece
                    </th>
                    <th className="px-6 py-4 text-2xs font-mono uppercase tracking-widest text-primary/60">
                      Provenance
                    </th>
                    <th className="px-6 py-4 text-2xs font-mono uppercase tracking-widest text-primary/60">
                      Status
                    </th>
                    <th className="px-6 py-4 text-2xs font-mono uppercase tracking-widest text-primary/60">
                      Value
                    </th>
                    <th className="px-6 py-4 text-2xs font-mono uppercase tracking-widest text-primary/60 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filteredProducts.map((product) => (
                    <ProductRow
                      key={`row-${product.id}`}
                      product={product}
                      onEdit={() => handleEditProduct(product.id)}
                      onDelete={() => handleDeleteProduct(product.id)}
                    />
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Upload Modal */}
      <ProductUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setEditingProduct(null);
          if (editId) {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("edit");
            router.replace(`${pathname}?${params.toString()}`);
          }
        }}
        product={editingProduct}
        onSuccess={() => {
          setIsUploadModalOpen(false);
          setEditingProduct(null);
          if (editId) {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("edit");
            router.replace(`${pathname}?${params.toString()}`);
          }
          fetchProducts();
        }}
      />
    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-40">
          <div className="luxury-loader" />
        </div>
      }
    >
      <AdminProductsContent />
    </Suspense>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: ProductStatus }) {
  const s = status || "draft";
  const configs = {
    draft: "text-info border-info/30 bg-blue-bg",
    published: "text-success border-success/30 bg-green-bg",
    sold_out: "text-primary border-primary/30 bg-gold-bg",
    archived: "text-danger border-danger/30 bg-red-bg",
  };

  return (
    <span
      className={cn(
        "px-2.5 py-0.5 rounded-full text-2xs font-mono uppercase tracking-widest border",
        configs[s] || configs.draft
      )}
    >
      {s.replace("_", " ")}
    </span>
  );
}

function ViewToggle({
  active,
  onClick,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-2 transition-all duration-300 rounded-sm",
        active
          ? "bg-primary text-dark gold-glow"
          : "text-text-muted hover:text-foreground"
      )}
    >
      {icon}
    </button>
  );
}

function ProductGridCard({
  product,
  onEdit,
  onDelete,
}: {
  product: ProductCardRead;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="group card-luxury-hover overflow-hidden flex flex-col rounded-sm"
    >
      <div className="aspect-4/5 relative overflow-hidden bg-background">
        <ImageWithFallback
          src={product.primary_image}
          alt={product.title}
          width={400}
          height={500}
          unoptimized
          className="object-cover w-full h-full transition-transform duration-1000 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center gap-4 backdrop-blur-sm">
          <Link
            href={`/admin/products/${product.slug}`}
            className="w-10 h-10 bg-foreground text-dark flex items-center justify-center rounded-full hover:bg-primary transition-all"
          >
            <ExternalLink size={14} />
          </Link>
          <button
            onClick={onEdit}
            className="w-10 h-10 bg-foreground text-dark flex items-center justify-center rounded-full hover:bg-primary transition-all"
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={onDelete}
            className="w-10 h-10 bg-danger text-foreground flex items-center justify-center rounded-full hover:bg-danger/80 transition-all danger-glow"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between">
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-widest line-clamp-1">
              {product.title}
            </h3>
            <div className="shrink-0 mt-0.5">
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  product.status === "published"
                    ? "bg-primary gold-glow"
                    : product.status === "draft"
                      ? "bg-text-muted"
                      : "bg-danger"
                )}
              />
            </div>
          </div>
          <p className="text-2xs text-text-muted font-mono uppercase tracking-widest">
            {product.category?.name || "Collection"}
          </p>
        </div>
        <div className="mt-4 pt-3 border-t border-border flex justify-between items-center">
          <span className="text-xs font-mono text-primary font-bold">
            {displayPrice(product.price)}
          </span>
          <Link
            href={`/admin/products/${product.slug}`}
            className="text-text-muted hover:text-primary transition-colors"
          >
            <StatusBadge status={product.status} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

function ProductRow({
  product,
  onEdit,
  onDelete,
}: {
  product: ProductCardRead;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <tr className="hover:bg-primary/5 transition-colors group">
      <td className="px-5 py-3">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 border border-border overflow-hidden bg-background shrink-0 rounded-sm">
            <ImageWithFallback
              src={product.primary_image}
              alt={product.title}
              width={48}
              height={48}
              unoptimized
              className="object-cover w-full h-full"
            />
          </div>
          <div>
            <Link
              href={`/admin/products/${product.slug}`}
              className="text-xs font-bold text-foreground uppercase tracking-widest hover:text-primary transition-colors"
            >
              {product.title}
            </Link>
            <div className="text-2xs text-text-muted font-mono uppercase tracking-widest opacity-60 mt-0.5">
              {product.slug}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="text-label font-mono uppercase tracking-widest text-foreground">
          {product.medium?.name || "Original"}
        </div>
      </td>
      <td className="px-6 py-4">
        <StatusBadge status={product.status} />
      </td>
      <td className="px-6 py-4">
        <span className="text-xs font-mono text-primary font-bold">
          {displayPrice(product.price)}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex justify-end items-center gap-3 opacity-40 group-hover:opacity-100 transition-opacity">
          <Link
            href={`/admin/products/${product.slug}`}
            className="p-1.5 text-text-muted hover:text-primary"
            title="View Details"
          >
            <Info size={14} />
          </Link>
          <button
            onClick={onEdit}
            className="p-1.5 text-text-muted hover:text-primary"
            title="Refine"
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-text-muted hover:text-danger"
            title="Remove"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}
