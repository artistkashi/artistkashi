import { cn } from "@/lib/utils";

interface OrderItem {
  item: string;
  type: string;
  date: string;
  amount: string;
  status: string;
}

interface OrderCardProps {
  order: OrderItem;
}

const statusStyles: Record<string, string> = {
  Active: "bg-green/10 text-green border border-green/30",
  Shipped: "bg-blue/10 text-blue border border-blue/30",
  Delivered: "bg-green/10 text-green border border-green/30",
  Cancelled: "bg-red/10 text-red border border-red/30",
  Pending: "bg-gold/10 text-gold border border-gold/30",
};

export function OrderCard({ order }: OrderCardProps) {
  return (
    <div className="border border-border bg-surface rounded p-5 space-y-3 md:hidden">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-text-main font-semibold text-sm truncate">
            {order.item}
          </div>
          <div className="text-text-muted text-xs font-mono mt-0.5">
            {order.type}
          </div>
        </div>
        <span
          className={cn(
            "text-tiny font-mono tracking-widest uppercase px-2.5 py-1 shrink-0",
            statusStyles[order.status] || "bg-text-muted/10 text-text-muted border border-text-muted/20"
          )}
        >
          {order.status}
        </span>
      </div>
      <div className="flex items-center justify-between pt-1 border-t border-border/50">
        <span className="text-label font-mono text-text-muted">{order.date}</span>
        <span className="text-text-main font-semibold">{order.amount}</span>
      </div>
    </div>
  );
}
