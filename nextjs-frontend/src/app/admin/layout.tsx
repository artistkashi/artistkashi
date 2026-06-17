"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { useAuth } from "@/lib/auth-store";
import { getErrorMessage } from "@/lib/error-handler";
import { cn } from "@/lib/utils";
import {
  Bell,
  BookOpen,
  ChevronRight,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  ShoppingBag,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false); // For mobile
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // For desktop
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  // Prevent background scrolling when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [sidebarOpen]);

  const menuItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    {
      label: "Home Customizer",
      href: "/admin/home-customizer",
      icon: Settings,
    },
    { label: "Courses", href: "/admin/courses", icon: BookOpen },
    { label: "Products", href: "/admin/products", icon: Package },
    { label: "Catalog", href: "/admin/catalog", icon: Library },
    { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/");
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <AuthGuard allowedRoles={["admin"]}>
      <div className="h-screen bg-transparent flex overflow-hidden relative z-10">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-dark/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 glass-luxury border-r border-gold/10 z-50 lg:static lg:inset-0 flex flex-col overflow-hidden transition-width duration-300 ease-in-out",
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
          style={{ width: sidebarCollapsed ? "5rem" : "18rem" }}
        >
          {/* Sidebar Header - Logo Only */}
          <div className="h-20 flex items-center justify-center px-4 border-b border-border shrink-0 overflow-hidden">
            <Link href="/admin" className="flex items-center justify-center">
              {sidebarCollapsed ? (
                <div className="flex items-center justify-center w-10 h-10 bg-dark border border-border rounded font-extrabold text-lg transition-all duration-300">
                  <span className="text-text-main">A</span>
                  <span className="text-gold">K</span>
                </div>
              ) : (
                <div className="flex flex-col leading-none items-center lg:items-start transition-all duration-300">
                  <span className="text-text-main text-xl font-extrabold tracking-widest uppercase">
                    Artist
                  </span>
                  <span className="text-gold text-tiny font-mono tracking-[0.25em] uppercase -mt-0.5">
                    Kashi
                  </span>
                </div>
              )}
            </Link>
          </div>

          {/* Scrollable Nav Area */}
          <nav className="flex-1 overflow-y-auto py-8 px-4 space-y-1 scrollbar-hide overflow-x-hidden">
            {menuItems.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname === item.href ||
                    pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all group relative rounded",
                    isActive
                      ? "bg-gold text-dark"
                      : "text-text-muted hover:text-text-main hover:bg-muted",
                    sidebarCollapsed && "lg:px-0 lg:justify-center lg:gap-0"
                  )}
                >
                  <item.icon
                    size={18}
                    className={cn(
                      "shrink-0",
                      isActive
                        ? "text-dark"
                        : "text-gold group-hover:text-text-main"
                    )}
                  />
                  <span
                    className={cn(
                      "transition-all duration-300 whitespace-nowrap",
                      sidebarCollapsed
                        ? "lg:opacity-0 lg:w-0 lg:ml-0"
                        : "opacity-100 w-auto ml-0"
                    )}
                  >
                    {item.label}
                  </span>
                  {isActive && !sidebarCollapsed && (
                    <ChevronRight size={14} className="ml-auto shrink-0" />
                  )}

                  {/* Tooltip for collapsed state */}
                  {sidebarCollapsed && (
                    <div className="absolute left-full ml-4 px-2 py-1 bg-gold text-dark text-xs font-mono tracking-widest uppercase opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap hidden lg:block border border-dark rounded">
                      {item.label}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Fixed Sidebar Bottom Section */}
          <div
            className={cn(
              "border-t border-border shrink-0 bg-muted-light/50 transition-all duration-300",
              sidebarCollapsed ? "p-2" : "p-4"
            )}
          >
            <div
              className={cn(
                " flex items-center border border-border/50 glass-input transition-all duration-300 overflow-hidden rounded",
                sidebarCollapsed
                  ? "justify-center rounded-lg bg-transparent "
                  : "mb-4 gap-3"
              )}
            >
              <div className="w-10 h-10 bg-muted border border-border flex items-center justify-center text-gold font-bold text-sm shrink-0 rounded">
                {(user?.full_name ?? "Admin")
                  .split(" ")
                  .filter(Boolean)
                  .map((word) => word[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
              <div
                className={cn(
                  "min-w-0 transition-all duration-300",
                  sidebarCollapsed
                    ? "lg:opacity-0 lg:w-0"
                    : "opacity-100 w-auto"
                )}
              >
                <div className="text-text-main text-sm font-bold truncate">
                  {user?.full_name ?? "Admin"}
                </div>
                <div className="text-text-muted text-2xs font-mono uppercase tracking-widest">
                  Admin
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-text-muted hover:text-red-500 hover:bg-red-500/5 transition-all",
                sidebarCollapsed ? "justify-center gap-0 mt-2" : "mt-0"
              )}
            >
              <LogOut size={18} className="shrink-0" />
              <span
                className={cn(
                  "transition-all duration-300 whitespace-nowrap",
                  sidebarCollapsed
                    ? "lg:opacity-0 lg:w-0"
                    : "opacity-100 w-auto"
                )}
              >
                Sign Out
              </span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Header - Fixed */}
          <header className="h-20 glass-luxury border-b border-gold/10 flex items-center justify-between px-4 lg:px-8 shrink-0 z-30">
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden text-text-muted hover:text-text-main"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu size={24} />
              </button>

              {/* Main Desktop Toggle in Header */}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden lg:flex text-text-muted hover:text-gold transition-colors"
                title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {sidebarCollapsed ? (
                  <PanelLeftOpen size={22} />
                ) : (
                  <PanelLeftClose size={22} />
                )}
              </button>

              <div className="hidden md:flex items-center gap-2 glass-input px-4 py-2 border focus-within:border-gold transition-colors ml-2 rounded">
                <Search size={16} className="text-text-muted" />
                <input
                  type="text"
                  placeholder="Search console..."
                  className="bg-transparent border-none text-sm text-text-main focus:outline-none w-48 lg:w-64"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 lg:gap-6">
              <button className="text-text-muted hover:text-gold transition-colors relative">
                <Bell size={20} />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-muted-light"></span>
              </button>

              <Link
                href="/dashboard"
                className="hidden sm:block text-label font-mono tracking-widest uppercase text-gold hover:text-text-main transition-colors border border-gold/30 px-3 py-1.5 rounded"
              >
                Student View
              </Link>
            </div>
          </header>

          {/* Page Content - Scrollable */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-10 scrollbar-hide">
            <div className="max-w-7xl mx-auto">{children}</div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
