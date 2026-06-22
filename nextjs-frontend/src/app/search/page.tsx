"use client";

import { CourseRead } from "@/api/openapi-client";
import { RevealBlock } from "@/components/ui/misc";
import { PAINTINGS } from "@/data/constants";
import { Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function SearchPage() {
  const [query, setQuery] = useState("");

  const results = [...PAINTINGS].filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <main className="pt-32 min-h-screen bg-dark">
      <div className="max-w-360 mx-auto px-8 lg:px-16">
        <RevealBlock>
          <div className="relative mb-16">
            <Search
              className="absolute left-0 top-1/2 -translate-y-1/2 text-text-muted"
              size={32}
            />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search artists, artworks, courses..."
              className="w-full bg-transparent border-b-2 border-border focus:border-gold text-text-main text-h3 font-bold py-6 pl-14 outline-none transition-colors"
            />
          </div>

          {query && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
              {results.length > 0 ? (
                results.map((item, i) => {
                  const isPainting = "primary_image" in item;
                  const itemImage = isPainting
                    ? item.primary_image
                    : (item as unknown as CourseRead).thumbnail_url;
                  const price =
                    typeof item.price === "string"
                      ? parseFloat(item.price)
                      : item.price;
                  const isOriginalWork = isPainting && price && price > 1000;

                  return (
                    <Link
                      key={i}
                      href={
                        isOriginalWork
                          ? `/shop/${item.slug}`
                          : `/courses/${item.id}`
                      }
                      className="group bg-dark p-6 hover:bg-muted-light transition-colors cursor-pointer"
                    >
                      <div className="relative aspect-4/3 mb-4 overflow-hidden bg-muted">
                        <Image
                          src={itemImage || ""}
                          alt={item.title}
                          fill
                          sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw"
                          className="object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                        />
                      </div>
                      <div className="text-tiny font-mono text-gold uppercase tracking-widest mb-1">
                        {isOriginalWork ? "Original Work" : "Course"}
                      </div>
                      <div className="text-text-main font-semibold">
                        {item.title}
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="col-span-full py-20 text-center text-text-muted">
                  No results found for &quot;{query}&quot;.
                </div>
              )}
            </div>
          )}
        </RevealBlock>
      </div>
    </main>
  );
}
