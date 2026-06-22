"use client";

import { unwrap, unwrapPaginated } from "@/api/client-service";
import {
  coursesListCourses,
  listPublicCourseCategories,
} from "@/api/openapi-client";
import {
  CourseCardGrid,
  CourseCardListItem,
} from "@/components/lms/CourseCard";
import { CustomSelect } from "@/components/ui/custom-select";
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
import { Filter, Grid, List, Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";

const LEVELS = ["all_levels", "beginner", "intermediate", "advanced"] as const;
const PAGE_SIZE = 12;

function matchPrice(price: string, min: number, max: number): boolean {
  const num = Number(price);
  if (Number.isNaN(num)) return true;
  return num >= min && (max <= 0 || num <= max);
}

export default function CoursesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeLevel = searchParams.get("level") ?? "";
  const activeCategory = searchParams.get("category") ?? "";
  const activeMinPrice = searchParams.get("minPrice") ?? "";
  const activeMaxPrice = searchParams.get("maxPrice") ?? "";
  const activePage = Number(searchParams.get("page") ?? "1");

  const [view, setView] = useState<"grid" | "list">("grid");
  const [showSearch, setShowSearch] = useState(false);
  const [activeSearch, setActiveSearch] = useState(
    searchParams.get("search") ?? ""
  );
  const searchRef = useRef<HTMLInputElement>(null);
  const [priceMinDraft, setPriceMinDraft] = useState(
    searchParams.get("minPrice") ?? ""
  );
  const [priceMaxDraft, setPriceMaxDraft] = useState(
    searchParams.get("maxPrice") ?? ""
  );

  const setFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      if (key !== "page") params.set("page", "1");
      router.push(`/courses?${params.toString()}`);
    },
    [router, searchParams]
  );

  const commitPriceFilter = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (priceMinDraft) params.set("minPrice", priceMinDraft);
    else params.delete("minPrice");
    if (priceMaxDraft) params.set("maxPrice", priceMaxDraft);
    else params.delete("maxPrice");
    params.set("page", "1");
    router.push(`/courses?${params.toString()}`);
  }, [router, searchParams, priceMinDraft, priceMaxDraft]);

  const clearFilters = useCallback(() => {
    setPriceMinDraft("");
    setPriceMaxDraft("");
    router.push("/courses");
  }, [router]);

  const setPage = useCallback(
    (p: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (p > 1) params.set("page", String(p));
      else params.delete("page");
      router.push(`/courses?${params.toString()}`);
    },
    [router, searchParams]
  );

  const { data: rawCategories } = useQuery({
    queryKey: ["public-course-categories"],
    queryFn: async () => {
      const list = await unwrap(listPublicCourseCategories());
      return Array.isArray(list) ? list : [];
    },
  });

  const categories = rawCategories as Array<{
    id: string;
    name: string;
    slug: string;
  }>;

  const { data, isLoading } = useQuery({
    queryKey: ["courses", activeCategory, activeMinPrice, activeMaxPrice],
    queryFn: async () => {
      const query: Record<string, unknown> = { page_size: 50 };
      if (activeCategory) query.category = activeCategory;
      if (activeMinPrice) query.min_price = Number(activeMinPrice);
      if (activeMaxPrice) query.max_price = Number(activeMaxPrice);
      const result = await unwrapPaginated(coursesListCourses({ query }));
      return result;
    },
  });

  const allCourses = useMemo(() => {
    let list = data?.data ?? [];
    if (activeLevel) {
      list = list.filter((c) => c.level === activeLevel);
    }
    const minP = activeMinPrice ? Number(activeMinPrice) : 0;
    const maxP = activeMaxPrice ? Number(activeMaxPrice) : 0;
    if (minP > 0 || maxP > 0) {
      list = list.filter((c) => matchPrice(c.price, minP, maxP));
    }
    if (activeSearch) {
      const q = activeSearch.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.short_description?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, activeLevel, activeMinPrice, activeMaxPrice, activeSearch]);

  const totalPages = Math.max(1, Math.ceil(allCourses.length / PAGE_SIZE));
  const safePage = Math.min(activePage, totalPages);
  const paginatedCourses = allCourses.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const activeFilterCount =
    (activeLevel ? 1 : 0) +
    (activeCategory ? 1 : 0) +
    (activeMinPrice || activeMaxPrice ? 1 : 0);

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
    <main className="pt-32 min-h-screen">
      <div className="max-w-360 mx-auto px-8 lg:px-16">
        <RevealBlock>
          <div className="border-b border-border pb-16 mb-16">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-label font-mono text-gold tracking-[0.2em] uppercase">
                Courses
              </span>
              <span className="h-3 w-px bg-border/40" />
              <span className="font-mono text-text-muted tracking-widest uppercase text-2xs">
                {allCourses.length} course{allCourses.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
              <h1 className="text-h3 font-extrabold tracking-[-0.03em] text-text-main leading-[0.9]">
                All Courses
              </h1>
              <p className="text-text-muted max-w-xs text-sm leading-relaxed">
                Learn at your own pace with lifetime access to every course.
              </p>
            </div>
          </div>
        </RevealBlock>

        <div className="flex items-center justify-between gap-4 mb-12">
          <div className="flex items-center gap-4">
            {activeFilterCount > 0 && (
              <span className="text-xs font-mono text-text-muted">
                {allCourses.length} course{allCourses.length !== 1 ? "s" : ""}{" "}
                found
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex items-center bg-dark/60 border border-border/40 rounded-sm overflow-hidden transition-all duration-500 ease-in-out",
                showSearch ? "w-56 lg:w-72 border-gold/30" : "w-10 border-border/40"
              )}
            >
              <input
                ref={searchRef}
                type="text"
                value={activeSearch}
                onChange={(e) => setActiveSearch(e.target.value)}
                placeholder="Search courses..."
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
                    ? "bg-gold text-dark shadow-[0_0_15px_rgba(184,157,92,0.3)] font-black"
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
                    ? "bg-gold text-dark shadow-[0_0_15px_rgba(184,157,92,0.3)] font-black"
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
                        ...(Array.isArray(categories)
                          ? categories.map((cat) => ({
                              value: cat.slug,
                              label: cat.name,
                            }))
                          : []),
                      ]}
                      value={activeCategory}
                      onChange={(val) => setFilter("category", String(val))}
                      placeholder="All Categories"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-2xs font-mono text-text-muted uppercase tracking-[0.2em] block font-bold">
                      Level
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setFilter("level", "")}
                        className={cn(
                          "px-3 py-2 text-2xs font-mono uppercase tracking-widest border transition-all text-center rounded-sm",
                          !activeLevel
                            ? "bg-gold border-gold text-dark font-black"
                            : "border-border/40 text-text-muted hover:border-gold/30 hover:text-text-main"
                        )}
                      >
                        All Levels
                      </button>
                      {LEVELS.filter((l) => l !== "all_levels").map((l) => (
                        <button
                          key={l}
                          onClick={() => setFilter("level", l)}
                          className={cn(
                            "px-3 py-2 text-2xs font-mono uppercase tracking-widest border transition-all text-center rounded-sm",
                            activeLevel === l
                              ? "bg-gold border-gold text-dark font-black"
                              : "border-border/40 text-text-muted hover:border-gold/30 hover:text-text-main"
                          )}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
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
                      <span className="text-text-muted text-xs">–</span>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px ">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-surface aspect-video animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {paginatedCourses.length === 0 ? (
              <div className="text-center py-24 border border-dashed border-border rounded bg-gold-bg">
                <p className="text-text-muted text-sm font-mono">
                  No courses match your filters.
                </p>
                <button
                  onClick={clearFilters}
                  className="mt-4 text-xs font-mono uppercase tracking-widest text-gold hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            ) : view === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 ">
                {paginatedCourses.map((c, i) => (
                  <CourseCardGrid key={c.id} course={c} delay={i * 0.1} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {paginatedCourses.map((c, i) => (
                  <CourseCardListItem key={c.id} course={c} delay={i * 0.05} />
                ))}
              </div>
            )}
          </>
        )}

        {totalPages > 1 && (
          <Pagination className="mt-16 mb-8">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (safePage > 1) setPage(safePage - 1);
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
                        setPage(p);
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
                    if (safePage < totalPages) setPage(safePage + 1);
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
      </div>
    </main>
  );
}
