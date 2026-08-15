"use client";

import { unwrap } from "@/api/client-service";
import { ordersGetOrderDetails } from "@/api/openapi-client";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { Skeleton } from "@/components/ui/Skeleton";
import { GhostBtn, PrimaryBtn } from "@/components/ui/buttons";
import { cn, displayPrice } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, ArrowUpRight, Package, Truck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-green/10 text-green border border-green/30",
  shipped: "bg-blue/10 text-blue border border-blue/30",
  delivered: "bg-green/10 text-green border border-green/30",
  cancelled: "bg-red/10 text-red border border-red/30",
  pending: "bg-gold/10 text-gold border border-gold/30",
};

const PAYMENT_STYLES: Record<string, string> = {
  paid: "bg-green/10 text-green border border-green/30",
  pending: "bg-gold/10 text-gold border border-gold/30",
  failed: "bg-red/10 text-red border border-red/30",
  refunded: "bg-indigo/10 text-indigo border border-indigo/30",
};

export default function OrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;

  const {
    data: order,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["my-orders", orderId],
    queryFn: () => unwrap(ordersGetOrderDetails({ path: { order_id: orderId } })),
    enabled: !!orderId,
  });

  return (
    <AuthGuard>
      <div className="min-h-screen bg-foreground text-text-main">
        <div className="max-w-3xl mx-auto px-6 md:px-8 py-12 md:py-20">
          <Link
            href="/dashboard?tab=orders"
            className="inline-flex items-center gap-2 text-tiny font-mono uppercase tracking-widest text-text-muted hover:text-gold transition-colors mb-10"
          >
            <ArrowLeft size={14} /> Back to Orders
          </Link>

          {isLoading && (
            <div className="space-y-6">
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          )}

          {isError && (
            <div className="text-center py-20 space-y-4">
              <Package size={40} className="mx-auto text-text-muted" />
              <p className="text-text-muted text-sm">
                Could not load this order. It may not exist or is not yours.
              </p>
              <PrimaryBtn
                onClick={() => window.history.back()}
                className="px-8 py-3 text-xs"
              >
                GO BACK
              </PrimaryBtn>
            </div>
          )}

          {order && !isLoading && (
            <div className="space-y-8">
              {/* Header */}
              <div>
                <p className="text-tiny font-mono text-gold uppercase tracking-[0.3em] mb-2">
                  Order Details
                </p>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight">
                    Order #
                    <span className="font-mono">{order.id.slice(0, 8)}</span>
                  </h1>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-tiny font-mono tracking-widest uppercase px-2.5 py-1 rounded",
                        STATUS_STYLES[order.status] ||
                          "bg-text-muted/10 text-text-muted border border-text-muted/20"
                      )}
                    >
                      {order.status}
                    </span>
                    <span
                      className={cn(
                        "text-tiny font-mono tracking-widest uppercase px-2.5 py-1 rounded",
                        PAYMENT_STYLES[order.payment_status] ||
                          "bg-text-muted/10 text-text-muted border border-text-muted/20"
                      )}
                    >
                      Payment: {order.payment_status}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-text-muted font-mono mt-3">
                  Placed on{" "}
                  {format(new Date(order.created_at), "dd MMM yyyy, HH:mm")}
                </p>
              </div>

              {/* Shipment */}
              {(order.status === "shipped" || order.status === "delivered") &&
                order.courier_name &&
                order.tracking_number && (
                  <section className="border border-border bg-dark-soft rounded p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <Truck size={18} className="text-gold" />
                      <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-text-main">
                        Shipment
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <p className="text-tiny font-mono text-text-muted uppercase tracking-widest mb-2">
                          Courier
                        </p>
                        <p className="text-sm font-semibold text-text-main uppercase">
                          {order.courier_name}
                        </p>
                      </div>
                      <div>
                        <p className="text-tiny font-mono text-text-muted uppercase tracking-widest mb-2">
                          Tracking Number
                        </p>
                        <p className="text-sm font-semibold text-text-main font-mono break-all">
                          {order.tracking_number}
                        </p>
                      </div>
                    </div>
                    {order.shipped_at && (
                      <p className="text-xs text-text-muted font-mono mt-4">
                        Shipped on{" "}
                        {format(new Date(order.shipped_at), "dd MMM yyyy")}
                      </p>
                    )}
                    {order.shipping_note && (
                      <p className="text-xs text-text-muted mt-4 leading-relaxed">
                        Note: {order.shipping_note}
                      </p>
                    )}
                    {order.tracking_url && (
                      <a
                        href={order.tracking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-6 inline-flex items-center gap-2 text-tiny font-mono uppercase tracking-[0.2em] text-gold underline decoration-gold/40 underline-offset-4 hover:text-text-main transition-colors"
                      >
                        Track Package <ArrowUpRight size={14} />
                      </a>
                    )}
                  </section>
                )}

              {/* Items */}
              <section className="border border-border rounded overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-dark-soft">
                  <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-text-main">
                    Items
                  </h2>
                </div>
                {(order.items ?? []).length > 0 ? (
                  (order.items ?? []).map((item, idx) => (
                    <div
                      key={idx}
                      className="px-6 py-4 border-b border-border/50 last:border-0 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-main truncate">
                          {item.course_id
                            ? "Course Enrollment"
                            : item.product_id
                              ? "Artwork"
                              : `Item #${item.id}`}
                        </p>
                        <p className="text-2xs font-mono text-text-muted mt-0.5 truncate">
                          {item.course_id ??
                            item.product_id ??
                            `ID: ${item.id}`}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-text-main">
                          {displayPrice(item.price)}
                        </p>
                        <p className="text-2xs font-mono text-text-muted">
                          QTY: {item.quantity}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-text-muted text-xs font-mono uppercase tracking-wider">
                    No items found for this order
                  </div>
                )}
              </section>

              {/* Summary */}
              <section className="border border-border rounded p-6 md:p-8 space-y-3 bg-dark-soft">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Items Total</span>
                  <span className="font-mono text-text-main">
                    {displayPrice(Number(order.total_amount) - 99)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Packaging</span>
                  <span className="font-mono text-text-main">
                    {displayPrice(99)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-border/50">
                  <span className="text-sm font-bold uppercase tracking-wider">
                    Total
                  </span>
                  <span className="text-lg font-bold text-gold font-mono">
                    {displayPrice(order.total_amount)}
                  </span>
                </div>
              </section>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/dashboard?tab=orders" className="flex-1">
                  <GhostBtn className="w-full justify-center py-4 text-xs">
                    VIEW ALL ORDERS
                  </GhostBtn>
                </Link>
                {(order.status === "shipped" || order.status === "delivered") &&
                  order.tracking_url && (
                  <a
                    href={order.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <PrimaryBtn className="w-full justify-center py-4 text-xs">
                      TRACK PACKAGE
                    </PrimaryBtn>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
