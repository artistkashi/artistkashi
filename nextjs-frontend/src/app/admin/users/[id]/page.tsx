"use client";

import type {
  AdminUserDetailRead,
  UpdateUserStatusRequest,
} from "@/api/openapi-client";
import { getAdminUserDetail, updateUserStatus } from "@/api/openapi-client";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn, displayPrice } from "@/lib/utils";
import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  GraduationCap,
  IndianRupee,
  Loader2,
  Lock,
  LockOpen,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Shield,
  ShoppingBag,
  UserCheck,
  UserMinus,
  UserX,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface UserDetail extends AdminUserDetailRead {
  id: string;
}

export default function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [user, setUser] = useState<UserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchUser = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const result = await getAdminUserDetail({ path: { user_id: id } });
      const response = result.data as { data?: AdminUserDetailRead };
      if (response?.data) {
        setUser({ ...response.data, id: String(response.data.id ?? id) });
      } else {
        setUser(null);
      }
    } catch {
      if (!silent) setUser(null);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const handleToggleStatus = async () => {
    if (!user) return;
    setStatusLoading(true);
    try {
      const body: UpdateUserStatusRequest = { is_active: !user.is_active };
      await updateUserStatus({ path: { user_id: id }, body });
      setShowStatusModal(false);
      const result = await getAdminUserDetail({ path: { user_id: id } });
      const response = result.data as { data?: AdminUserDetailRead };
      if (response?.data) {
        setUser({ ...response.data, id: String(response.data.id ?? id) });
      }
      toast.success(
        user.is_active
          ? "User blocked successfully"
          : "User unblocked successfully"
      );
    } catch {
      toast.error("Failed to update user status");
    } finally {
      setStatusLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 gold-shimmer" />
        <Skeleton className="h-64 w-full gold-shimmer" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 gold-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <UserX size={48} className="mx-auto text-text-muted mb-4" />
        <p className="text-text-muted font-mono uppercase tracking-widest text-sm">
          User not found
        </p>
        <Link
          href="/admin/users"
          className="text-gold text-xs font-mono tracking-widest uppercase hover:underline mt-4 inline-block"
        >
          Back to Users
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back link + refresh */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-text-muted text-2xs font-mono tracking-widest uppercase hover:text-gold transition-colors"
        >
          <ArrowLeft size={12} /> Back to Users
        </Link>
        <button
          onClick={() => fetchUser(true)}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 text-2xs font-mono tracking-widest uppercase text-text-muted hover:text-gold transition-colors disabled:opacity-50"
        >
          <RefreshCw
            size={12}
            className={isRefreshing ? "animate-spin" : ""}
          />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Deleted banner */}
      {user.is_deleted && (
        <div className="border border-red/30 bg-red/5 p-4 flex items-center gap-3">
          <UserMinus size={18} className="text-red shrink-0" />
          <div>
            <p className="text-text-main font-bold text-sm uppercase tracking-wider">
              Account Deleted
            </p>
            <p className="text-text-muted text-xs font-mono mt-0.5">
              This account was deleted on{" "}
              {user.deleted_at
                ? format(new Date(user.deleted_at), "dd MMM yyyy 'at' HH:mm")
                : "Unknown date"}
              . Personal data has been permanently anonymized.
            </p>
          </div>
        </div>
      )}

      {/* Profile Card */}
      <div className="border border-border bg-muted-light p-6 md:p-8 rounded-sm">
        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
          <div className="flex flex-col md:flex-row items-start gap-6 min-w-0">
            {/* Avatar */}
            <div className="w-20 h-20 bg-dark border border-border overflow-hidden shrink-0 rounded">
              {user.profile_picture ? (
                <ImageWithFallback
                  src={user.profile_picture}
                  alt={user.full_name}
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-xl font-black text-text-muted tracking-tight">
                    {user.full_name.slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="min-w-0">
              <h1
                className={`text-2xl font-black tracking-tight uppercase ${
                  user.is_deleted ? "text-text-muted italic" : "text-text-main"
                }`}
              >
                {user.full_name}
              </h1>
              {!user.is_deleted && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1 text-2xs font-mono tracking-widest uppercase px-2 py-0.5 border rounded-sm ${
                      user.is_active
                        ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
                        : "text-gold border-gold/30 bg-gold/5"
                    }`}
                  >
                    {user.is_active ? (
                      <UserCheck size={10} />
                    ) : (
                      <UserX size={10} />
                    )}
                    {user.is_active ? "Active" : "Inactive"}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-2xs font-mono tracking-widest uppercase px-2 py-0.5 border rounded-sm ${
                      user.is_verified
                        ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
                        : "text-gold border-gold/30 bg-gold/5"
                    }`}
                  >
                    {user.is_verified ? (
                      <CheckCircle size={10} />
                    ) : (
                      <XCircle size={10} />
                    )}
                    {user.is_verified ? "Verified" : "Unverified"}
                  </span>
                  <span className="text-2xs font-mono text-text-muted uppercase tracking-widest px-2 py-0.5 border border-border/60">
                    {user.role}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Block button — right side of profile card */}
          {!user.is_deleted && (
            <button
              onClick={() => setShowStatusModal(true)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-2xs font-mono tracking-widest uppercase rounded-sm border transition-colors shrink-0 self-start md:self-center",
                user.is_active
                  ? "text-red border-red/30 bg-red/5 hover:bg-red/10"
                  : "text-emerald-500 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10"
              )}
            >
              {user.is_active ? <Lock size={12} /> : <LockOpen size={12} />}
              {user.is_active ? "Block User" : "Unblock User"}
            </button>
          )}
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Details */}
        <div className="border border-border bg-muted-light p-6 rounded-sm">
          <h2 className="text-text-main font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <Shield size={14} className="text-gold" /> Profile Details
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail size={14} className="text-text-muted shrink-0" />
              <span className="text-text-muted text-xs font-mono truncate">
                {user.is_deleted ? "—" : user.email}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Phone size={14} className="text-text-muted shrink-0" />
              <span className="text-text-muted text-xs font-mono">
                {user.phone || "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Auth Providers */}
        <div className="border border-border bg-muted-light p-6 rounded-sm">
          <h2 className="text-text-main font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <Shield size={14} className="text-gold" /> Auth Providers
          </h2>
          <div className="space-y-2">
            {(user.auth_providers ?? []).length === 0 ? (
              <p className="text-text-muted text-xs font-mono">None</p>
            ) : (
              (user.auth_providers ?? []).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 px-3 py-2 bg-dark/40 border border-border/60 rounded-sm"
                >
                  <span className="text-2xs font-mono text-text-muted uppercase tracking-wider">
                    {p.provider}
                  </span>
                  <span className="text-2xs font-mono text-text-muted ml-auto">
                    {format(new Date(p.created_at ?? ""), "dd MMM yyyy")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Activity */}
        <div className="border border-border bg-muted-light p-6 rounded-sm">
          <h2 className="text-text-main font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <Clock size={14} className="text-gold" /> Activity
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Calendar size={14} className="text-text-muted shrink-0" />
              <span className="text-text-muted text-xs font-mono">
                Joined: {format(new Date(user.created_at), "dd MMM yyyy")}
              </span>
            </div>
            {user.updated_at && (
              <div className="flex items-center gap-3">
                <Clock size={14} className="text-text-muted shrink-0" />
                <span className="text-text-muted text-xs font-mono">
                  Last updated:{" "}
                  {format(new Date(user.updated_at), "dd MMM yyyy")}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Addresses */}
      {!user.is_deleted && (user.addresses ?? []).length > 0 && (
        <div className="border border-border bg-muted-light p-6 rounded-sm">
          <h2 className="text-text-main font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <MapPin size={14} className="text-gold" /> Addresses
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(user.addresses ?? []).map((addr) => (
              <div
                key={addr.id}
                className="border border-border/60 bg-dark/30 p-4 rounded-sm space-y-1.5"
              >
                {addr.is_default && (
                  <span className="text-2xs font-mono text-gold uppercase tracking-widest">
                    Default
                  </span>
                )}
                <p className="text-xs font-mono text-text-main leading-relaxed">
                  {addr.line1}
                  {addr.line2 && <>, {addr.line2}</>}
                </p>
                <p className="text-2xs font-mono text-text-muted">
                  {[addr.city, addr.state, addr.postal_code, addr.country]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                {addr.phone && (
                  <div className="flex items-center gap-1.5 text-2xs font-mono text-text-muted pt-1 border-t border-border/30">
                    <Phone size={10} />
                    {addr.phone}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-border bg-muted-light p-5 text-center rounded-sm">
          <ShoppingBag
            size={20}
            className="mx-auto text-gold mb-2 opacity-70"
          />
          <div className="text-2xl font-bold text-text-main">
            {user.orders_count}
          </div>
          <div className="text-2xs font-mono text-text-muted uppercase tracking-widest mt-1">
            Orders
          </div>
        </div>
        <div className="border border-border bg-muted-light p-5 text-center rounded-sm">
          <GraduationCap
            size={20}
            className="mx-auto text-gold mb-2 opacity-70"
          />
          <div className="text-2xl font-bold text-text-main">
            {user.enrollments_count}
          </div>
          <div className="text-2xs font-mono text-text-muted uppercase tracking-widest mt-1">
            Enrollments
          </div>
        </div>
        <div className="border border-border bg-muted-light p-5 text-center rounded-sm">
          <CreditCard size={20} className="mx-auto text-gold mb-2 opacity-70" />
          <div className="text-2xl font-bold text-text-main">
            {user.provider_type === "google"
              ? "Google"
              : user.provider_type === "password"
                ? "Email"
                : user.provider_type === "both"
                  ? "Both"
                  : "—"}
          </div>
          <div className="text-2xs font-mono text-text-muted uppercase tracking-widest mt-1">
            Provider
          </div>
          <div className="text-2xs font-mono text-text-muted capitalize mt-0.5">
            {user.provider_type === "google"
              ? "Google OAuth"
              : user.provider_type === "password"
                ? "Email & Password"
                : user.provider_type === "both"
                  ? "Google + Email"
                  : "N/A"}
          </div>
        </div>
        <div className="border border-border bg-muted-light p-5 text-center rounded-sm">
          <IndianRupee
            size={20}
            className="mx-auto text-gold mb-2 opacity-70"
          />
          <div className="text-2xl font-bold text-text-main font-mono tracking-tight">
            {displayPrice(Number(user.products_spent))}
          </div>
          <div className="text-2xs font-mono text-text-muted uppercase tracking-widest mt-1">
            Spent on Products
          </div>
        </div>
        <div className="border border-border bg-muted-light p-5 text-center rounded-sm">
          <IndianRupee
            size={20}
            className="mx-auto text-gold mb-2 opacity-70"
          />
          <div className="text-2xl font-bold text-text-main font-mono tracking-tight">
            {displayPrice(Number(user.courses_spent))}
          </div>
          <div className="text-2xs font-mono text-text-muted uppercase tracking-widest mt-1">
            Spent on Courses
          </div>
        </div>
        <div className="border border-border bg-gold/5 p-5 text-center rounded-sm ring-1 ring-gold/20">
          <IndianRupee
            size={20}
            className="mx-auto text-gold mb-2"
          />
          <div className="text-2xl font-bold text-gold font-mono tracking-tight">
            {displayPrice(Number(user.total_spent))}
          </div>
          <div className="text-2xs font-mono text-gold/70 uppercase tracking-widest mt-1">
            Total Spent
          </div>
        </div>
      </div>

      {/* Block/Unblock confirmation modal */}
      {showStatusModal && (
        <div
          className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowStatusModal(false);
          }}
        >
          <div className="w-full max-w-sm bg-surface border border-border shadow-lg p-6 rounded-sm">
            <h3 className="text-text-main font-bold text-sm uppercase tracking-wider mb-2">
              {user.is_active ? "Block User" : "Unblock User"}
            </h3>
            <p className="text-text-muted text-xs font-mono mb-6">
              {user.is_active
                ? "This user will be unable to log in or use their account until unblocked."
                : "This user will regain access to their account."}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowStatusModal(false)}
                disabled={statusLoading}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-border text-text-muted text-2xs font-mono tracking-widest uppercase hover:text-text-main transition-colors rounded-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleStatus}
                disabled={statusLoading}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-2xs font-mono tracking-widest uppercase border transition-colors disabled:opacity-50 rounded-sm ${
                  user.is_active
                    ? "text-red border-red/30 bg-red/5 hover:bg-red/10"
                    : "text-emerald-500 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10"
                }`}
              >
                {statusLoading
                  ? "Updating..."
                  : user.is_active
                    ? "Block"
                    : "Unblock"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
