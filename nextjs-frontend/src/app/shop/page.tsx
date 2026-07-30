"use client";

import { unwrapPaginated } from "@/api/client-service";
import { productsListProducts } from "@/api/openapi-client";
import { ProductCard } from "@/components/shop/ProductCard";
import { PrimaryBtn } from "@/components/ui/buttons";
import { CustomSelect } from "@/components/ui/custom-select";
import { LuxuryLoader } from "@/components/ui/LuxuryLoader";
import { RevealBlock } from "@/components/ui/misc";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Filter, Grid, List, Search, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useMemo, useRef, useState } from "react";

const PAGE_SIZE = 12;

function matchPrice(
  price: string | undefined | null,
  min: number,
  max: number
): boolean {
  const num = Number(price);
  if (Number.isNaN(num)) return true;
  return num >= min && (max <= 0 || num <= max);
}

export default function ShopPage() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showSearch, setShowSearch] = useState(false);
  const [activeSearch, setActiveSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [activeMedium, setActiveMedium] = useState("");
  const [activeMinPrice, setActiveMinPrice] = useState("");
  const [activeMaxPrice, setActiveMaxPrice] = useState("");
  const [activePage, setActivePage] = useState(1);
  const searchRef = useRef<HTMLInputElement>(null);
  const [priceMinDraft, setPriceMinDraft] = useState("");
  const [priceMaxDraft, setPriceMaxDraft] = useState("");

  const { data: result, isLoading } = useQuery({
    queryKey: ["shop-products"],
    queryFn: async () =>
      unwrapPaginated(productsListProducts({ query: { page_size: 100 } })),
  });

  const data = result?.data;

  const allProducts = useMemo(() => {
    let list = data ?? [];
    if (activeSearch) {
      const q = activeSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.short_description?.toLowerCase().includes(q)
      );
    }
    if (activeCategory) {
      list = list.filter((p) => p.category?.slug === activeCategory);
    }
    if (activeMedium) {
      list = list.filter((p) => p.medium?.slug === activeMedium);
    }
    const minP = activeMinPrice ? Number(activeMinPrice) : 0;
    const maxP = activeMaxPrice ? Number(activeMaxPrice) : 0;
    if (minP > 0 || maxP > 0) {
      list = list.filter((p) => matchPrice(p.price, minP, maxP));
    }
    return list;
  }, [
    data,
    activeSearch,
    activeCategory,
    activeMedium,
    activeMinPrice,
    activeMaxPrice,
  ]);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    return (data ?? [])
      .filter((p) => {
        if (!p.category?.slug) return false;
        if (seen.has(p.category.slug)) return false;
        seen.add(p.category.slug);
        return true;
      })
      .map((p) => ({ slug: p.category!.slug, name: p.category!.name }));
  }, [data]);

  const mediums = useMemo(() => {
    const seen = new Set<string>();
    return (data ?? [])
      .filter((p) => {
        if (!p.medium?.slug) return false;
        if (seen.has(p.medium.slug)) return false;
        seen.add(p.medium.slug);
        return true;
      })
      .map((p) => ({ slug: p.medium!.slug, name: p.medium!.name }));
  }, [data]);

  const totalPages = Math.max(1, Math.ceil(allProducts.length / PAGE_SIZE));
  const safePage = Math.min(activePage, totalPages);
  const paginatedProducts = allProducts.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const activeFilterCount =
    (activeCategory ? 1 : 0) +
    (activeMedium ? 1 : 0) +
    (activeMinPrice || activeMaxPrice ? 1 : 0);

  const clearFilters = useCallback(() => {
    setActiveCategory("");
    setActiveMedium("");
    setActiveMinPrice("");
    setActiveMaxPrice("");
    setPriceMinDraft("");
    setPriceMaxDraft("");
    setActivePage(1);
  }, []);

  const commitPriceFilter = useCallback(() => {
    setActiveMinPrice(priceMinDraft);
    setActiveMaxPrice(priceMaxDraft);
    setActivePage(1);
  }, [priceMinDraft, priceMaxDraft]);

  const pageNumbers = useMemo(() => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, safePage - 1);
      let end = Math.min(totalPages - 1, safePage + 1);
      if (safePage <= 3) {
        start = 2;
        end = Math.min(maxVisible, totalPages - 1);
      }
      if (safePage >= totalPages - 2) {
        start = Math.max(2, totalPages - maxVisible + 1);
        end = totalPages - 1;
      }
      if (start > 2) pages.push("ellipsis");
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, safePage]);

  return (
    <main className="pt-32 min-h-screen ">
      <div className="max-w-360 mx-auto px-8 lg:px-16">
        <RevealBlock>
          <div className="border-b border-border pb-16 mb-12">
            <div className="text-label! font-mono text-primary tracking-[0.2em] uppercase mb-4">
              The Gallery Shop
            </div>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
              <h3 className="text-h3 font-extrabold tracking-[-0.03em] text-foreground leading-[0.9]">
                Original Works
                <br />& Art Prints
              </h3>
              <div className="flex items-center gap-4">
                <span className="font-mono text-text-muted tracking-widest uppercase text-2xs">
                  {allProducts.length} piece
                  {allProducts.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        </RevealBlock>

        <div className="flex items-center justify-between gap-4 mb-12">
          <div className="flex items-center gap-4">
            {activeFilterCount > 0 && (
              <span className="text-xs font-mono text-text-muted">
                {allProducts.length} piece{allProducts.length !== 1 ? "s" : ""}{" "}
                found
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex items-center bg-dark/60 border border-border/40 rounded-sm overflow-hidden transition-all duration-500 ease-in-out",
                showSearch
                  ? "w-56 lg:w-72 border-gold/30"
                  : "w-10 border-border/40"
              )}
            >
              <input
                ref={searchRef}
                type="text"
                value={activeSearch}
                onChange={(e) => setActiveSearch(e.target.value)}
                placeholder="Search artworks..."
                className={cn(
                  "bg-transparent text-xs font-mono text-text-main placeholder:text-text-muted/50 outline-none transition-all duration-500",
                  showSearch
                    ? "w-full px-3 py-2.5 opacity-100"
                    : "w-0 px-0 py-2.5 opacity-0"
                )}
              />
              <button
                onClick={() => {
                  if (showSearch && activeSearch) {
                    setActiveSearch("");
                  } else if (showSearch) {
                    setShowSearch(false);
                  } else {
                    setShowSearch(true);
                    setTimeout(() => searchRef.current?.focus(), 100);
                  }
                }}
                className="px-3 py-2.5 text-text-muted hover:text-text-main transition-colors shrink-0 cursor-pointer"
              >
                {showSearch && activeSearch ? (
                  <X size={16} />
                ) : (
                  <Search size={16} />
                )}
              </button>
            </div>
            <div className="flex items-center bg-dark/60 border border-border/40 p-1 rounded-sm shrink-0">
              <button
                onClick={() => setView("list")}
                className={cn(
                  "px-3 py-2 text-2xs font-mono uppercase tracking-widest transition-all duration-300 rounded-sm flex items-center gap-1.5",
                  view === "list"
                    ? "bg-gold text-dark shadow-[0_0_15px_rgba(212, 175, 55,0.3)] font-black"
                    : "text-text-muted hover:text-foreground"
                )}
              >
                <List size={14} />
              </button>
              <button
                onClick={() => setView("grid")}
                className={cn(
                  "px-3 py-2 text-2xs font-mono uppercase tracking-widest transition-all duration-300 rounded-sm flex items-center gap-1.5",
                  view === "grid"
                    ? "bg-gold text-dark shadow-[0_0_15px_rgba(212, 175, 55,0.3)] font-black"
                    : "text-text-muted hover:text-foreground"
                )}
              >
                <Grid size={14} />
              </button>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "flex items-center justify-center gap-3 px-5 lg:px-8 py-4 border rounded-sm transition-all font-mono text-xs tracking-widest uppercase min-w-14 relative",
                    activeFilterCount > 0
                      ? "bg-gold/10! border-gold! text-gold"
                      : "bg-surface/50 border-border/60 text-text-muted hover:border-gold/30! hover:text-text-main"
                  )}
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
                      Filters
                    </h3>
                    {activeFilterCount > 0 && (
                      <button
                        onClick={clearFilters}
                        className="text-2xs font-mono text-text-muted hover:text-gold uppercase tracking-widest transition-colors"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <label className="text-2xs font-mono text-text-muted uppercase tracking-[0.2em] block font-bold">
                      Category
                    </label>
                    <CustomSelect
                      options={[
                        { value: "", label: "All Categories" },
                        ...categories.map((c) => ({
                          value: c.slug,
                          label: c.name,
                        })),
                      ]}
                      value={activeCategory}
                      onChange={(val) => {
                        setActiveCategory(String(val));
                        setActivePage(1);
                      }}
                      placeholder="All Categories"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-2xs font-mono text-text-muted uppercase tracking-[0.2em] block font-bold">
                      Medium
                    </label>
                    <CustomSelect
                      options={[
                        { value: "", label: "All Mediums" },
                        ...mediums.map((m) => ({
                          value: m.slug,
                          label: m.name,
                        })),
                      ]}
                      value={activeMedium}
                      onChange={(val) => {
                        setActiveMedium(String(val));
                        setActivePage(1);
                      }}
                      placeholder="All Mediums"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-2xs font-mono text-text-muted uppercase tracking-[0.2em] block font-bold">
                      Price Range
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        placeholder="Min"
                        value={priceMinDraft}
                        onChange={(e) => setPriceMinDraft(e.target.value)}
                        onBlur={commitPriceFilter}
                        onKeyDown={(e) =>
                          e.key === "Enter" && commitPriceFilter()
                        }
                        className="w-full bg-dark border border-border px-3 py-2 text-xs font-mono text-text-main placeholder:text-text-muted/50 outline-none focus:border-gold/50 transition-colors rounded-sm [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-text-muted text-xs">&ndash;</span>
                      <input
                        type="number"
                        min={0}
                        placeholder="Max"
                        value={priceMaxDraft}
                        onChange={(e) => setPriceMaxDraft(e.target.value)}
                        onBlur={commitPriceFilter}
                        onKeyDown={(e) =>
                          e.key === "Enter" && commitPriceFilter()
                        }
                        className="w-full bg-dark border border-border px-3 py-2 text-xs font-mono text-text-main placeholder:text-text-muted/50 outline-none focus:border-gold/50 transition-colors rounded-sm [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <LuxuryLoader size="lg" />
          </div>
        ) : paginatedProducts.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-border rounded bg-gold-bg">
            <p className="text-text-muted text-sm font-mono">
              No artworks match your filters.
            </p>
            <button
              onClick={clearFilters}
              className="mt-4 text-xs font-mono uppercase tracking-widest text-gold hover:underline"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div
            className={cn(
              "gap-px",
              view === "grid"
                ? "grid grid-cols-2 lg:grid-cols-4"
                : "flex flex-col gap-3"
            )}
          >
            {paginatedProducts.map((p, i) => (
              <ProductCard
                key={`shop-product-${p.id}`}
                product={p}
                delay={i * 0.08}
                view={view}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <Pagination className="mt-16 mb-8">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (safePage > 1) setActivePage(safePage - 1);
                  }}
                  className={
                    safePage <= 1 ? "pointer-events-none opacity-30" : ""
                  }
                />
              </PaginationItem>
              {pageNumbers.map((p, i) =>
                p === "ellipsis" ? (
                  <PaginationItem key={`e${i}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={p}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setActivePage(p);
                      }}
                      isActive={p === safePage}
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (safePage < totalPages) setActivePage(safePage + 1);
                  }}
                  className={
                    safePage >= totalPages
                      ? "pointer-events-none opacity-30"
                      : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}

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
