import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border mt-40">
      <div className="max-w-360 mx-auto px-8 lg:px-16 py-20 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="md:col-span-1">
          <div className="mb-6">
            <div className="text-text-main text-2xl font-extrabold tracking-widest uppercase">
              Artist
            </div>
            <div className="text-gold text-tiny font-mono tracking-[0.25em] uppercase">
              Kashi
            </div>
          </div>
          <p className="text-text-muted text-sm leading-relaxed">
            A premium destination for serious collectors and students of the
            painted world.
          </p>
          <div className="flex gap-4 mt-6">
            {["IG", "TW", "YT"].map((s) => (
              <button
                key={s}
                className="w-10 h-10 border border-border flex items-center justify-center text-label font-mono text-text-muted hover:border-gold hover:text-gold transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {[
          {
            title: "Learn",
            links: [
              { label: "All Courses", href: "/courses" },
              { label: "Course Detail", href: "/courses/1" },
            ],
          },
          {
            title: "Collect",
            links: [
              { label: "Shop", href: "/shop" },
              { label: "Original Works", href: "/shop/solitude-in-ochre" },
              { label: "Commissions", href: "/shop" },
            ],
          },
          {
            title: "Platform",
            links: [
              { label: "Dashboard", href: "/dashboard" },
              { label: "Instructor", href: "/admin" },
              { label: "Home", href: "/" },
            ],
          },
        ].map((col) => (
          <div key={col.title}>
            <div className="text-label tracking-[0.2em] uppercase font-mono text-gold mb-6">
              {col.title}
            </div>
            <div className="flex flex-col gap-3">
              {col.links.map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  className="text-text-muted hover:text-text-main text-sm text-left transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="max-w-360 mx-auto px-8 lg:px-16 py-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-text-muted text-xs font-mono">
            © 2026 Artist Kashi. All rights reserved.
          </p>
          <p className="text-text-muted text-xs font-mono">
            Crafted with intention.
          </p>
        </div>
      </div>
    </footer>
  );
}
