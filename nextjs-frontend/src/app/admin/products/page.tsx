"use client";

import { unwrap, unwrapPaginated, unwrapVoid } from "@/api/client-service";
import { deleteProduct, getProduct, listProducts } from "@/api/openapi-client";
import {
  ProductCardRead,
  ProductDetailRead,
  ProductStatus,
} from "@/api/openapi-client/types.gen";
import { PrimaryBtn } from "@/components/ui/buttons";
import { CustomSelect } from "@/components/ui/custom-select";
import { DataTable } from "@/components/ui/data-table";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, displayPrice } from "@/lib/utils";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Edit3,
  Filter,
  Grid,
  Info,
  List,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import ProductUploadModal from "./ProductUploadModal";

// ─── Filter types ───────────────────────────────────────────────────────────

const PRODUCT_STATUSES: ProductStatus[] = [
  "draft",
  "published",
  "sold_out",
  "archived",
];

interface ProductFilters {
  status: ProductStatus | "";
  minPrice: string;
  maxPrice: string;
}

const EMPTY_FILTERS: ProductFilters = {
  status: "",
  minPrice: "",
  maxPrice: "",
};

const PAGE_SIZE_OPTIONS = [
  { value: 10, label: "10 per page" },
  { value: 25, label: "25 per page" },
  { value: 50, label: "50 per page" },
  { value: 100, label: "100 per page" },
];

function AdminProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const editId = searchParams.get("edit");
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("list");
  const [filters, setFilters] = useState<ProductFilters>(EMPTY_FILTERS);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] =
    useState<ProductDetailRead | null>(null);

  const userToggledRef = useRef(false);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    setView(mql.matches ? "list" : "grid");

    const handler = (e: MediaQueryListEvent) => {
      if (!userToggledRef.current) {
        setView(e.matches ? "list" : "grid");
      }
    };

    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin", "products", page, pageSize, search, filters],
    queryFn: () =>
      unwrapPaginated(
        listProducts({
          query: {
            page,
            page_size: pageSize,
            search: search || undefined,
            status: (filters.status as ProductStatus) || undefined,
            min_price: filters.minPrice ? Number(filters.minPrice) : undefined,
            max_price: filters.maxPrice ? Number(filters.maxPrice) : undefined,
          },
        })
      ),
    placeholderData: keepPreviousData,
  });

  const products = data?.data || [];
  const isDataLoading = isLoading || isFetching;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
  };

  const handleEditProduct = async (id: number) => {
    try {
      const data = await unwrap(getProduct({ path: { product_id: id } }));
      setEditingProduct(data);
      setIsUploadModalOpen(true);
    } catch (err) {
      console.error("Failed to fetch product for editing", err);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    const confirmed = window.confirm(
      "Are you certain you wish to remove this masterpiece from the archival records?"
    );
    if (!confirmed) return;

    try {
      await unwrapVoid(deleteProduct({ path: { product_id: id } }));
      toast.success("Piece successfully de-accessioned");
      handleRefresh();
    } catch (err) {
      console.error("Deletion failed", err);
    }
  };

  const handleViewChange = (newView: "grid" | "list") => {
    userToggledRef.current = true;
    setView(newView);
  };

  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== ""
  ).length;

  const desktopColumns: ColumnDef<ProductCardRead>[] = useMemo(
    () => [
      {
        accessorKey: "title",
        header: "Painting",
        cell: ({ row }) => (
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 border border-border overflow-hidden bg-background shrink-0 rounded-sm">
              <ImageWithFallback
                src={row.original.primary_image}
                alt={row.original.title}
                width={45}
                height={45}
                unoptimized
                className="object-cover w-full h-full"
              />
            </div>
            <div>
              <Link
                href={`/admin/products/${row.original.slug}`}
                className="text-xs font-bold text-foreground uppercase tracking-widest hover:text-primary transition-colors line-clamp-1"
              >
                {row.original.title}
              </Link>
              <div className="text-2xs text-text-muted font-mono uppercase tracking-widest opacity-60 mt-0.5">
                {row.original.slug}
              </div>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "medium",
        header: "Provenance",
        cell: ({ row }) => (
          <div className="text-label font-mono uppercase tracking-widest text-foreground">
            {row.original.medium?.name || "Original"}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "price",
        header: "Value",
        cell: ({ row }) => (
          <span className="text-xs font-mono text-primary font-bold">
            {displayPrice(row.original.price)}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right mr-4">Actions</div>,
        cell: ({ row }) => (
          <div className="flex justify-end items-center gap-3 pr-2">
            <Link
              href={`/admin/products/${row.original.slug}`}
              className="p-2 bg-dark/40 border border-border/40 text-text-muted hover:text-primary hover:border-primary/40 transition-all rounded-sm"
              title="View Details"
            >
              <Info size={14} />
            </Link>
            <button
              onClick={() => handleEditProduct(row.original.id)}
              className="p-2 bg-dark/40 border border-border/40 text-text-muted hover:text-primary hover:border-primary/40 transition-all rounded-sm"
              title="Refine"
            >
              <Edit3 size={14} />
            </button>
            <button
              onClick={() => handleDeleteProduct(row.original.id)}
              className="p-2 bg-dark/40 border border-border/40 text-text-muted hover:text-danger hover:border-danger/40 transition-all rounded-sm"
              title="Remove"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const tabletColumns: ColumnDef<ProductCardRead>[] = useMemo(
    () => [
      {
        accessorKey: "title",
        header: "Painting",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 border border-border overflow-hidden bg-background shrink-0 rounded-sm">
              <ImageWithFallback
                src={row.original.primary_image}
                alt={row.original.title}
                width={40}
                height={40}
                unoptimized
                className="object-cover w-full h-full"
              />
            </div>
            <span className="text-[11px] font-bold text-foreground uppercase tracking-widest line-clamp-1">
              {row.original.title}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "price",
        header: "Value",
        cell: ({ row }) => (
          <span className="text-xs font-mono text-primary font-bold">
            {displayPrice(row.original.price)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end items-center gap-2 pr-1">
            <Link
              href={`/admin/products/${row.original.slug}`}
              className="p-1.5 bg-dark/40 border border-border/40 text-text-muted hover:text-primary hover:border-primary/40 transition-all rounded-sm"
              title="View Details"
            >
              <Info size={12} />
            </Link>
            <button
              onClick={() => handleEditProduct(row.original.id)}
              className="p-1.5 bg-dark/40 border border-border/40 text-text-muted hover:text-primary hover:border-primary/40 transition-all rounded-sm"
              title="Refine"
            >
              <Edit3 size={12} />
            </button>
            <button
              onClick={() => handleDeleteProduct(row.original.id)}
              className="p-1.5 bg-dark/40 border border-border/40 text-text-muted hover:text-danger hover:border-danger/40 transition-all rounded-sm"
              title="Remove"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="lg:h-[calc(100vh-164px)] flex flex-col space-y-6 lg:overflow-hidden pb-10 lg:pb-0">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 shrink-0 px-1 pt-4 lg:pt-0">
        <div>
          <h1 className="text-4xl font-black text-text-main tracking-tighter uppercase leading-none">
            Collection <span className="text-gold italic">Archive</span>
          </h1>
          <p className="text-text-muted text-xs mt-3 uppercase font-mono tracking-[0.3em] flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-gold rounded-full animate-pulse" />
            Curating {data?.pagination.total_items || 0} Artistic Boundaries
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 w-full md:w-auto">
          <button
            onClick={handleRefresh}
            disabled={isDataLoading}
            className="p-3 bg-dark border border-border/40 text-text-muted hover:text-gold hover:border-gold/40 transition-all rounded-sm disabled:opacity-50 group"
            title="Refresh Archive"
          >
            <RefreshCw
              size={16}
              className={cn(isDataLoading && "animate-spin")}
            />
          </button>

          <div className="flex items-center bg-dark/60 border border-border/40 p-1 rounded-sm shrink-0">
            <button
              onClick={() => handleViewChange("list")}
              className={cn(
                "px-3 py-2 text-2xs font-mono uppercase tracking-widest transition-all duration-300 rounded-sm flex items-center gap-1.5",
                view === "list"
                  ? "bg-gold text-dark shadow-[0_0_15px_rgba(184,157,92,0.3)] font-black"
                  : "text-text-muted hover:text-foreground"
              )}
            >
              <List size={14} />
            </button>
            <button
              onClick={() => handleViewChange("grid")}
              className={cn(
                "px-3 py-2 text-2xs font-mono uppercase tracking-widest transition-all duration-300 rounded-sm flex items-center gap-1.5",
                view === "grid"
                  ? "bg-gold text-dark shadow-[0_0_15px_rgba(184,157,92,0.3)] font-black"
                  : "text-text-muted hover:text-foreground"
              )}
            >
              <Grid size={14} />
            </button>
          </div>

          <PrimaryBtn
            onClick={() => {
              setEditingProduct(null);
              setIsUploadModalOpen(true);
            }}
            className="px-6 py-3 text-2xs flex items-center gap-2"
          >
            <Plus size={16} /> NEW PIECE
          </PrimaryBtn>
        </div>
      </div>

      {/* Header Search & Filter Bar */}
      <div className="flex items-stretch gap-2 lg:gap-4 mb-1 shrink-0 px-1">
        <div className="flex-1 relative group">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none z-10">
            <Search
              size={18}
              className="text-text-muted group-focus-within:text-gold transition-colors"
            />
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              if (e.target.value === "") {
                setSearch("");
                setPage(1);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSearch(searchInput);
                setPage(1);
              }
            }}
            placeholder="Search archive and hit enter..."
            className="w-full bg-surface/50 border border-border/60 focus:border-gold/50 px-14 py-4 text-sm text-text-main outline-none placeholder:text-text-muted/50 transition-all rounded-sm backdrop-blur-sm"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "flex items-center justify-center gap-3 px-5 lg:px-8 py-4 border rounded-sm transition-all font-mono text-xs uppercase tracking-widest min-w-14 relative",
                activeFilterCount > 0
                  ? "bg-gold/10 border-gold text-gold"
                  : "bg-surface/50 border-border/60 text-text-muted hover:border-gold/30 hover:text-text-main"
              )}
              title="Archive Filters"
            >
              <Filter size={16} />
              <span className="hidden lg:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-gold text-dark px-1.5 py-0.5 rounded-full text-2xs font-black border-2 border-dark shadow-xl">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-80 bg-surface border-border p-6 shadow-2xl"
            align="end"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-border/40">
                <h3 className="text-sm font-black uppercase tracking-tight text-text-main">
                  Archive <span className="text-gold">Filters</span>
                </h3>
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => setFilters(EMPTY_FILTERS)}
                    className="text-2xs font-mono text-text-muted hover:text-gold uppercase tracking-widest transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="space-y-3">
                <label className="text-2xs font-mono text-text-muted uppercase tracking-[0.2em] block font-bold">
                  Status Manifest
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PRODUCT_STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          status: prev.status === s ? "" : s,
                        }))
                      }
                      className={cn(
                        "px-3 py-2 text-2xs font-mono uppercase tracking-widest border transition-all text-center rounded-sm",
                        filters.status === s
                          ? "bg-gold border-gold text-dark font-black"
                          : "border-border/40 text-text-muted hover:border-gold/30 hover:text-text-main"
                      )}
                    >
                      {s.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range Section */}
              <div className="space-y-3">
                <label className="text-2xs font-mono text-text-muted uppercase tracking-[0.2em] block font-bold">
                  Value Spectrum
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-mono text-text-muted/60 uppercase block">
                      Minimum
                    </span>
                    <input
                      type="number"
                      value={filters.minPrice}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, minPrice: e.target.value }))
                      }
                      placeholder="0"
                      className="w-full bg-dark/60 border border-border/40 px-3 py-2 text-xs text-text-main outline-none focus:border-gold/50 rounded-sm font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-mono text-text-muted/60 uppercase block">
                      Maximum
                    </span>
                    <input
                      type="number"
                      value={filters.maxPrice}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, maxPrice: e.target.value }))
                      }
                      placeholder="No Limit"
                      className="w-full bg-dark/60 border border-border/40 px-3 py-2 text-xs text-text-main outline-none focus:border-gold/50 rounded-sm font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 lg:overflow-y-auto lg:custom-scrollbar px-1 relative group">
        {/* Progress Loading Overlay */}
        <AnimatePresence>
          {isDataLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 bg-dark/60 backdrop-blur-xs flex flex-col items-center justify-center gap-4 rounded-sm"
            >
              <div className="luxury-loader luxury-loader-gold loader-lg" />
              <p className="text-2xs font-mono text-gold uppercase tracking-[0.4em] animate-pulse">
                Accessing Collection
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content View Selection */}
        <AnimatePresence mode="wait">
          {view === "list" ? (
            <motion.div
              key="list-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Desktop & Large Screens: Full DataTable */}
              <div className="hidden lg:block">
                <DataTable
                  columns={desktopColumns}
                  data={products}
                  isLoading={isDataLoading}
                />
              </div>
              {/* Tablet: Compact DataTable */}
              <div className="hidden md:block lg:hidden">
                <DataTable
                  columns={tabletColumns}
                  data={products}
                  isLoading={isDataLoading}
                />
              </div>
              {/* Mobile: Card-based list */}
              <div className="md:hidden space-y-4">
                {products.length === 0 && !isDataLoading ? (
                  <div className="p-20 text-center bg-surface/30 border border-border/60 rounded-sm">
                    <p className="text-xs font-mono text-text-muted uppercase tracking-[0.2em]">
                      No masterpieces found.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {products.map((product) => (
                      <ProductGridCard
                        key={`list-mobile-${product.id}`}
                        product={product}
                        onEdit={() => handleEditProduct(product.id)}
                        onDelete={() => handleDeleteProduct(product.id)}
                        isCompact={false}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="grid-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-5"
            >
              {products.map((product) => (
                <ProductGridCard
                  key={`grid-${product.id}`}
                  product={product}
                  onEdit={() => handleEditProduct(product.id)}
                  onDelete={() => handleDeleteProduct(product.id)}
                  isCompact={true}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pagination Bar */}
      <div className="px-6 py-4 md:py-2 border border-border/40 bg-dark/40 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4 rounded-sm shadow-2xl shrink-0">
        <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 w-full md:w-auto">
          <div className="flex items-center gap-3 w-auto justify-center">
            <p className="text-2xs font-mono text-text-muted uppercase tracking-widest whitespace-nowrap">
              Show
            </p>
            <CustomSelect
              options={PAGE_SIZE_OPTIONS}
              value={pageSize}
              onChange={(val) => {
                setPageSize(Number(val));
                setPage(1);
              }}
              placeholder="10"
              className="w-28 h-8"
              dropdownPosition="top"
            />
          </div>
          <div className="hidden sm:block h-4 w-px bg-border/40" />
          <div className="flex items-center gap-4 lg:gap-6 justify-center">
            <div className="text-2xs font-mono text-text-muted uppercase tracking-widest">
              Showing {products.length} of {data?.pagination.total_items || 0}
            </div>
            <div className="hidden sm:block h-4 w-px bg-border/40" />
            <div className="text-2xs font-mono text-text-muted uppercase tracking-widest">
              Page {page} of {data?.pagination.total_pages || 1}
            </div>
          </div>
        </div>

        <div className="flex gap-2 w-auto">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 bg-dark border border-border/60 text-2xs font-mono uppercase tracking-widest hover:border-gold disabled:opacity-20 transition-all rounded-sm flex items-center gap-2"
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <button
            disabled={!data?.pagination.has_next}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 bg-dark border border-border/60 text-2xs font-mono uppercase tracking-widest hover:border-gold disabled:opacity-20 transition-all rounded-sm flex items-center gap-2"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
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
          handleRefresh();
        }}
      />
    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-40 h-[calc(100vh-200px)]">
          <div className="luxury-loader luxury-loader-gold" />
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
    draft: "text-blue-500 border-blue-500/20 bg-blue-500/5",
    published: "text-emerald-500 border-emerald-500/20 bg-emerald-500/5",
    sold_out: "text-gold border-gold/30 bg-gold/5",
    archived: "text-red-500 border-red-500/20 bg-red-500/5",
  };

  return (
    <span
      className={cn(
        "px-2.5 py-1 rounded-sm text-2xs font-mono font-bold uppercase tracking-widest border",
        configs[s] || configs.draft
      )}
    >
      {s.replace("_", " ")}
    </span>
  );
}

function ProductGridCard({
  product,
  onEdit,
  onDelete,
  isCompact = true,
}: {
  product: ProductCardRead;
  onEdit: () => void;
  onDelete: () => void;
  isCompact?: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      whileHover="hover"
      className="group relative bg-surface border border-border/40 overflow-hidden flex flex-col rounded-sm transition-colors duration-500"
    >
      <Link
        href={`/admin/products/${product.slug}`}
        className="flex flex-col flex-1"
      >
        <div
          className={cn(
            "relative overflow-hidden bg-dark max-w-full",
            isCompact
              ? "aspect-[4/5] sm:aspect-[3/4]"
              : "aspect-[16/9] sm:aspect-[3/4]"
          )}
        >
          <ImageWithFallback
            src={product.primary_image}
            alt={product.title}
            width={isCompact ? 300 : 600}
            height={isCompact ? 400 : 800}
            unoptimized
            className="object-cover w-full h-full transition-transform duration-1000 group-hover:scale-103"
          />

          {/* Hover Action Overlay with Framer Motion variants */}
          <motion.div
            variants={{
              hover: { opacity: 1 },
            }}
            initial={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-dark/70 flex flex-col items-center justify-center gap-3 backdrop-blur-xs z-10 pointer-events-none group-hover:pointer-events-auto"
          >
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit();
                }}
                className="w-8 h-8 md:w-9 md:h-9 bg-white text-dark flex items-center justify-center rounded-sm hover:scale-105 transition-all shadow-md pointer-events-auto"
                title="Refine Piece"
              >
                <Edit3 size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete();
                }}
                className="w-8 h-8 md:w-9 md:h-9 bg-danger text-white flex items-center justify-center rounded-sm hover:scale-105 transition-all shadow-md pointer-events-auto"
                title="Remove from Archive"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </motion.div>
        </div>

        <div className="p-3 flex-1 flex flex-col justify-between bg-surface/50 relative z-0">
          <div className="space-y-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-[11px] font-black text-text-main uppercase tracking-tight line-clamp-1 leading-tight">
                {product.title}
              </h3>
              <div className="shrink-0 mt-0.5">
                <div
                  className={cn(
                    "w-1.5 h-1.5 rounded-full shadow-lg",
                    product.status === "published"
                      ? "bg-emerald-500 shadow-emerald-500/20 animate-pulse"
                      : product.status === "draft"
                        ? "bg-blue-500"
                        : "bg-red-500"
                  )}
                />
              </div>
            </div>
            <p className="text-[9px] text-text-muted font-mono uppercase tracking-widest truncate">
              {product.category?.name || "Uncategorized"}
            </p>
          </div>
          <div className="mt-4 pt-2 border-t border-border/10 flex justify-between items-center">
            <span className="text-[11px] font-mono text-gold font-black">
              {displayPrice(product.price)}
            </span>
            <StatusBadge status={product.status} />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
