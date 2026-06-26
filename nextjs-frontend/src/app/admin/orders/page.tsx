"use client";

import { unwrap, unwrapPaginated } from "@/api/client-service";
import {
  AdminCoursePaymentRead,
  AdminOrderDetailRead,
  getOrderDetails,
  listCoursePayments,
  listOrders,
  OrderDashboardRead,
  OrderStatus,
  PaymentStatus,
  updateOrderStatus,
} from "@/api/openapi-client";
import { AnimatedCounter } from "@/components/dashboard/AnimatedCounter";
import { Skeleton } from "@/components/ui/Skeleton";
import { GhostBtn, PrimaryBtn } from "@/components/ui/buttons";
import { CustomSelect } from "@/components/ui/custom-select";
import { DataTable } from "@/components/ui/data-table";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { cn, displayPrice } from "@/lib/utils";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import ExcelJS from "exceljs";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  ImageIcon,
  RefreshCw,
  Search,
  ShoppingBag,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { LuxuryLoader } from "@/components/ui/LuxuryLoader";

// ─── Filter types ───────────────────────────────────────────────────────────

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

const PAYMENT_STATUSES: PaymentStatus[] = [
  "pending",
  "paid",
  "failed",
  "refunded",
];

interface OrderFilters {
  status: OrderStatus | "";
  paymentStatus: PaymentStatus | "";
  dateStart: string;
  dateEnd: string;
  minAmount: string;
  maxAmount: string;
}

const EMPTY_FILTERS: OrderFilters = {
  status: "",
  paymentStatus: "",
  dateStart: "",
  dateEnd: "",
  minAmount: "",
  maxAmount: "",
};

interface CpFilters {
  status: string;
  dateStart: string;
  dateEnd: string;
  minAmount: string;
  maxAmount: string;
}

const EMPTY_CP_FILTERS: CpFilters = {
  status: "",
  dateStart: "",
  dateEnd: "",
  minAmount: "",
  maxAmount: "",
};

const PAGE_SIZE_OPTIONS = [
  { value: 10, label: "10 per page" },
  { value: 25, label: "25 per page" },
  { value: 50, label: "50 per page" },
  { value: 75, label: "75 per page" },
  { value: 100, label: "100 per page" },
];

export default function AdminOrdersPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const [filters, setFilters] = useState<OrderFilters>(EMPTY_FILTERS);

  const [selectedOrder, setSelectedOrder] =
    useState<AdminOrderDetailRead | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"orders" | "course-payments">(
    "orders"
  );
  const queryClient = useQueryClient();

  const [cpPage, setCpPage] = useState(1);
  const [cpSearchInput, setCpSearchInput] = useState("");
  const [cpSearch, setCpSearch] = useState("");
  const [cpFilters, setCpFilters] = useState<CpFilters>(EMPTY_CP_FILTERS);
  const [isCpFilterModalOpen, setIsCpFilterModalOpen] = useState(false);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin", "orders", page, pageSize, search, filters],
    queryFn: () =>
      unwrapPaginated(
        listOrders({
          query: {
            page,
            page_size: pageSize,
            search: search || undefined,
            status: filters.status || undefined,
            payment_status: filters.paymentStatus || undefined,
            date_start: filters.dateStart
              ? new Date(filters.dateStart).toISOString()
              : undefined,
            date_end: filters.dateEnd
              ? new Date(filters.dateEnd).toISOString()
              : undefined,
            min_amount: filters.minAmount
              ? Number(filters.minAmount)
              : undefined,
            max_amount: filters.maxAmount
              ? Number(filters.maxAmount)
              : undefined,
          },
        })
      ),
    placeholderData: keepPreviousData,
  });

  const { data: coursePaymentsData, isLoading: cpLoading } = useQuery({
    queryKey: [
      "admin",
      "course-payments",
      cpPage,
      pageSize,
      cpSearch,
      cpFilters,
    ],
    queryFn: () =>
      unwrapPaginated(
        listCoursePayments({
          query: {
            page: cpPage,
            page_size: pageSize,
            search: cpSearch || undefined,
            status: cpFilters.status || undefined,
            date_start: cpFilters.dateStart
              ? new Date(cpFilters.dateStart).toISOString()
              : undefined,
            date_end: cpFilters.dateEnd
              ? new Date(cpFilters.dateEnd).toISOString()
              : undefined,
            min_amount: cpFilters.minAmount
              ? Number(cpFilters.minAmount)
              : undefined,
            max_amount: cpFilters.maxAmount
              ? Number(cpFilters.maxAmount)
              : undefined,
          },
        })
      ),
    placeholderData: keepPreviousData,
    enabled: activeTab === "course-payments",
  });

  const handleViewDetails = async (orderId: string) => {
    try {
      const details = await unwrap(
        getOrderDetails({ path: { order_id: orderId } })
      );
      setSelectedOrder(details);
      setIsDetailsOpen(true);
    } catch (err) {
      console.error("Failed to fetch order details", err);
    }
  };

  const statusMutation = useMutation({
    mutationFn: ({
      orderId,
      status,
    }: {
      orderId: string;
      status: OrderStatus;
    }) =>
      unwrap(
        updateOrderStatus({ path: { order_id: orderId }, body: { status } })
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      setIsDetailsOpen(false);
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : "Failed to update status";
      toast.error(message);
    },
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
  };

  const handleExport = async () => {
    try {
      toast.loading("Preparing manifest...", { id: "export-manifest" });

      const exportData = await unwrapPaginated(
        listOrders({
          query: {
            page: 1,
            page_size: 1000,
            search: search || undefined,
            status: filters.status || undefined,
            payment_status: filters.paymentStatus || undefined,
            date_start: filters.dateStart
              ? new Date(filters.dateStart).toISOString()
              : undefined,
            date_end: filters.dateEnd
              ? new Date(filters.dateEnd).toISOString()
              : undefined,
            min_amount: filters.minAmount
              ? Number(filters.minAmount)
              : undefined,
            max_amount: filters.maxAmount
              ? Number(filters.maxAmount)
              : undefined,
          },
        })
      );

      // Fetch absolute total for "Total Orders" summary
      const totalDBData = await unwrapPaginated(
        listOrders({
          query: {
            page: 1,
            page_size: 1,
          },
        })
      );
      const totalDBOrders = totalDBData.pagination.total_items;

      const ordersToExport = exportData.data;
      if (!ordersToExport || ordersToExport.length === 0) {
        toast.error("No records found to export.", { id: "export-manifest" });
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Acquisition Manifest");

      // Set column widths
      worksheet.columns = [
        { header: "Order ID", key: "id", width: 40 },
        { header: "Customer Name", key: "name", width: 25 },
        { header: "Customer Email", key: "email", width: 35 },
        { header: "Date", key: "date", width: 22 },
        { header: "Item Count", key: "itemCount", width: 18 },
        { header: "Total Amount", key: "amount", width: 18 },
        { header: "Payment Status", key: "paymentStatus", width: 18 },
        { header: "Order Status", key: "orderStatus", width: 18 },
      ];

      // Top Section styling
      worksheet.mergeCells("A1:H1");
      const titleCell = worksheet.getCell("A1");
      titleCell.value = "ARTISTKASHI";
      titleCell.font = { bold: true, size: 24, color: { argb: "FFB89D5C" } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };

      worksheet.mergeCells("A2:H2");
      const subTitleCell = worksheet.getCell("A2");
      subTitleCell.value = "ACQUISITION MANIFEST";
      subTitleCell.font = { bold: true, size: 16, color: { argb: "FF8B8B8B" } };
      subTitleCell.alignment = { horizontal: "center", vertical: "middle" };

      // Compact Executive Summary
      // Row 4
      worksheet.getCell("A4").value = "Generated:";
      worksheet.getCell("A4").font = { bold: true };
      worksheet.getCell("B4").value = format(new Date(), "dd MMM yyyy, HH:mm");

      worksheet.getCell("E4").value = "Exported Records:";
      worksheet.getCell("E4").font = { bold: true };
      worksheet.getCell("F4").value = ordersToExport.length;

      // Row 5
      const totalRevenue = ordersToExport.reduce(
        (acc, o) => acc + Number(o.total_amount || 0),
        0
      );
      worksheet.getCell("A5").value = "Revenue:";
      worksheet.getCell("A5").font = { bold: true };
      worksheet.getCell("B5").value = totalRevenue;
      worksheet.getCell("B5").numFmt = '"₹ "#,##0.00';

      worksheet.getCell("E5").value = "Total Orders:";
      worksheet.getCell("E5").font = { bold: true };
      worksheet.getCell("F5").value = totalDBOrders;

      // Row 6
      worksheet.getCell("A6").value = "Generated By:";
      worksheet.getCell("A6").font = { bold: true };
      worksheet.getCell("B6").value = "ArtistKashi Admin Panel";

      worksheet.getCell("E6").value = "Filtered Records:";
      worksheet.getCell("E6").font = { bold: true };
      worksheet.getCell("F6").value =
        `${ordersToExport.length} / ${totalDBOrders}`;

      // Table Header Row
      const headerRowIndex = 8;
      const headers = [
        "Order ID",
        "Customer Name",
        "Customer Email",
        "Date",
        "Item Count",
        "Total Amount",
        "Payment Status",
        "Order Status",
      ];

      const headerRow = worksheet.getRow(headerRowIndex);
      headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = h;
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFB89D5C" }, // Gold
        };
        cell.font = {
          color: { argb: "FFFFFFFF" }, // White
          bold: true,
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
          top: { style: "medium" },
          left: { style: "medium" },
          bottom: { style: "medium" },
          right: { style: "medium" },
        };
      });
      headerRow.height = 30;

      // Add Data
      ordersToExport.forEach((order, index) => {
        const rowIndex = headerRowIndex + 1 + index;
        const row = worksheet.getRow(rowIndex);

        row.values = [
          order.id,
          order.user?.full_name || "Guest Acquirer",
          order.user?.email || "N/A",
          format(new Date(order.created_at), "dd MMM yyyy, HH:mm"),
          order.item_count,
          Number(order.total_amount || 0),
          order.payment_status.toUpperCase(),
          order.status.toUpperCase(),
        ];

        // Global row styling
        row.height = 25;
        row.alignment = { vertical: "middle" };

        // Specific Column Alignments
        row.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
        row.getCell(2).alignment = { horizontal: "left", vertical: "middle" };
        row.getCell(3).alignment = { horizontal: "left", vertical: "middle" };
        row.getCell(4).alignment = { horizontal: "left", vertical: "middle" };
        row.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
        row.getCell(6).alignment = { horizontal: "right", vertical: "middle" };
        row.getCell(7).alignment = { horizontal: "center", vertical: "middle" };
        row.getCell(8).alignment = { horizontal: "center", vertical: "middle" };

        // Currency Format
        row.getCell(6).numFmt = '"₹ "#,##0.00';

        // Payment Status Colors
        const pStatus = order.payment_status.toLowerCase();
        const pCell = row.getCell(7);
        if (pStatus === "paid") {
          pCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE6F4EA" },
          }; // Light Green
          pCell.font = { color: { argb: "FF1E8E3E" }, bold: true }; // Dark Green
        } else if (pStatus === "pending") {
          pCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFEF7E0" },
          }; // Light Amber
          pCell.font = { color: { argb: "FFD97706" }, bold: true }; // Amber
        } else if (pStatus === "failed") {
          pCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFCE8E6" },
          }; // Light Red
          pCell.font = { color: { argb: "FFD93025" }, bold: true }; // Red
        } else if (pStatus === "refunded") {
          pCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE8EAF6" },
          }; // Light Indigo
          pCell.font = { color: { argb: "FF3F51B5" }, bold: true }; // Indigo
        }

        // Order Status Colors
        const oStatus = order.status.toLowerCase();
        const oCell = row.getCell(8);
        if (oStatus === "delivered") {
          oCell.font = { color: { argb: "FF1E8E3E" }, bold: true };
        } else if (oStatus === "confirmed") {
          oCell.font = { color: { argb: "FF1967D2" }, bold: true };
        } else if (oStatus === "shipped") {
          oCell.font = { color: { argb: "FF3F51B5" }, bold: true };
        } else if (oStatus === "pending") {
          oCell.font = { color: { argb: "FFD97706" }, bold: true };
        } else if (oStatus === "cancelled") {
          oCell.font = { color: { argb: "FFD93025" }, bold: true };
        }
      });

      // Freeze header row
      worksheet.views = [
        { state: "frozen", xSplit: 0, ySplit: headerRowIndex },
      ];

      // Enable Auto Filter
      worksheet.autoFilter = {
        from: { row: headerRowIndex, column: 1 },
        to: { row: headerRowIndex + ordersToExport.length, column: 8 },
      };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `ArtistKashi_Acquisition_Manifest_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Manifest exported successfully.", {
        id: "export-manifest",
      });
    } catch (err) {
      console.error("Export failed", err);
      toast.error("Failed to export manifest.", { id: "export-manifest" });
    }
  };

  const handleCpRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "course-payments"] });
  };

  const handleCpExport = async () => {
    try {
      toast.loading("Preparing payments export...", { id: "export-cp" });
      const allData = await unwrapPaginated(
        listCoursePayments({
          query: {
            page: 1,
            page_size: 1000,
            search: cpSearch || undefined,
            status: cpFilters.status || undefined,
            date_start: cpFilters.dateStart
              ? new Date(cpFilters.dateStart).toISOString()
              : undefined,
            date_end: cpFilters.dateEnd
              ? new Date(cpFilters.dateEnd).toISOString()
              : undefined,
            min_amount: cpFilters.minAmount
              ? Number(cpFilters.minAmount)
              : undefined,
            max_amount: cpFilters.maxAmount
              ? Number(cpFilters.maxAmount)
              : undefined,
          },
        })
      );
      const exportData = allData.data || [];
      if (exportData.length === 0) {
        toast.error("No payments to export.", { id: "export-cp" });
        return;
      }
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Course Payments");
      worksheet.columns = [
        { header: "Payment ID", key: "id", width: 40 },
        { header: "Course", key: "course", width: 35 },
        { header: "Customer", key: "customer", width: 25 },
        { header: "Email", key: "email", width: 35 },
        { header: "Amount", key: "amount", width: 18 },
        { header: "Status", key: "status", width: 18 },
        { header: "Date", key: "date", width: 22 },
      ];
      worksheet.mergeCells("A1:G1");
      worksheet.getCell("A1").value = "ARTISTKASHI - COURSE PAYMENTS";
      worksheet.getCell("A1").font = { bold: true, size: 18 };
      worksheet.getCell("A1").alignment = { horizontal: "center" };
      const headerRowIndex = 3;
      const headerRow = worksheet.getRow(headerRowIndex);
      [
        "Payment ID",
        "Course",
        "Customer",
        "Email",
        "Amount",
        "Status",
        "Date",
      ].forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = h;
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFB89D5C" },
        };
        cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });
      exportData.forEach((p, idx) => {
        const row = worksheet.getRow(headerRowIndex + 1 + idx);
        row.values = [
          p.id,
          p.course_title || "N/A",
          p.user_full_name || "Unknown",
          p.user_email || "",
          Number(p.amount),
          p.status.toUpperCase(),
          format(new Date(p.created_at), "dd MMM yyyy"),
        ];
        row.getCell(5).numFmt = '"₹ "#,##0.00';
      });
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer]);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `CoursePayments_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`;
      link.click();
      toast.success("Payments exported.", { id: "export-cp" });
    } catch (err) {
      console.error("CP export failed", err);
      toast.error("Export failed.", { id: "export-cp" });
    }
  };

  const orders = data?.data || [];
  const isDataLoading = isLoading || isFetching;

  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== ""
  ).length;

  const cpActiveFilterCount = Object.values(cpFilters).filter(
    (v) => v !== ""
  ).length;

  const desktopColumns: ColumnDef<OrderDashboardRead>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "Order ID",
        cell: ({ row }) => (
          <span className="text-text-muted font-mono text-label uppercase tracking-tighter truncate block">
            #{row.original.id.slice(0, 8)}
          </span>
        ),
      },
      {
        accessorKey: "user",
        header: "Customer",
        cell: ({ row }) => {
          const user = row.original.user;
          return (
            <div className="text-center">
              <p className="text-text-main font-bold uppercase tracking-tight text-xs truncate">
                {user?.full_name || "Guest Acquirer"}
              </p>
              <p className="text-2xs text-text-muted font-mono lowercase truncate">
                {user?.email || "No email provided"}
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: "Created Date",
        cell: ({ row }) => (
          <div className="text-text-muted font-mono text-label whitespace-nowrap text-center">
            <p>{format(new Date(row.original.created_at), "dd-MM-yyyy")}</p>
            <p className="text-center">
              {format(new Date(row.original.created_at), "HH:mm")}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "item_count",
        header: "Item Count",
        cell: ({ row }) => (
          <div className="text-center">
            <span className="text-xs text-text-main font-mono px-2 py-1 bg-dark/40 border border-border/40 rounded-sm whitespace-nowrap">
              {row.original.item_count} ITM
            </span>
          </div>
        ),
      },
      {
        accessorKey: "total_amount",
        header: "Total Amount",
        cell: ({ row }) => (
          <div className="text-right text-gold font-bold font-mono tracking-tighter text-base whitespace-nowrap">
            {displayPrice(row.original.total_amount)}
          </div>
        ),
      },
      {
        accessorKey: "payment_status",
        header: "Payment Status",
        cell: ({ row }) => (
          <div className="flex justify-center">
            <PaymentStatusBadge status={row.original.payment_status} />
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Order Status",
        cell: ({ row }) => (
          <div className="flex justify-center">
            <OrderStatusBadge status={row.original.status} />
          </div>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex justify-center">
            <button
              onClick={() => handleViewDetails(row.original.id)}
              className="p-2 bg-dark/60 border border-border/60 text-text-muted hover:text-gold hover:border-gold/40 transition-all rounded-sm inline-flex items-center justify-center"
              title="View Details"
            >
              <Eye size={16} />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const tabletColumns: ColumnDef<OrderDashboardRead>[] = useMemo(
    () => [
      {
        accessorKey: "user",
        header: "Customer",
        cell: ({ row }) => {
          const order = row.original;
          const user = order.user;
          return (
            <div className="space-y-3">
              <div>
                <p className="text-text-main font-bold uppercase tracking-tight text-xs truncate">
                  {user?.full_name || "Guest Acquirer"}
                </p>
                <p className="text-2xs text-text-muted font-mono lowercase truncate">
                  {user?.email || "No email provided"}
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2 border-t border-border/10">
                <span className="text-text-muted font-mono text-2xs uppercase tracking-tighter">
                  #{order.id.slice(0, 8)}
                </span>
                <span className="text-text-muted font-mono text-2xs uppercase">
                  {format(new Date(order.created_at), "dd MMM yyyy")}
                </span>
                <PaymentStatusBadge status={order.payment_status} />
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "total_amount",
        header: "Amount",
        cell: ({ row }) => (
          <div className="text-right text-gold font-bold font-mono tracking-tighter text-base">
            {displayPrice(row.original.total_amount)}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <div className="flex justify-center">
            <OrderStatusBadge status={row.original.status} />
          </div>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex justify-center">
            <button
              onClick={() => handleViewDetails(row.original.id)}
              className="p-3 bg-dark/60 border border-border/60 text-text-muted hover:text-gold hover:border-gold/40 transition-all rounded-sm"
            >
              <Eye size={18} />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const cpDesktopColumns: ColumnDef<AdminCoursePaymentRead>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: () => (
          <div className="text-left">
            <span>Payment ID</span>
          </div>
        ),
        cell: ({ row }) => (
          <span className="text-text-muted font-mono text-label uppercase tracking-tighter truncate block">
            #{row.original.id.slice(0, 8)}
          </span>
        ),
      },
      {
        id: "course",
        header: () => (
          <div className="text-left">
            <span>Course</span>
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-left">
            <p className="text-text-main font-bold uppercase tracking-tight text-xs truncate">
              {row.original.course_title || "N/A"}
            </p>
          </div>
        ),
      },
      {
        id: "customer",
        header: () => (
          <div className="text-center">
            <span>Customer</span>
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-center">
            <p className="text-text-main font-bold uppercase tracking-tight text-xs truncate">
              {row.original.user_full_name || "Unknown"}
            </p>
            <p className="text-2xs text-text-muted font-mono lowercase truncate">
              {row.original.user_email || ""}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "amount",
        header: () => (
          <div className="text-right">
            <span>Amount</span>
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-right text-gold font-bold font-mono tracking-tighter text-base whitespace-nowrap">
            {displayPrice(row.original.amount)}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: () => (
          <div className="text-center">
            <span>Status</span>
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex justify-center">
            <CpStatusBadge status={row.original.status} />
          </div>
        ),
      },
      {
        accessorKey: "created_at",
        header: () => (
          <div className="text-center">
            <span>Date</span>
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-text-muted font-mono text-label whitespace-nowrap text-center">
            {format(new Date(row.original.created_at), "dd-MM-yyyy")}
          </div>
        ),
      },
    ],
    []
  );

  const cpTabletColumns: ColumnDef<AdminCoursePaymentRead>[] = useMemo(
    () => [
      {
        id: "course_customer",
        header: () => (
          <div className="text-left">
            <span>Course / Customer</span>
          </div>
        ),
        cell: ({ row }) => (
          <div className="space-y-3">
            <div>
              <p className="text-text-main font-bold uppercase tracking-tight text-xs">
                {row.original.course_title || "N/A"}
              </p>
              <p className="text-2xs text-text-muted font-mono lowercase">
                {row.original.user_full_name || "Unknown"} ·{" "}
                {row.original.user_email || ""}
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2 border-t border-border/10">
              <span className="text-text-muted font-mono text-2xs">
                #{row.original.id.slice(0, 8)}
              </span>
              <CpStatusBadge status={row.original.status} />
            </div>
          </div>
        ),
      },
      {
        accessorKey: "amount",
        header: () => (
          <div className="text-right">
            <span>Amount</span>
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-right text-gold font-bold font-mono tracking-tighter text-base">
            {displayPrice(row.original.amount)}
          </div>
        ),
      },
      {
        accessorKey: "created_at",
        header: () => (
          <div className="text-center">
            <span>Date</span>
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-text-muted font-mono text-label whitespace-nowrap text-center">
            {format(new Date(row.original.created_at), "dd MMM yyyy")}
          </div>
        ),
      },
    ],
    []
  );

  const cpPayments = coursePaymentsData?.data || [];

  return (
    <div className="lg:h-[calc(100vh-164px)] flex flex-col space-y-6 lg:overflow-hidden pb-10 lg:pb-0">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 shrink-0 px-1 pt-4 lg:pt-0">
        <div>
          <h1 className="text-4xl font-black text-text-main tracking-tighter uppercase leading-none">
            Acquisition <span className="text-gold italic">Archive</span>
          </h1>
          <div className="flex items-center gap-6 mt-4">
            <button
              onClick={() => setActiveTab("orders")}
              className={cn(
                "text-xs font-mono uppercase tracking-[0.2em] pb-2 border-b-2 transition-all",
                activeTab === "orders"
                  ? "text-gold border-gold"
                  : "text-text-muted border-transparent hover:text-text-main"
              )}
            >
              Orders
            </button>
            <button
              onClick={() => setActiveTab("course-payments")}
              className={cn(
                "text-xs font-mono uppercase tracking-[0.2em] pb-2 border-b-2 transition-all",
                activeTab === "course-payments"
                  ? "text-gold border-gold"
                  : "text-text-muted border-transparent hover:text-text-main"
              )}
            >
              Course Payments
            </button>
          </div>
          <p className="text-text-muted text-xs mt-3 uppercase font-mono tracking-[0.3em] flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-gold rounded-full animate-pulse" />
            {activeTab === "orders" ? (
              <>
                Total Orders:{" "}
                <AnimatedCounter
                  target={data?.pagination.total_items || 0}
                  fontSize={16}
                />{" "}
                Records
              </>
            ) : (
              <>
                Total Payments:{" "}
                <AnimatedCounter
                  target={coursePaymentsData?.pagination.total_items || 0}
                  fontSize={16}
                />{" "}
                Records
              </>
            )}
          </p>
        </div>
        {activeTab === "orders" ? (
          <div className="flex items-center justify-end gap-4 w-full md:w-auto">
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
            <GhostBtn
              onClick={handleExport}
              className="px-6 py-3 text-2xs flex items-center gap-2 border-border/40 hover:border-gold/50 tracking-widest transition-all"
            >
              <Download size={14} /> EXPORT MANIFEST
            </GhostBtn>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-4 w-full md:w-auto">
            <button
              onClick={handleCpRefresh}
              disabled={cpLoading}
              className="p-3 bg-dark border border-border/40 text-text-muted hover:text-gold hover:border-gold/40 transition-all rounded-sm disabled:opacity-50 group"
              title="Refresh Payments"
            >
              <RefreshCw
                size={16}
                className={cn(cpLoading && "animate-spin")}
              />
            </button>
            <GhostBtn
              onClick={handleCpExport}
              className="px-6 py-3 text-2xs flex items-center gap-2 border-border/40 hover:border-gold/50 tracking-widest transition-all"
            >
              <Download size={14} /> EXPORT PAYMENTS
            </GhostBtn>
          </div>
        )}
      </div>

      {activeTab === "orders" ? (
        <>
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
                className="w-full focus:border-gold/50! px-14 py-4 text-sm text-text-main outline-none placeholder:text-text-muted/50 transition-all rounded-sm backdrop-blur-sm glass-input"
              />
            </div>

            <button
              onClick={() => setIsFilterModalOpen(true)}
              className={cn(
                "flex items-center justify-center gap-3 px-5 lg:px-8 py-4 border rounded-sm transition-all font-mono text-xs uppercase tracking-widest min-w-14 glass-input",
                activeFilterCount > 0
                  ? "bg-gold/10! border-gold! text-gold"
                  : "bg-surface/50 border-border/60 text-text-muted hover:border-gold/30! hover:text-text-main"
              )}
              title="Toggle Filters"
            >
              <Filter size={16} />
              <span className="hidden lg:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="lg:ml-1 bg-gold text-dark px-1.5 py-0.5 rounded-full text-2xs font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 lg:overflow-y-auto lg:custom-scrollbar px-1 relative group">
            {/* Progress Loading Overlay (Shared) */}
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

            {/* Desktop Data Table (1024px+) */}
            <div className="hidden lg:block">
              <DataTable
                columns={desktopColumns}
                data={orders}
                isLoading={isDataLoading}
              />
            </div>

            {/* Tablet Compact Table (768px - 1024px) */}
            <div className="hidden md:block lg:hidden">
              <DataTable
                columns={tabletColumns}
                data={orders}
                isLoading={isDataLoading}
              />
            </div>

            {/* Mobile Card Layout (<768px) */}
            <div className="md:hidden space-y-6">
              {orders.length === 0 && !isDataLoading ? (
                <div className="p-20 text-center bg-surface/30 border border-border/60 rounded-sm">
                  <div className="flex flex-col items-center gap-4 opacity-40">
                    <ShoppingBag size={40} className="text-text-muted" />
                    <p className="text-xs font-mono text-text-muted uppercase tracking-[0.2em]">
                      No records found.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-6">
                  {orders.map((order) => (
                    <MobileOrderCard
                      key={order.id}
                      order={order}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Course Payments View */
        <>
          {/* Search & Filter Bar */}
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
                value={cpSearchInput}
                onChange={(e) => {
                  setCpSearchInput(e.target.value);
                  if (e.target.value === "") {
                    setCpSearch("");
                    setCpPage(1);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setCpSearch(cpSearchInput);
                    setCpPage(1);
                  }
                }}
                placeholder="Search payments by course, customer, or order ID..."
                className="w-full focus:border-gold/50! px-14 py-4 text-sm text-text-main outline-none placeholder:text-text-muted/50 transition-all rounded-sm backdrop-blur-sm glass-input"
              />
            </div>
            <button
              onClick={() => setIsCpFilterModalOpen(true)}
              className={cn(
                "flex items-center justify-center gap-3 px-5 lg:px-8 py-4 border rounded-sm transition-all font-mono text-xs uppercase tracking-widest min-w-14 glass-input",
                cpActiveFilterCount > 0
                  ? "bg-gold/10! border-gold! text-gold"
                  : "bg-surface/50 border-border/60 text-text-muted hover:border-gold/30! hover:text-text-main"
              )}
              title="Toggle Filters"
            >
              <Filter size={16} />
              <span className="hidden lg:inline">Filters</span>
              {cpActiveFilterCount > 0 && (
                <span className="lg:ml-1 bg-gold text-dark px-1.5 py-0.5 rounded-full text-2xs font-bold">
                  {cpActiveFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1 lg:overflow-y-auto lg:custom-scrollbar px-1 relative group">
            {/* Desktop skeleton */}
            <div className="hidden lg:block">
              {cpPayments.length === 0 && cpLoading ? (
                <div className="rounded-sm border border-border/60 bg-surface/30 backdrop-blur-md overflow-hidden">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="border-b border-border/40 bg-dark/40">
                      <tr>
                        {[
                          "Payment ID",
                          "Course",
                          "Customer",
                          "Amount",
                          "Status",
                          "Date",
                        ].map((h) => (
                          <th
                            key={h}
                            className="py-3 px-8 text-left align-middle font-mono text-[6px] text-text-muted/60 tracking-[0.3em] uppercase"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/10">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <tr
                          key={i}
                          className="transition-all duration-300 border-l-2 border-l-transparent"
                        >
                          <td className="px-8 py-2 align-middle">
                            <Skeleton className="h-4 w-20" />
                          </td>
                          <td className="px-8 py-2 align-middle">
                            <Skeleton className="h-4 w-36" />
                          </td>
                          <td className="px-8 py-2 align-middle">
                            <div className="flex flex-col items-center gap-1.5">
                              <Skeleton className="h-3.5 w-28" />
                              <Skeleton className="h-3 w-20" />
                            </div>
                          </td>
                          <td className="px-8 py-2 align-middle">
                            <div className="flex justify-end">
                              <Skeleton className="h-4 w-16" />
                            </div>
                          </td>
                          <td className="px-8 py-2 align-middle">
                            <div className="flex justify-center">
                              <Skeleton className="h-5 w-14 rounded-full" />
                            </div>
                          </td>
                          <td className="px-8 py-2 align-middle">
                            <div className="flex justify-center">
                              <Skeleton className="h-4 w-16" />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : cpPayments.length === 0 && !cpLoading ? (
                <div className="p-20 text-center bg-surface/30 border border-border/60 rounded-sm">
                  <div className="flex flex-col items-center gap-4 opacity-40">
                    <ShoppingBag size={40} className="text-text-muted" />
                    <p className="text-xs font-mono text-text-muted uppercase tracking-[0.2em]">
                      No course payments found.
                    </p>
                  </div>
                </div>
              ) : (
                <DataTable
                  columns={cpDesktopColumns}
                  data={cpPayments}
                  isLoading={cpLoading}
                />
              )}
            </div>

            {/* Tablet skeleton */}
            <div className="hidden md:block lg:hidden">
              {cpPayments.length === 0 && cpLoading ? (
                <div className="rounded-sm border border-border/60 bg-surface/30 backdrop-blur-md overflow-hidden">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="border-b border-border/40 bg-dark/40">
                      <tr>
                        {["Course / Customer", "Amount", "Date"].map((h) => (
                          <th
                            key={h}
                            className="py-3 px-8 text-left align-middle font-mono text-[6px] text-text-muted/60 tracking-[0.3em] uppercase"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/10">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <tr
                          key={i}
                          className="transition-all duration-300 border-l-2 border-l-transparent"
                        >
                          <td className="px-8 py-2 align-middle">
                            <div className="space-y-3">
                              <div className="space-y-1.5">
                                <Skeleton className="h-3.5 w-40" />
                                <Skeleton className="h-3 w-32" />
                              </div>
                              <div className="flex items-center gap-3 pt-2 border-t border-border/10">
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-5 w-14 rounded-full" />
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-2 align-middle">
                            <div className="flex justify-end">
                              <Skeleton className="h-4 w-16" />
                            </div>
                          </td>
                          <td className="px-8 py-2 align-middle">
                            <div className="flex justify-center">
                              <Skeleton className="h-4 w-20" />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : cpPayments.length === 0 && !cpLoading ? (
                <div className="p-20 text-center bg-surface/30 border border-border/60 rounded-sm">
                  <div className="flex flex-col items-center gap-4 opacity-40">
                    <ShoppingBag size={40} className="text-text-muted" />
                    <p className="text-xs font-mono text-text-muted uppercase tracking-[0.2em]">
                      No course payments found.
                    </p>
                  </div>
                </div>
              ) : (
                <DataTable
                  columns={cpTabletColumns}
                  data={cpPayments}
                  isLoading={cpLoading}
                />
              )}
            </div>

            {/* Mobile skeleton */}
            <div className="md:hidden space-y-6">
              {cpPayments.length === 0 && cpLoading ? (
                <div className="grid gap-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="group relative bg-surface border border-border shadow-md overflow-hidden rounded-sm"
                    >
                      <div className="px-6 py-4 border-b border-border/90 bg-dark/20 flex justify-between items-center">
                        <Skeleton className="h-3.5 w-28" />
                        <Skeleton className="h-2 w-2 rounded-full" />
                      </div>
                      <div className="p-6 space-y-6">
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-36" />
                        </div>
                        <div className="flex items-center justify-between py-4 border-y border-border/5">
                          <div className="space-y-1">
                            <Skeleton className="h-3 w-12" />
                            <Skeleton className="h-6 w-20" />
                          </div>
                          <Skeleton className="h-5 w-16 rounded-full" />
                        </div>
                        <div className="flex justify-between items-end pt-2">
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : cpPayments.length === 0 && !cpLoading ? (
                <div className="p-20 text-center bg-surface/30 border border-border/60 rounded-sm">
                  <div className="flex flex-col items-center gap-4 opacity-40">
                    <ShoppingBag size={40} className="text-text-muted" />
                    <p className="text-xs font-mono text-text-muted uppercase tracking-[0.2em]">
                      No course payments found.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-6">
                  {cpPayments.map((payment) => (
                    <MobileCpCard key={payment.id} payment={payment} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Advanced Pagination */}
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
                if (activeTab === "orders") setPage(1);
                else setCpPage(1);
              }}
              placeholder="10"
              className="w-28 h-8"
              dropdownPosition="top"
              buttonClassName="py-2"
            />
          </div>
          <div className="hidden sm:block h-4 w-px bg-border/40" />
          <div className="flex items-center gap-4 lg:gap-6 justify-center">
            <div className="flex items-center gap-2">
              <p className="text-2xs font-mono text-text-muted uppercase tracking-widest whitespace-nowrap">
                Showing{" "}
                {activeTab === "orders" ? orders.length : cpPayments.length} of{" "}
                {activeTab === "orders"
                  ? data?.pagination.total_items || 0
                  : coursePaymentsData?.pagination.total_items || 0}
              </p>
            </div>
            <div className="hidden md:block h-4 w-px bg-border/40" />
            <div className="flex items-center gap-2">
              <p className="text-2xs font-mono text-text-muted uppercase tracking-widest whitespace-nowrap">
                Page {activeTab === "orders" ? page : cpPage} of{" "}
                {activeTab === "orders"
                  ? data?.pagination.total_pages || 1
                  : coursePaymentsData?.pagination.total_pages || 1}
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
                max={
                  activeTab === "orders"
                    ? data?.pagination.total_pages || 1
                    : coursePaymentsData?.pagination.total_pages || 1
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = Number(e.currentTarget.value);
                    const max =
                      activeTab === "orders"
                        ? data?.pagination.total_pages || 1
                        : coursePaymentsData?.pagination.total_pages || 1;
                    if (val >= 1 && val <= max) {
                      if (activeTab === "orders") setPage(val);
                      else setCpPage(val);
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
            disabled={activeTab === "orders" ? page === 1 : cpPage === 1}
            onClick={() => {
              if (activeTab === "orders") setPage((p) => p - 1);
              else setCpPage((p) => p - 1);
            }}
            className="flex-none px-4 py-2 bg-dark border border-border/60 text-2xs font-mono uppercase tracking-widest hover:border-gold disabled:opacity-20 disabled:hover:border-border transition-all rounded-sm active:scale-95 flex items-center justify-center gap-2"
          >
            <ChevronLeft size={14} />{" "}
            <span className="hidden sm:inline">Prev</span>
          </button>
          <button
            disabled={
              activeTab === "orders"
                ? !data?.pagination.has_next
                : !coursePaymentsData?.pagination.has_next
            }
            onClick={() => {
              if (activeTab === "orders") setPage((p) => p + 1);
              else setCpPage((p) => p + 1);
            }}
            className="flex-none px-4 py-2 bg-dark border border-border/60 text-2xs font-mono uppercase tracking-widest hover:border-gold disabled:opacity-20 disabled:hover:border-border transition-all rounded-sm active:scale-95 flex items-center justify-center gap-2"
          >
            <span className="hidden sm:inline">Next</span>{" "}
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Filter Sidebar (Orders) */}
      <AnimatePresence>
        {isFilterModalOpen && (
          <FilterSidebar
            isOpen={isFilterModalOpen}
            onClose={() => setIsFilterModalOpen(false)}
            filters={filters}
            onApply={(newFilters) => {
              setFilters(newFilters);
              setPage(1);
              setIsFilterModalOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Filter Sidebar (Course Payments) */}
      <AnimatePresence>
        {isCpFilterModalOpen && (
          <CpFilterSidebar
            isOpen={isCpFilterModalOpen}
            onClose={() => setIsCpFilterModalOpen(false)}
            filters={cpFilters}
            onApply={(newFilters) => {
              setCpFilters(newFilters);
              setCpPage(1);
              setIsCpFilterModalOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Detail Slide-over */}
      <AnimatePresence>
        {isDetailsOpen && selectedOrder && (
          <OrderDetailsModal
            order={selectedOrder}
            onClose={() => setIsDetailsOpen(false)}
            onUpdateStatus={(status) =>
              statusMutation.mutate({ orderId: selectedOrder.id, status })
            }
            isUpdating={statusMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Mobile Order Card ──────────────────────────────────────────────────────

function MobileOrderCard({
  order,
  onViewDetails,
}: {
  order: OrderDashboardRead;
  onViewDetails: (id: string) => void;
}) {
  return (
    <div className="group relative bg-surface border border-border shadow-md overflow-hidden rounded-sm transition-all duration-500 hover:border-gold/40">
      {/* Decorative Accent */}
      {/* <div className="absolute top-0 left-0 w-1 h-full bg-gold/10 group-hover:bg-gold/40 transition-colors" /> */}

      {/* Header - Acquisition ID */}
      <div className="px-6 py-4 border-b border-border/90 bg-dark/20 flex justify-between items-center">
        <span className="text-2xs font-mono text-gold uppercase tracking-[0.3em] font-bold">
          Acquisition #{order.id.slice(0, 8)}
        </span>
        <div className="w-1.5 h-1.5 rounded-full bg-gold/30 group-hover:bg-gold group-hover:animate-pulse transition-all" />
      </div>

      <div className="p-6 space-y-6">
        {/* Customer Info */}
        <div className="space-y-1">
          <h4 className="text-sm font-black text-text-main uppercase tracking-tight leading-tight">
            {order.user?.full_name || "Guest Acquirer"}
          </h4>
          <p className="text-2xs text-text-muted font-mono lowercase truncate opacity-70">
            {order.user?.email || "No digital provenance provided"}
          </p>
        </div>

        {/* Financial & Status Manifest */}
        <div className="flex items-center justify-between py-4 border-y border-border/5">
          <div className="space-y-1">
            <span className="text-[9px] font-mono text-text-muted/60 uppercase tracking-widest block">
              Total Valuation
            </span>
            <p className="text-2xl font-black text-gold font-mono tracking-tighter leading-none">
              {displayPrice(order.total_amount)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <PaymentStatusBadge status={order.payment_status} />
            <OrderStatusBadge status={order.status} />
          </div>
        </div>

        {/* Metadata Footer */}
        <div className="flex justify-between items-end pt-2">
          <div className="space-y-3">
            <div className="flex items-center gap-6">
              <div className="space-y-1">
                <span className="text-[8px] font-mono text-text-muted/40 uppercase tracking-widest block">
                  Timestamp
                </span>
                <p className="text-2xs font-mono text-text-main uppercase">
                  {format(new Date(order.created_at), "dd MMM yyyy")}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[8px] font-mono text-text-muted/40 uppercase tracking-widest block">
                  Manifest
                </span>
                <p className="text-2xs font-mono text-text-main uppercase">
                  {order.item_count} Items
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => onViewDetails(order.id)}
            className="px-6 py-2.5 bg-dark border border-border/60 text-text-muted hover:text-gold hover:border-gold/40 transition-all rounded-sm text-2xs font-mono uppercase tracking-[0.2em] font-bold flex items-center gap-2 group/btn active:scale-95"
          >
            Details{" "}
            <ArrowUpRight
              size={12}
              className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform"
            />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Filter sidebar ─────────────────────────────────────────────────────────

function FilterSidebar({
  isOpen,
  onClose,
  filters: currentFilters,
  onApply,
}: {
  isOpen: boolean;
  onClose: () => void;
  filters: OrderFilters;
  onApply: (f: OrderFilters) => void;
}) {
  const [tempFilters, setTempFilters] = useState<OrderFilters>(currentFilters);

  useEffect(() => {
    if (isOpen) setTempFilters(currentFilters);
  }, [isOpen, currentFilters]);

  const clear = () => setTempFilters(EMPTY_FILTERS);

  return (
    <div className="fixed inset-0 z-150 flex items-center justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/90 backdrop-blur-xl"
      />

      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative w-full max-w-md h-full bg-surface border-l border-border shadow-2xl flex flex-col"
      >
        <div className="px-8 py-6 border-b border-border/40 flex items-center justify-between bg-dark/40">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-text-main">
              Filter <span className="text-gold">Archive</span>
            </h2>
            <p className="text-2xs font-mono text-text-muted uppercase tracking-widest mt-1">
              Refine acquisition manifestation
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-gold transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          {/* Status Section */}
          <section className="space-y-4">
            <label className="text-2xs font-mono text-text-muted uppercase tracking-[0.2em] block font-bold">
              Current Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ORDER_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() =>
                    setTempFilters({
                      ...tempFilters,
                      status: s === tempFilters.status ? "" : s,
                    })
                  }
                  className={cn(
                    "px-3 py-2.5 text-2xs font-mono uppercase border transition-all rounded-sm text-left",
                    tempFilters.status === s
                      ? "bg-gold text-dark border-gold font-bold"
                      : "bg-dark/40 border-border/60 text-text-muted hover:border-gold/40"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </section>

          {/* Payment Section */}
          <section className="space-y-4">
            <label className="text-2xs font-mono text-text-muted uppercase tracking-[0.2em] block font-bold">
              Payment State
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() =>
                    setTempFilters({
                      ...tempFilters,
                      paymentStatus: s === tempFilters.paymentStatus ? "" : s,
                    })
                  }
                  className={cn(
                    "px-3 py-2.5 text-2xs font-mono uppercase border transition-all rounded-sm text-left",
                    tempFilters.paymentStatus === s
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 font-bold"
                      : "bg-dark/40 border-border/60 text-text-muted hover:border-gold/40"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </section>

          {/* Date Range Section */}
          <section className="space-y-4">
            <label className="text-2xs font-mono text-text-muted uppercase tracking-[0.2em] block font-bold">
              Temporal Boundary
            </label>
            <DatePickerWithRange
              date={
                tempFilters.dateStart
                  ? {
                      from: new Date(tempFilters.dateStart),
                      to: tempFilters.dateEnd
                        ? new Date(tempFilters.dateEnd)
                        : undefined,
                    }
                  : undefined
              }
              setDate={(range) => {
                setTempFilters({
                  ...tempFilters,
                  dateStart: range?.from
                    ? format(range.from, "yyyy-MM-dd")
                    : "",
                  dateEnd: range?.to ? format(range.to, "yyyy-MM-dd") : "",
                });
              }}
            />
          </section>

          {/* Valuation Section */}
          <section className="space-y-4 pt-2">
            <label className="text-2xs font-mono text-text-muted uppercase tracking-[0.2em] block font-bold">
              Valuation Range (₹)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                placeholder="MIN"
                value={tempFilters.minAmount}
                onChange={(e) =>
                  setTempFilters({ ...tempFilters, minAmount: e.target.value })
                }
                className="w-full bg-dark/40 border border-border/60 p-3 text-xs font-mono text-text-main outline-none focus:border-gold/40 placeholder:text-text-muted/30 rounded-sm"
              />
              <input
                type="number"
                placeholder="MAX"
                value={tempFilters.maxAmount}
                onChange={(e) =>
                  setTempFilters({ ...tempFilters, maxAmount: e.target.value })
                }
                className="w-full bg-dark/40 border border-border/60 p-3 text-xs font-mono text-text-main outline-none focus:border-gold/40 placeholder:text-text-muted/30 rounded-sm"
              />
            </div>
          </section>
        </div>

        <div className="p-8 bg-dark/40 border-t border-border/40 flex gap-3">
          <button
            onClick={clear}
            className="flex-1 px-4 py-4 text-2xs font-mono uppercase tracking-[0.3em] text-text-muted hover:text-text-main transition-colors border border-border/40 rounded-sm"
          >
            Reset
          </button>
          <PrimaryBtn
            onClick={() => onApply(tempFilters)}
            className="flex-2 justify-center py-4 text-2xs tracking-[0.4em] font-bold"
          >
            APPLY FILTERS
          </PrimaryBtn>
        </div>
      </motion.div>
    </div>
  );
}

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const styles: Record<OrderStatus, string> = {
    pending:
      "text-amber-500 border-amber-500/20 bg-amber-500/5 shadow-[0_0_10px_rgba(245,158,11,0.05)]",
    confirmed:
      "text-blue-500 border-blue-500/20 bg-blue-500/5 shadow-[0_0_10px_rgba(59,130,246,0.05)]",
    shipped:
      "text-indigo-500 border-indigo-500/20 bg-indigo-500/5 shadow-[0_0_10px_rgba(99,102,241,0.05)]",
    delivered:
      "text-emerald-500 border-emerald-500/20 bg-emerald-500/5 shadow-[0_0_10px_rgba(16,185,129,0.05)]",
    cancelled:
      "text-red-500 border-red-500/20 bg-red-500/5 shadow-[0_0_10px_rgba(239,68,68,0.05)]",
    // returned: "text-rose-500 border-rose-500/20 bg-rose-500/5",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center px-3 py-1 border rounded-full text-[9px] font-mono font-bold tracking-[0.2em] uppercase transition-all duration-500",
        styles[status] || styles.pending
      )}
    >
      <span className="w-1 h-1 rounded-full bg-current mr-2 animate-pulse" />
      {status}
    </div>
  );
}

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const styles: Record<PaymentStatus, string> = {
    pending: "text-amber-500 bg-amber-500/10",
    paid: "text-emerald-500 bg-emerald-500/10",
    failed: "text-red-500 bg-red-500/10",
    refunded: "text-indigo-500 bg-indigo-500/10",
  };

  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded text-2xs font-mono font-black uppercase tracking-tighter",
        styles[status] || styles.pending
      )}
    >
      {status}
    </span>
  );
}

// ─── Order details modal ────────────────────────────────────────────────────

function OrderDetailsModal({
  order,
  onClose,
  onUpdateStatus,
  isUpdating,
}: {
  order: AdminOrderDetailRead;
  onClose: () => void;
  onUpdateStatus: (status: OrderStatus) => void;
  isUpdating: boolean;
}) {
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null);
  const hasChanges = pendingStatus !== null && pendingStatus !== order.status;

  const VALID_TRANSITIONS: Record<string, string[]> = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["shipped", "cancelled"],
    shipped: ["delivered", "cancelled"],
    delivered: [],
    cancelled: [],
  };

  const allowedNext = VALID_TRANSITIONS[order.status] ?? [];

  const handleSave = () => {
    if (pendingStatus) {
      onUpdateStatus(pendingStatus);
      setPendingStatus(null);
    }
  };

  const currentStatus = pendingStatus ?? order.status;
  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #invoice-area { visibility: visible !important; position: fixed !important; inset: 0 !important; background: #fff !important; color: #000 !important; padding: 1.5rem !important; overflow: visible !important; font-family: ui-monospace, monospace !important; z-index: 9999 !important; }
          #invoice-area * { visibility: visible !important; }
          #invoice-area .text-gold, #invoice-area .text-primary { color: #b89d5c !important; }
           #invoice-area .overflow-y-auto, #invoice-area .custom-scrollbar { overflow: visible !important; }
          .print-hide { display: none !important; }
        }
      `}</style>
      <div
        id="invoice-root"
        className="fixed inset-0 z-100 flex items-center justify-end"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm print-hide"
        />

        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="relative w-full max-w-2xl h-full bg-surface border-l border-border shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="px-8 py-6 border-b border-border flex items-center justify-between bg-dark/40 print-hide">
            <div>
              <h2 className="text-xl font-extrabold uppercase tracking-tight text-text-main">
                Acquisition Details
              </h2>
              <p className="text-2xs font-mono text-gold uppercase tracking-[0.2em]">
                ID: {order.id}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-main transition-colors print-hide"
            >
              <X size={24} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div
            id="invoice-area"
            className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar"
          >
            {/* Header Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-muted-light border border-border rounded-sm">
                <p className="text-2xs font-mono text-text-muted uppercase tracking-widest mb-1">
                  Date
                </p>
                <p className="text-xs font-bold text-text-main">
                  {format(new Date(order.created_at), "dd MMM yyyy, HH:mm")}
                </p>
              </div>
              <div className="p-4 bg-muted-light border border-border rounded-sm">
                <p className="text-2xs font-mono text-text-muted uppercase tracking-widest mb-1">
                  Total
                </p>
                <p className="text-sm font-bold text-gold">
                  {displayPrice(order.total_amount)}
                </p>
              </div>
              <div className="p-4 bg-muted-light border border-border rounded-sm">
                <p className="text-2xs font-mono text-text-muted uppercase tracking-widest mb-1">
                  Payment
                </p>
                <PaymentStatusBadge status={order.payment_status} />
              </div>
            </div>

            {/* Customer Info */}
            <section className="space-y-4">
              <h3 className="text-xs font-mono font-bold text-text-muted uppercase tracking-[0.3em] flex items-center gap-2">
                <ArrowUpRight size={14} /> Customer Provenance
              </h3>
              <div className="bg-dark-soft border border-border p-6 rounded-sm space-y-4">
                <div className="flex items-center gap-4">
                  {order.user?.profile_picture ? (
                    <img
                      src={order.user.profile_picture}
                      alt={order.user.full_name || ""}
                      className="w-12 h-12 rounded-full object-cover border border-gold/20"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gold/10 border border-gold/20 flex items-center justify-center text-gold font-bold rounded-full">
                      {order.user?.full_name?.charAt(0) || "U"}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-text-main uppercase">
                      {order.user?.full_name}
                    </p>
                    <p className="text-xs text-text-muted font-mono">
                      {order.user?.email || "No email provided"}
                    </p>
                  </div>
                </div>
                <div className="pt-4 border-t border-border/10 grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-2xs font-mono text-text-muted uppercase tracking-widest mb-2">
                      Shipping Location
                    </p>
                    {order.shipping_address ? (
                      <div className="text-xs text-text-main leading-relaxed space-y-0.5">
                        <p>{order.shipping_address.line1}</p>
                        {order.shipping_address.line2 && (
                          <p>{order.shipping_address.line2}</p>
                        )}
                        <p>
                          {order.shipping_address.city},{" "}
                          {order.shipping_address.state} -{" "}
                          {order.shipping_address.postal_code}
                        </p>
                        <p>{order.shipping_address.country}</p>
                        <p className="text-2xs text-text-muted font-mono mt-1">
                          {order.shipping_address.phone}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-text-muted">N/A</p>
                    )}
                  </div>
                  <div>
                    <p className="text-2xs font-mono text-text-muted uppercase tracking-widest mb-2">
                      Contact Method
                    </p>
                    <p className="text-xs text-text-main">
                      Digital Receipt Sent
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Items */}
            <section className="space-y-4">
              <h3 className="text-xs font-mono font-bold text-text-muted uppercase tracking-[0.3em] flex items-center gap-2">
                <ShoppingBag size={14} /> Acquisition Manifest
              </h3>

              <div className="border border-border bg-muted-light rounded-sm overflow-hidden">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 border-b border-border/10 last:border-0 flex items-center gap-4 bg-dark/20"
                    >
                      <div className="w-14 h-14 bg-surface border border-border rounded-sm overflow-hidden shrink-0 flex items-center justify-center">
                        {item.product_image ? (
                          <img
                            src={item.product_image}
                            alt={item.product_title || ""}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon size={16} className="text-text-muted" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        {item.course_title ? (
                          <>
                            <p className="text-xs font-bold text-text-main uppercase truncate">
                              {item.course_title}
                            </p>
                            <p className="text-2xs text-gold font-mono tracking-widest uppercase">
                              Course Enrollment
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs font-bold text-text-main uppercase truncate">
                              {item.product_title ||
                                `Product ID: ${item.product_id}`}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {item.variant_name && (
                                <span className="text-2xs text-text-muted font-mono tracking-widest uppercase">
                                  {item.variant_name}
                                </span>
                              )}
                              {item.variant_dimensions && (
                                <span className="text-2xs text-text-muted/50 font-mono">
                                  {item.variant_dimensions}
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-text-main">
                          {displayPrice(item.price)}
                        </p>
                        <p className="text-2xs text-text-muted font-mono">
                          QTY: {item.quantity}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-text-muted font-mono text-xs uppercase tracking-wider">
                    No items found for this order
                  </div>
                )}
              </div>
            </section>

            {/* Actions */}
            <section className="space-y-4 print-hide">
              <h3 className="text-xs font-mono font-bold text-text-muted uppercase tracking-[0.3em]">
                Update Status
              </h3>
              <div className="grid grid-cols-2 gap-3 rounded-sm overflow-hidden">
                {ORDER_STATUSES.map((s) => {
                  const isSaved = order.status === s;
                  const isSelected = (pendingStatus ?? order.status) === s;
                  const isDisabled = !allowedNext.includes(s) && !isSaved;
                  return (
                    <button
                      key={s}
                      disabled={isDisabled}
                      onClick={() => setPendingStatus(s)}
                      className={cn(
                        "px-4 py-3 text-2xs font-mono uppercase tracking-[0.2em] border transition-all rounded",
                        isSelected
                          ? "border-gold bg-gold/10 text-gold"
                          : "border-border text-text-muted hover:border-gold/50 hover:text-text-main bg-dark/40",
                        isDisabled && "opacity-30 cursor-not-allowed"
                      )}
                    >
                      {s}
                      {isSaved && " (current)"}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="p-8 bg-dark/40 border-t border-border flex gap-4 mt-auto print-hide">
            <PrimaryBtn
              className="flex-1 justify-center py-4 text-xs"
              onClick={() => window.print()}
            >
              PRINT INVOICE
            </PrimaryBtn>
            <PrimaryBtn
              className="flex-1 justify-center py-4 text-xs"
              onClick={handleSave}
              disabled={!hasChanges || isUpdating}
            >
              {isUpdating ? "SAVING..." : hasChanges ? "SAVE" : "NO CHANGES"}
            </PrimaryBtn>
          </div>
        </motion.div>
      </div>
    </>
  );
}

// ─── Cp Status Badge ─────────────────────────────────────────────────────────

function CpStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: "text-emerald-500 bg-emerald-500/10",
    pending: "text-amber-500 bg-amber-500/10",
    failed: "text-red-500 bg-red-500/10",
    refunded: "text-indigo-500 bg-indigo-500/10",
  };
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded text-2xs font-mono font-black uppercase tracking-tighter",
        styles[status] || styles.pending
      )}
    >
      {status}
    </span>
  );
}

// ─── Mobile Cp Card ─────────────────────────────────────────────────────────

function MobileCpCard({ payment }: { payment: AdminCoursePaymentRead }) {
  const statusColorMap: Record<string, string> = {
    paid: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5 shadow-[0_0_10px_rgba(16,185,129,0.05)]",
    pending:
      "text-amber-400 border-amber-500/20 bg-amber-500/5 shadow-[0_0_10px_rgba(245,158,11,0.05)]",
    failed:
      "text-red-400 border-red-500/20 bg-red-500/5 shadow-[0_0_10px_rgba(239,68,68,0.05)]",
    refunded:
      "text-indigo-400 border-indigo-500/20 bg-indigo-500/5 shadow-[0_0_10px_rgba(99,102,241,0.05)]",
  };
  return (
    <div className="group relative bg-surface border border-border shadow-md overflow-hidden rounded-sm transition-all duration-500 hover:border-gold/40">
      <div className="px-6 py-4 border-b border-border/90 bg-dark/20 flex justify-between items-center">
        <span className="text-2xs font-mono text-gold uppercase tracking-[0.3em] font-bold">
          #{payment.id.slice(0, 8)}
        </span>
        <div className="w-1.5 h-1.5 rounded-full bg-gold/30 group-hover:bg-gold group-hover:animate-pulse transition-all" />
      </div>
      <div className="p-6 space-y-6">
        <div className="space-y-1">
          <h4 className="text-sm font-black text-text-main uppercase tracking-tight leading-tight">
            {payment.course_title || "N/A"}
          </h4>
          <p className="text-2xs text-text-muted font-mono lowercase truncate opacity-70">
            {payment.user_full_name || "Unknown"} · {payment.user_email || ""}
          </p>
        </div>
        <div className="flex items-center justify-between py-4 border-y border-border/5">
          <div className="space-y-1">
            <span className="text-[9px] font-mono text-text-muted/60 uppercase tracking-widest block">
              Amount
            </span>
            <p className="text-2xl font-black text-gold font-mono tracking-tighter leading-none">
              {displayPrice(payment.amount)}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex items-center px-3 py-1 border rounded-full text-[9px] font-mono font-bold tracking-[0.2em] uppercase transition-all duration-500",
              statusColorMap[payment.status] || statusColorMap.pending
            )}
          >
            <span className="w-1 h-1 rounded-full bg-current mr-2 animate-pulse" />
            {payment.status}
          </span>
        </div>
        <div className="flex justify-between items-end pt-2">
          <div className="text-2xs font-mono text-text-muted uppercase">
            {format(new Date(payment.created_at), "dd MMM yyyy")}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Cp Filter Sidebar ──────────────────────────────────────────────────────

const CP_PAYMENT_STATUSES = ["paid", "pending", "failed", "refunded"];

function CpFilterSidebar({
  isOpen,
  onClose,
  filters: currentFilters,
  onApply,
}: {
  isOpen: boolean;
  onClose: () => void;
  filters: CpFilters;
  onApply: (f: CpFilters) => void;
}) {
  const [tempFilters, setTempFilters] = useState<CpFilters>(currentFilters);

  useEffect(() => {
    if (isOpen) setTempFilters(currentFilters);
  }, [isOpen, currentFilters]);

  const clear = () => setTempFilters(EMPTY_CP_FILTERS);

  return (
    <div className="fixed inset-0 z-150 flex items-center justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/90 backdrop-blur-xl"
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative w-full max-w-md h-full bg-surface border-l border-border shadow-2xl flex flex-col"
      >
        <div className="px-8 py-6 border-b border-border/40 flex items-center justify-between bg-dark/40">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-text-main">
              Filter <span className="text-gold">Payments</span>
            </h2>
            <p className="text-2xs font-mono text-text-muted uppercase tracking-widest mt-1">
              Refine course payments
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-gold transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          <section className="space-y-4">
            <label className="text-2xs font-mono text-text-muted uppercase tracking-[0.2em] block font-bold">
              Payment Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CP_PAYMENT_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() =>
                    setTempFilters({
                      ...tempFilters,
                      status: s === tempFilters.status ? "" : s,
                    })
                  }
                  className={cn(
                    "px-3 py-2.5 text-2xs font-mono uppercase border transition-all rounded-sm text-left",
                    tempFilters.status === s
                      ? "bg-gold text-dark border-gold font-bold"
                      : "bg-dark/40 border-border/60 text-text-muted hover:border-gold/40"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </section>
          <section className="space-y-4">
            <label className="text-2xs font-mono text-text-muted uppercase tracking-[0.2em] block font-bold">
              Temporal Boundary
            </label>
            <DatePickerWithRange
              date={
                tempFilters.dateStart
                  ? {
                      from: new Date(tempFilters.dateStart),
                      to: tempFilters.dateEnd
                        ? new Date(tempFilters.dateEnd)
                        : undefined,
                    }
                  : undefined
              }
              setDate={(range) => {
                setTempFilters({
                  ...tempFilters,
                  dateStart: range?.from
                    ? format(range.from, "yyyy-MM-dd")
                    : "",
                  dateEnd: range?.to ? format(range.to, "yyyy-MM-dd") : "",
                });
              }}
            />
          </section>
          <section className="space-y-4 pt-2">
            <label className="text-2xs font-mono text-text-muted uppercase tracking-[0.2em] block font-bold">
              Amount Range (₹)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                placeholder="MIN"
                value={tempFilters.minAmount}
                onChange={(e) =>
                  setTempFilters({ ...tempFilters, minAmount: e.target.value })
                }
                className="w-full bg-dark/40 border border-border/60 p-3 text-xs font-mono text-text-main outline-none focus:border-gold/40 placeholder:text-text-muted/30 rounded-sm"
              />
              <input
                type="number"
                placeholder="MAX"
                value={tempFilters.maxAmount}
                onChange={(e) =>
                  setTempFilters({ ...tempFilters, maxAmount: e.target.value })
                }
                className="w-full bg-dark/40 border border-border/60 p-3 text-xs font-mono text-text-main outline-none focus:border-gold/40 placeholder:text-text-muted/30 rounded-sm"
              />
            </div>
          </section>
        </div>
        <div className="p-8 bg-dark/40 border-t border-border/40 flex gap-3">
          <button
            onClick={clear}
            className="flex-1 px-4 py-4 text-2xs font-mono uppercase tracking-[0.3em] text-text-muted hover:text-text-main transition-colors border border-border/40 rounded-sm"
          >
            Reset
          </button>
          <PrimaryBtn
            onClick={() => onApply(tempFilters)}
            className="flex-2 justify-center py-4 text-2xs tracking-[0.4em] font-bold"
          >
            APPLY FILTERS
          </PrimaryBtn>
        </div>
      </motion.div>
    </div>
  );
}
