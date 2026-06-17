"use client";

import { PrimaryBtn } from "@/components/ui/buttons";
import { RevealBlock } from "@/components/ui/misc";
import { ArrowLeft, Home, Search } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-dark px-6 relative overflow-hidden">
      {/* Background Decorative Element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-200 bg-gold/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-xl w-full text-center relative z-10">
        <RevealBlock>
          <div className="mb-8">
            <span className="text-[120px] font-black text-white/5 leading-none select-none">
              404
            </span>
            <div className="text-gold font-mono tracking-[0.3em] uppercase text-sm -mt-11">
              Lost in the Canvas
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold text-text-main tracking-tight mb-6">
            This Masterpiece <br />
            <span className="text-gold italic">is Missing.</span>
          </h1>

          <p className="text-text-muted text-lg mb-10 leading-relaxed">
            The perspective you're looking for has shifted beyond the frame. It
            may have been moved, deleted, or never existed in this collection.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/">
              <PrimaryBtn className="px-8 py-4">
                <Home size={18} /> Return Home
              </PrimaryBtn>
            </Link>
            <button
              onClick={() => window.history.back()}
              className="px-8 py-4 border border-border text-text-main hover:border-gold hover:text-gold transition-all duration-300 flex items-center gap-2 font-medium"
            >
              <ArrowLeft size={18} /> Go Back
            </button>
          </div>

          <div className="mt-16 pt-8 border-t border-border/50">
            <p className="text-text-muted text-xs font-mono uppercase tracking-widest mb-4">
              Perhaps searching will help?
            </p>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 text-gold hover:text-text-main transition-colors text-sm"
            >
              <Search size={16} /> Explore the Gallery
            </Link>
          </div>
        </RevealBlock>
      </div>
    </main>
  );
}
