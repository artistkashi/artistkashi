"use client";

import { unwrapPaginated, unwrapVoid } from "@/api/client-service";
import type { AdminUserListRead, Pagination } from "@/api/openapi-client";
import { listAdminUsers, updateUserStatus } from "@/api/openapi-client";
import { AnimatedCounter } from "@/components/dashboard/AnimatedCounter";
import { Tooltip } from "@/components/ui/tooltip";
import { CustomSelect } from "@/components/ui/custom-select";
import { DataTable } from "@/components/ui/data-table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Lock,
  LockOpen,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type AdminUserStatus = "all" | "active" | "deleted";
type VerifiedFilter = "all" | "verified" | "unverified";
type ProviderFilter = "all" | "password" | "google" | "both";

interface UserFilters {
  status: AdminUserStatus;
  verified: VerifiedFilter;
  provider: ProviderFilter;
}

const EMPTY_FILTERS: UserFilters = {
  status: "all",
  verified: "all",
  provider: "all",
};

const PAGE_SIZE_OPTIONS = [
  { value: 10, label: "10 per page" },
  { value: 25, label: "25 per page" },
  { value: 50, label: "50 per page" },
  { value: 100, label: "100 per page" },
];

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<UserFilters>(EMPTY_FILTERS);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "created_at", desc: true },
  ]);

  const sortColumn = sorting[0]?.id === "full_name" || sorting[0]?.id === "created_at" ? sorting[0].id : "created_at";
  const sortOrder = sorting[0]?.desc ? "desc" : "asc";

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      "admin-users",
      page,
      pageSize,
      search,
      filters.status,
      filters.verified,
      filters.provider,
      sortColumn,
      sortOrder,
    ],
    queryFn: async () => {
      const query: Record<string, unknown> = {
        page,
        page_size: pageSize,
        sort_columns: sortColumn,
        sort_orders: sortOrder,
      };
      if (search) query.search = search;
      if (filters.status === "deleted") {
        query.is_deleted = true;
        query.is_active = undefined;
      } else if (filters.status === "active") {
        query.is_active = true;
        query.is_deleted = false;
      }
      if (filters.verified === "verified") query.is_verified = true;
      else if (filters.verified === "unverified") query.is_verified = false;
      if (filters.provider !== "all") query.provider_type = filters.provider;
      return unwrapPaginated(
        listAdminUsers({ query })
      );
    },
  });

  const users = data?.data ?? [];
  const pagination: Pagination | undefined = data?.pagination;
  const isDataLoading = isLoading || isFetching;

  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== "all"
  ).length;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const handleToggleStatus = async (userId: string, currentActive: boolean) => {
    try {
      await unwrapVoid(
        updateUserStatus({
          path: { user_id: userId },
          body: { is_active: !currentActive },
        })
      );
      toast.success(
        currentActive ? "User blocked successfully" : "User unblocked successfully"
      );
      handleRefresh();
    } catch {
      toast.error("Failed to update user status");
    }
  };

  const columns: ColumnDef<AdminUserListRead>[] = useMemo(
    () => [
      {
        accessorKey: "full_name",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting()}
            className="flex items-center gap-1 text-2xs font-mono text-text-muted tracking-widest uppercase"
          >
            Name
            <ArrowUpDown size={12} />
          </button>
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <Link
            href={`/admin/users/${row.original.id}`}
            className="text-text-main font-bold text-xs hover:text-gold transition-colors"
          >
            {row.original.is_deleted ? (
              <span className="text-text-muted italic">
                {row.original.full_name}
              </span>
            ) : (
              row.original.full_name
            )}
          </Link>
        ),
      },
      {
        accessorKey: "email",
        header: () => (
          <span className="text-2xs font-mono text-text-muted tracking-widest uppercase">
            Email
          </span>
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-text-muted text-xs font-mono">
            {row.original.is_deleted ? "—" : row.original.email}
          </span>
        ),
      },
      {
        accessorKey: "is_deleted",
        header: () => (
          <span className="text-2xs font-mono text-text-muted tracking-widest uppercase">
            Status
          </span>
        ),
        enableSorting: false,
        cell: ({ row }) => {
          const deleted = row.original.is_deleted;
          const active = row.original.is_active;
          return (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-2xs font-mono tracking-widest uppercase px-2 py-0.5 border rounded-sm",
                deleted
                  ? "text-red border-red/30 bg-red/5"
                  : active
                    ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
                    : "text-gold border-gold/30 bg-gold/5"
              )}
            >
              {deleted ? "Deleted" : active ? "Active" : "Inactive"}
            </span>
          );
        },
      },
      {
        accessorKey: "provider_type",
        header: () => (
          <span className="text-2xs font-mono text-text-muted tracking-widest uppercase">
            Provider
          </span>
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-text-muted text-2xs font-mono uppercase tracking-wider">
            {row.original.provider_type || "—"}
          </span>
        ),
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting()}
            className="flex items-center gap-1 text-2xs font-mono text-text-muted tracking-widest uppercase"
          >
            Created
            <ArrowUpDown size={12} />
          </button>
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="text-text-muted text-2xs font-mono">
            {row.original.created_at
              ? new Date(row.original.created_at).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => (
          <span className="text-2xs font-mono text-text-muted tracking-widest uppercase">
            Actions
          </span>
        ),
        enableSorting: false,
        cell: ({ row }) => {
          const u = row.original;
          if (u.is_deleted) return null;
          return (
            <div className="flex items-center justify-end gap-1">
              <Tooltip label="View details">
                <Link
                  href={`/admin/users/${u.id}`}
                  className="flex items-center justify-center w-8 h-8 bg-dark/60 border border-border/60 text-text-muted hover:text-gold hover:border-gold/40 transition-all rounded-sm"
                >
                  <Eye size={13} />
                </Link>
              </Tooltip>
              <Tooltip label={u.is_active ? "Block user" : "Unblock user"}>
                <button
                  onClick={() =>
                    handleToggleStatus(String(u.id), u.is_active ?? true)
                  }
                  className={cn(
                    "flex items-center justify-center w-8 h-8 border rounded-sm transition-all",
                    u.is_active
                      ? "bg-dark/60 border-border/60 text-text-muted hover:text-red-400 hover:border-red-400/40"
                      : "bg-dark/60 border-border/60 text-text-muted hover:text-emerald-400 hover:border-emerald-400/40"
                  )}
                >
                  {u.is_active ? <Lock size={13} /> : <LockOpen size={13} />}
                </button>
              </Tooltip>
            </div>
          );
        },
      },
    ],
    [handleToggleStatus]
  );

  return (
    <div className="lg:h-[calc(100vh-164px)] flex flex-col space-y-6 lg:overflow-hidden pb-10 lg:pb-0">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 shrink-0 px-1 pt-4 lg:pt-0">
        <div>
          <h1 className="text-4xl font-black text-text-main tracking-tighter uppercase leading-none">
            User <span className="text-gold italic">Management</span>
          </h1>
          <p className="text-text-muted text-xs mt-3 uppercase font-mono tracking-[0.3em] flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-gold rounded-full animate-pulse" />
            Total Users:{" "}
            <AnimatedCounter
              target={pagination?.total_items ?? 0}
              fontSize={16}
            />{" "}
            Records
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 w-full md:w-auto">
          <button
            onClick={handleRefresh}
            disabled={isDataLoading}
            className="p-3 bg-dark border border-border/40 text-text-muted hover:text-gold hover:border-gold/40 transition-all rounded-sm disabled:opacity-50 group"
            title="Refresh"
          >
            <RefreshCw
              size={16}
              className={cn(isDataLoading && "animate-spin")}
            />
          </button>
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
            placeholder="Search by name or email and hit enter..."
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
            className="w-full focus:border-gold/50! px-14 py-4 text-sm text-text-main outline-none placeholder:text-text-muted/50 transition-all rounded-sm backdrop-blur-sm glass-input"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                setSearchInput("");
                setPage(1);
              }}
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
                  User <span className="text-gold">Filters</span>
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
                  {(["active", "deleted"] as const).map((s) => (
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
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-2xs font-mono text-text-muted uppercase tracking-[0.2em] block font-bold">
                  Verification
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["verified", "unverified"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          verified: prev.verified === v ? "all" : v,
                        }))
                      }
                      className={cn(
                        "px-3 py-2 text-2xs font-mono uppercase tracking-widest border transition-all text-center rounded-sm",
                        filters.verified === v
                          ? "bg-gold border-gold text-dark font-black"
                          : "border-border/40 text-text-muted hover:border-gold/30 hover:text-text-main"
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-2xs font-mono text-text-muted uppercase tracking-[0.2em] block font-bold">
                  Provider
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["password", "google", "both"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          provider: prev.provider === p ? "all" : p,
                        }))
                      }
                      className={cn(
                        "px-3 py-2 text-2xs font-mono uppercase tracking-widest border transition-all text-center rounded-sm",
                        filters.provider === p
                          ? "bg-gold border-gold text-dark font-black"
                          : "border-border/40 text-text-muted hover:border-gold/30 hover:text-text-main"
                      )}
                    >
                      {p}
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
              <div className="luxury-loader luxury-loader-gold loader-lg" />
              <p className="text-2xs font-mono text-gold uppercase tracking-[0.4em] animate-pulse">
                Loading Users
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <DataTable
          columns={columns}
          data={users}
          isLoading={isDataLoading}
          sorting={sorting}
          onSortingChange={setSorting}
          manualSorting
        />
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
                Showing {users.length} of {pagination?.total_items || 0}
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
            <ChevronLeft size={14} /> Prev
          </button>
          <button
            disabled={!pagination?.has_next}
            onClick={() => setPage((p) => p + 1)}
            className="flex-none px-4 py-2 bg-dark border border-border/60 text-2xs font-mono uppercase tracking-widest hover:border-gold disabled:opacity-20 disabled:hover:border-border transition-all rounded-sm active:scale-95 flex items-center justify-center gap-2"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
