"use client";

import { useAuth } from "@/lib/auth-store";
import { getSafeReturnTo } from "@/lib/auth-utils";
import { unwrap } from "@/api/client-service";
import { getCounts } from "@/api/openapi-client";
import { useCartStore } from "@/lib/cart-store";
import { cn } from "@/lib/utils";
import { Heart, Menu, ShoppingBag, User, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);
  const cartCount = useCartStore((s) => s.cartCount);
  const pathname = usePathname();
  const { user } = useAuth();

  useEffect(() => {
    setScrolled(window.scrollY > 40);
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    if (!user) {
      setWishlistCount(0);
      useCartStore.setState({ cartCount: 0 });
      return;
    }
    const fetchCounts = async () => {
      try {
        const counts = await unwrap(getCounts());
        if (counts) {
          setWishlistCount(counts.wishlist_count ?? 0);
          if (counts.cart_count !== undefined) {
            useCartStore.setState({ cartCount: counts.cart_count });
          }
        }
      } catch {
        // ignore
      }
    };
    fetchCounts();
  }, [user]);

  const links = [
    { label: "Shop", href: "/shop" },
    { label: "Courses", href: "/courses" },
    ...(user?.role === "admin"
      ? [{ label: "Instructor", href: "/admin" }]
      : []),
  ];

  const returnTo = getSafeReturnTo();
  const loginHref = `/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`;

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        scrolled || menuOpen
          ? "bg-background/95 backdrop-blur-2xl shadow-sm"
          : "bg-transparent"
      )}
    >
      <nav className="max-w-7xl mx-auto px-6 lg:px-12 py-5">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="text-xl font-black tracking-widest uppercase text-foreground">
              Artist
            </span>
            <span className="text-primary text-xs font-mono tracking-[0.25em] uppercase">
              Kashi
            </span>
          </Link>

          {/* Desktop */}
          <div className="hidden lg:flex items-center gap-12">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "text-xs font-mono uppercase tracking-[0.2em] transition-all duration-300",
                  pathname === l.href ||
                    (l.href !== "/" && pathname.startsWith(l.href))
                    ? "text-primary"
                    : "text-text-muted hover:text-primary"
                )}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-8">
            {user && (
              <Link
                href="/wishlist"
                className={cn(
                  "relative transition-all duration-300",
                  pathname === "/wishlist"
                    ? "text-primary"
                    : "text-text-muted hover:text-primary"
                )}
              >
                <Heart size={18} />
                {wishlistCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-primary text-dark text-2xs font-bold flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </Link>
            )}

            {user && (
              <Link
                href="/cart"
                className={cn(
                  "relative transition-all duration-300",
                  pathname === "/cart"
                    ? "text-primary"
                    : "text-text-muted hover:text-primary"
                )}
              >
                <ShoppingBag size={18} />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-primary text-dark text-2xs font-bold flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}

            <div className="w-px h-4 bg-border mx-2" />

            {user ? (
              <Link
                href="/dashboard"
                className="text-primary hover:text-foreground transition-all duration-300"
              >
                <User size={20} />
              </Link>
            ) : (
              <Link
                href={loginHref}
                className="text-text-muted hover:text-primary transition-all duration-300 text-xs tracking-[0.2em] uppercase font-bold font-mono"
              >
                Login
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="lg:hidden flex items-center gap-4">
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="text-foreground p-1"
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-background border-t border-border lg:hidden"
          >
            <div className="px-6 py-8 space-y-6">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="block text-2xl font-bold tracking-tight text-foreground hover:text-primary transition-colors"
                >
                  {l.label}
                </Link>
              ))}
              <div className="h-px bg-border" />
              {user && (
                <Link
                  href="/wishlist"
                  onClick={() => setMenuOpen(false)}
                  className="block text-lg text-text-muted hover:text-primary transition-colors font-mono tracking-widest uppercase"
                >
                  Wishlist
                </Link>
              )}
              {user && (
                <Link
                  href="/cart"
                  onClick={() => setMenuOpen(false)}
                  className="block text-lg text-text-muted hover:text-primary transition-colors font-mono tracking-widest uppercase"
                >
                  Cart
                </Link>
              )}
              {!user && (
                <Link
                  href={loginHref}
                  onClick={() => setMenuOpen(false)}
                  className="block text-lg text-primary hover:text-foreground transition-colors font-mono tracking-widest uppercase"
                >
                  Login
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
