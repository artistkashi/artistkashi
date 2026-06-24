"use client";

import { unwrap, unwrapPaginated } from "@/api/client-service";
import { listOrders, overview } from "@/api/openapi-client";
import { PrimaryBtn } from "@/components/ui/buttons";
import { AnimatedCounter } from "@/components/dashboard/AnimatedCounter";
import { cn, displayPrice } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  BookOpen,
  ExternalLink,
  Layers,
  Lock,
  ShoppingBag,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";

export default function AdminPage() {
  const { data: statsData, isLoading: isStatsLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => unwrap(overview()),
  });

  const { data: ordersData, isLoading: isOrdersLoading } = useQuery({
    queryKey: ["admin", "recent-orders"],
    queryFn: () =>
      unwrapPaginated(listOrders({ query: { page: 1, page_size: 5 } })),
  });

  const stats = [
    { label: "Total Users", value: statsData?.users || 0, icon: Users },
    { label: "Active Courses", value: statsData?.courses || 0, icon: BookOpen },
    { label: "Products", value: statsData?.products || 0, icon: Layers },
    { label: "Total Orders", value: statsData?.orders || 0, icon: ShoppingBag },
  ];

  const recentOrders = ordersData?.data || [];

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-h3 font-extrabold tracking-tight text-text-main uppercase">
            Platform Command
          </h1>
          <p className="text-text-muted text-sm mt-1 uppercase font-mono tracking-widest">
            Welcome back to the instructor command center.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PrimaryBtn className="px-5 py-2.5 text-xs">
            GENERATE REVENUE REPORT
          </PrimaryBtn>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-muted-light border border-border p-6 group hover:border-gold transition-all"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="text-2xs font-mono text-text-muted tracking-widest uppercase">
                {s.label}
              </div>
              <s.icon
                size={14}
                className="text-gold opacity-50 group-hover:opacity-100 transition-opacity"
              />
            </div>
            <div className="text-text-main font-extrabold text-3xl mb-2">
              <AnimatedCounter target={isStatsLoading ? 0 : s.value} fontSize={34} />
            </div>
            <div className="text-2xs font-mono text-text-muted flex items-center gap-1 uppercase">
              <TrendingUp size={11} className="text-gold" /> System Archive Data
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity Table */}
      <div className="border border-border bg-muted-light">
        <div className="px-8 py-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-text-main font-bold text-xl uppercase tracking-tight">
            Recent Acquisitions
          </h2>
          <Link href="/admin/orders">
            <button className="text-gold text-2xs font-mono tracking-widest uppercase hover:text-text-main transition-colors flex items-center gap-2">
              All Transactions <ExternalLink size={12} />
            </button>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-dark-soft">
                {["ID", "Customer", "Date", "Amount", "Status"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-6 py-4 text-2xs font-mono text-text-muted tracking-widest uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              {isOrdersLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-text-muted font-mono animate-pulse"
                  >
                    FETCHING RECENT ACTIVITY...
                  </td>
                </tr>
              ) : recentOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-text-muted font-mono uppercase tracking-widest"
                  >
                    No recent acquisitions found.
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-dark/40 transition-colors"
                  >
                    <td className="px-6 py-4 text-text-muted font-mono text-xs uppercase tracking-tighter">
                      #{order.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 text-text-main font-bold uppercase tracking-tight text-xs">
                      {order.user?.full_name || "Anonymous User"}
                    </td>
                    <td className="px-6 py-4 text-text-muted font-mono text-xs">
                      {format(new Date(order.created_at), "dd MMM yyyy")}
                    </td>
                    <td className="px-6 py-4 text-text-main font-bold font-mono">
                      {displayPrice(order.total_amount)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "text-[9px] font-mono tracking-widest uppercase px-2 py-0.5 border rounded-sm",
                          order.status === "delivered"
                            ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
                            : order.status === "pending"
                              ? "text-gold border-gold/30 bg-gold/5"
                              : "text-blue-500 border-blue-500/20 bg-blue-500/5"
                        )}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-text-main font-bold text-xl mb-6 uppercase tracking-tight">
          Quick Operations
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "New Course", icon: BookOpen, href: "/admin/courses" },
            { label: "Add Product", icon: Layers, href: "/admin/products" },
            { label: "User Audit", icon: Users, href: "/admin/users" },
            { label: "Site Security", icon: Lock, href: "/admin/settings" },
          ].map((a) => (
            <Link key={a.label} href={a.href}>
              <button className="w-full group bg-muted-light border border-border hover:border-gold transition-all flex items-center gap-4 p-6 text-left">
                <div className="w-10 h-10 bg-dark border border-border group-hover:border-gold flex items-center justify-center transition-colors">
                  <a.icon
                    size={18}
                    className="text-text-muted group-hover:text-gold transition-colors"
                  />
                </div>
                <span className="text-xs font-bold text-text-main uppercase tracking-widest">
                  {a.label}
                </span>
              </button>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
