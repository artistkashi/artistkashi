"use client";

import { unwrapPaginated, unwrapVoid } from "@/api/client-service";
import type { CourseListRead, Pagination } from "@/api/openapi-client";
import { deleteCourse, listCourses } from "@/api/openapi-client";
import { AnimatedCounter } from "@/components/dashboard/AnimatedCounter";
import { PrimaryBtn } from "@/components/ui/buttons";
import { CustomSelect } from "@/components/ui/custom-select";
import { DataTable } from "@/components/ui/data-table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { StatusModal } from "@/components/ui/StatusModal";
import { getErrorMessage } from "@/lib/error-handler";
import { cn, displayPrice } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, Filter, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "@/lib/toast";
import { LuxuryLoader } from "@/components/ui/LuxuryLoader";

function formatDuration(seconds: number | undefined | null): string {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

interface CourseFilters {
  status: string;
  level: string;
}

const EMPTY_FILTERS: CourseFilters = { status: "all", level: "all" };

const LEVELS = ["beginner", "intermediate", "advanced", "all_levels"];

const PAGE_SIZE_OPTIONS = [
  { value: 10, label: "10 per page" },
  { value: 25, label: "25 per page" },
  { value: 50, label: "50 per page" },
];

export default function AdminCoursesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<CourseFilters>(EMPTY_FILTERS);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      "admin-courses",
      page,
      pageSize,
      search,
      filters.status,
      filters.level,
    ],
    queryFn: async () => {
      const query: Record<string, unknown> = { page, page_size: pageSize };
      if (search) query.search = search;
      if (filters.status === "published") query.is_published = true;
      else if (filters.status === "draft") query.is_published = false;
      if (filters.level !== "all") query.level = filters.level;
      return unwrapPaginated(listCourses({ query }));
    },
  });

  const courses = data?.data ?? [];
  const pagination: Pagination | undefined = data?.pagination;
  const isDataLoading = isLoading || isFetching;

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (slug: string) => unwrapVoid(deleteCourse({ path: { slug } })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      toast.success("Course deleted");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== "all"
  ).length;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
  };

  const columns: ColumnDef<CourseListRead>[] = useMemo(
    () => [
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <Link
              href={`/admin/courses/${row.original.id}`}
              className="text-text-main font-semibold hover:text-gold transition-colors truncate max-w-60"
            >
              {row.original.title}
            </Link>
            <span className="text-xs font-mono text-text-muted">
              {row.original.slug}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "level",
        header: "Level",
        cell: ({ row }) => (
          <span className="text-xs font-mono uppercase tracking-wider text-text-muted">
            {row.original.level}
          </span>
        ),
      },
      {
        accessorKey: "price",
        header: "Price",
        cell: ({ row }) => (
          <span className="font-mono text-sm">
            {displayPrice(row.original.price)}
          </span>
        ),
      },
      {
        accessorKey: "is_published",
        header: "Status",
        cell: ({ row }) => (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-2xs font-mono uppercase tracking-widest px-3 py-1 rounded-sm",
              row.original.is_published
                ? "text-emerald-400 border border-emerald-400/30 bg-emerald-400/5"
                : "text-text-muted border border-border bg-muted/30"
            )}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                row.original.is_published ? "bg-emerald-400" : "bg-text-muted"
              )}
            />
            {row.original.is_published ? "Published" : "Draft"}
          </span>
        ),
      },
      {
        id: "lessons",
        header: "Lessons",
        cell: ({ row }) => (
          <span className="text-xs text-text-muted font-mono">
            {row.original.lessons_count ?? 0}
          </span>
        ),
      },
      {
        id: "duration",
        header: "Duration",
        cell: ({ row }) => (
          <span className="text-xs text-text-muted font-mono">
            {formatDuration(row.original.total_duration_seconds)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <Link
                href={`/admin/courses/${c.id}`}
                className="p-2 bg-dark/60 border border-border/60 text-text-muted hover:text-gold hover:border-gold/40 transition-all rounded-sm inline-flex items-center justify-center"
                title="View Details"
              >
                <Eye size={13} />
              </Link>

              <button
                className="p-2 bg-dark/60 border border-border/60 text-text-muted hover:text-red-400 hover:border-red-400/40 transition-all rounded-sm inline-flex items-center justify-center"
                onClick={() => setDeleteTarget(c.slug)}
                title="Delete Course"
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="lg:h-[calc(100vh-164px)] flex flex-col space-y-6 lg:overflow-hidden pb-10 lg:pb-0">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 shrink-0 px-1 pt-4 lg:pt-0">
        <div>
          <h1 className="text-4xl font-black text-text-main tracking-tighter uppercase leading-none">
            Course <span className="text-gold italic">Archive</span>
          </h1>
          <p className="text-text-muted text-xs mt-3 uppercase font-mono tracking-[0.3em] flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-gold rounded-full animate-pulse" />
            Total Volume:{" "}
            <AnimatedCounter
              target={pagination?.total_items ?? 0}
              fontSize={16}
            />{" "}
            Masterclasses
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
          <Link href="/admin/courses/new">
            <PrimaryBtn className="px-6 py-3 text-2xs flex items-center gap-2">
              <Plus size={16} /> NEW COURSE
            </PrimaryBtn>
          </Link>
        </div>
      </div>

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
            placeholder="Search archive and hit enter..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (e.target.value === "") setPage(1);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") setPage(1);
            }}
            className="w-full focus:border-gold/50! px-14 py-4 text-sm text-text-main outline-none placeholder:text-text-muted/50 transition-all rounded-sm backdrop-blur-sm glass-input"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "flex items-center justify-center gap-3 px-5 lg:px-8 py-4 border rounded-sm transition-all font-mono text-xs uppercase tracking-widest min-w-14 relative glass-input",
                activeFilterCount > 0
                  ? "bg-gold/10! border-gold! text-gold"
                  : "bg-surface/50 border-border/60 text-text-muted hover:border-gold/30! hover:text-text-main"
              )}
              title="Toggle Filters"
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
                  Course <span className="text-gold">Filters</span>
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

              <div className="space-y-3">
                <label className="text-2xs font-mono text-text-muted uppercase tracking-[0.2em] block font-bold">
                  Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["published", "draft"].map((s) => (
                    <button
                      key={s}
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          status: prev.status === s ? "all" : s,
                        }))
                      }
                      className={cn(
                        "px-3 py-2 text-2xs font-mono uppercase tracking-widest border transition-all text-center rounded-sm",
                        filters.status === s
                          ? "bg-gold border-gold text-dark font-black"
                          : "border-border/40 text-text-muted hover:border-gold/30 hover:text-text-main"
                      )}
                    >
                      {s === "published" ? "Published" : "Draft"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-2xs font-mono text-text-muted uppercase tracking-[0.2em] block font-bold">
                  Level
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {LEVELS.map((l) => (
                    <button
                      key={l}
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          level: prev.level === l ? "all" : l,
                        }))
                      }
                      className={cn(
                        "px-3 py-2 text-2xs font-mono uppercase tracking-widest border transition-all text-center rounded-sm",
                        filters.level === l
                          ? "bg-gold border-gold text-dark font-black"
                          : "border-border/40 text-text-muted hover:border-gold/30 hover:text-text-main"
                      )}
                    >
                      {l === "all_levels" ? "All Levels" : l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex-1 lg:overflow-y-auto lg:custom-scrollbar px-1 relative">
        <AnimatePresence>
          {isDataLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 bg-dark/60 backdrop-blur-xs flex flex-col items-center justify-center gap-4 rounded-sm"
            >
              <LuxuryLoader size="lg" />
              <p className="text-2xs font-mono text-gold uppercase tracking-[0.4em] animate-pulse">
                Synchronizing Archive
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <DataTable columns={columns} data={courses} isLoading={isDataLoading} />
      </div>

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
              className="w-28 h-6"
              dropdownPosition="top"
              buttonClassName="py-2"
            />
          </div>
          <div className="hidden sm:block h-4 w-px bg-border/40" />
          <div className="flex items-center gap-4 lg:gap-6 justify-center">
            <div className="flex items-center gap-2">
              <p className="text-2xs font-mono text-text-muted uppercase tracking-widest whitespace-nowrap">
                Showing {courses.length} of {pagination?.total_items || 0}
              </p>
            </div>
            <div className="hidden md:block h-4 w-px bg-border/40" />
            <div className="flex items-center gap-2">
              <p className="text-2xs font-mono text-text-muted uppercase tracking-widest whitespace-nowrap">
                Page {page} of {pagination?.total_pages || 1}
              </p>
            </div>
            <div className="hidden sm:block h-4 w-px bg-border/40" />
            <div className="flex items-center gap-2">
              <p className="text-2xs font-mono text-text-muted uppercase tracking-widest whitespace-nowrap">
                Jump
              </p>
              <input
                type="number"
                min={1}
                max={pagination?.total_pages || 1}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = Number(e.currentTarget.value);
                    if (val >= 1 && val <= (pagination?.total_pages || 1)) {
                      setPage(val);
                    }
                  }
                }}
                className="w-12 h-8 bg-dark/60 border border-border/40 text-2xs font-mono text-center text-text-main outline-none focus:border-gold/50 rounded-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="..."
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 w-auto">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="flex-none px-4 py-2 bg-dark border border-border/60 text-2xs font-mono uppercase tracking-widest hover:border-gold disabled:opacity-20 disabled:hover:border-border transition-all rounded-sm active:scale-95 flex items-center justify-center gap-2"
          >
            Prev
          </button>
          <button
            disabled={!pagination?.has_next}
            onClick={() => setPage((p) => p + 1)}
            className="flex-none px-4 py-2 bg-dark border border-border/60 text-2xs font-mono uppercase tracking-widest hover:border-gold disabled:opacity-20 disabled:hover:border-border transition-all rounded-sm active:scale-95 flex items-center justify-center gap-2"
          >
            Next
          </button>
        </div>
      </div>

      <StatusModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        type="error"
        title="Delete Course"
        message={`This action cannot be undone.\n${deleteTarget}`}
        actionText={deleteMutation.isPending ? "Deleting..." : "Delete"}
        onAction={() => deleteMutation.mutate(deleteTarget!)}
        secondaryText="Cancel"
        onSecondary={() => setDeleteTarget(null)}
      />
    </div>
  );
}
