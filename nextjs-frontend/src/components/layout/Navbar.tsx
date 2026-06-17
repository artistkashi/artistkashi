"use client";

import { useAuth } from "@/lib/auth-store";
import { getSafeReturnTo } from "@/lib/auth-utils";
import { cn } from "@/lib/utils";
import { Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const links = [
    { label: "Shop", href: "/shop" },
    { label: "Courses", href: "/courses" },
    ...(user?.role === "admin"
      ? [{ label: "Instructor", href: "/admin" }]
      : []),
  ];

  const loginHref = `/login?returnTo=${encodeURIComponent(getSafeReturnTo(pathname) ?? "/")}`;

  return (
    <>
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
          scrolled
            ? "bg-background/80 backdrop-blur-xl border-b border-border shadow-md"
            : "bg-transparent"
        )}
      >
        <div className="max-w-360 mx-auto px-8 lg:px-16 flex items-center justify-between h-20">
          <Link href="/" className="flex flex-col leading-none group">
            <span className="text-foreground text-xl font-extrabold tracking-[0.12em] uppercase group-hover:text-primary transition-colors">
              Artist
            </span>
            <span className="text-primary text-2xs font-mono tracking-[0.25em] uppercase -mt-0.5">
              Kashi
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-10">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "text-2xs tracking-[0.2em] uppercase font-bold transition-all duration-300 font-mono",
                  pathname === l.href
                    ? "text-primary"
                    : "text-text-muted hover:text-foreground"
                )}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-8">
            <Link
              href="/search"
              className="text-text-muted hover:text-primary transition-all duration-300"
            >
              <Search size={18} />
            </Link>

            <Link
              href="/wishlist"
              className={cn(
                "transition-all duration-300",
                pathname === "/wishlist"
                  ? "text-primary"
                  : "text-text-muted hover:text-primary"
              )}
            >
              <Heart size={18} />
            </Link>

            <Link
              href="/cart"
              className={cn(
                "transition-all duration-300",
                pathname === "/cart"
                  ? "text-primary"
                  : "text-text-muted hover:text-primary"
              )}
            >
              <ShoppingBag size={18} />
            </Link>

            <div className="w-px h-4 bg-border mx-2" />

            {user ? (
              <Link
                href="/dashboard"
                className="text-primary hover:text-foreground transition-all duration-300"
              >
                <User size={20} />
              </Link>
            ) : (
              <>
                <Link
                  href={loginHref}
                  className="text-text-muted hover:text-primary transition-all duration-300 text-2xs tracking-[0.2em] uppercase font-bold font-mono"
                >
                  Login
                </Link>
              </>
            )}
          </div>

          <div className="lg:hidden flex items-center gap-4">
            {user ? (
              <Link
                href="/dashboard"
                onClick={() => setMenuOpen(false)}
                className="text-primary hover:text-foreground transition-colors"
              >
                <User size={22} />
              </Link>
            ) : null}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-foreground p-1"
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-40 bg-background flex flex-col justify-center px-12 lg:hidden"
          >
            <div className="flex flex-col gap-10">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-5xl font-extrabold tracking-tighter text-foreground text-left hover:text-primary transition-colors italic uppercase"
                >
                  {l.label}
                </Link>
              ))}
              <div className="h-px bg-border my-4" />
              <Link
                href="/search"
                onClick={() => setMenuOpen(false)}
                className="text-2xl font-bold tracking-widest text-text-muted hover:text-primary transition-colors uppercase font-mono"
              >
                Search
              </Link>
              <Link
                href="/wishlist"
                onClick={() => setMenuOpen(false)}
                className="text-2xl font-bold tracking-widest text-text-muted hover:text-primary transition-colors uppercase font-mono"
              >
                Wishlist
              </Link>
              <Link
                href="/cart"
                onClick={() => setMenuOpen(false)}
                className="text-2xl font-bold tracking-widest text-text-muted hover:text-primary transition-colors uppercase font-mono"
              >
                Cart
              </Link>
              {!user && (
                <Link
                  href={loginHref}
                  onClick={() => setMenuOpen(false)}
                  className="text-2xl font-bold tracking-widest text-primary hover:text-foreground transition-colors uppercase font-mono"
                >
                  Login
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
