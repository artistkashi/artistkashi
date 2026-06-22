"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Play, Check, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

import { useAuth } from "@/lib/auth-store";
import { AuthGuard } from "@/components/shared/AuthGuard";

export default function LessonPlayerPage() {
  const [activeLesson, setActiveLesson] = useState(3);
  const { user } = useAuth();

  const lessons = useMemo(
    () => [
      {
        n: 1,
        title: "Introduction to the Artist method",
        duration: "8:20",
        done: true,
      },
      {
        n: 2,
        title: "Understanding your materials",
        duration: "14:05",
        done: true,
      },
      {
        n: 3,
        title: "Color theory for oil painters",
        duration: "22:47",
        done: false,
        active: true,
      },
      { n: 4, title: "The value study system", duration: "18:30", done: false },
      {
        n: 5,
        title: "Dynamic vs static arrangements",
        duration: "11:15",
        done: false,
      },
    ],
    []
  );

  if (!user) return null;

  return (
    <AuthGuard allowedRoles={["user", "admin"]}>
      <main className="pt-20 h-screen flex flex-col bg-dark">
        <div className="flex-1 flex overflow-hidden">
          {/* Video Area */}
          <div className="flex-1 flex flex-col bg-dark">
            <div className="relative flex-1 flex items-center justify-center bg-dark">
              <Image
                src="https://images.unsplash.com/photo-1775346098886-72ab6697b331?w=1200&h=680&fit=crop&auto=format"
                alt="Lesson video"
                fill
                sizes="100vw"
                className="object-contain grayscale opacity-60"
              />
              {/* Watermark */}
              <div className="absolute bottom-10 right-10 text-tiny font-mono text-text-main/20 text-right leading-relaxed pointer-events-none">
                <div>{user.email}</div>
                <div>IP: 192.168.1.xxx · {new Date().toLocaleDateString()}</div>
              </div>
              {/* Play overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <button className="w-20 h-20 bg-text-main/10 backdrop-blur border border-white/10 flex items-center justify-center hover:bg-gold/20 hover:border-gold/30 transition-all">
                  <Play
                    size={28}
                    className="text-text-main fill-text-main ml-1.5"
                  />
                </button>
              </div>
            </div>

            {/* Controls */}
            <div className="bg-muted-light border-t border-border px-8 py-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-label font-mono text-text-muted">
                  8:04
                </span>
                <div className="flex-1 h-1 bg-border relative cursor-pointer group">
                  <div className="h-full bg-gold w-[34%]" />
                  <button className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-text-main border-2 border-gold opacity-0 group-hover:opacity-100 transition-opacity left-[34%] -translate-x-1/2" />
                </div>
                <span className="text-label font-mono text-text-muted">
                  22:47
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button className="text-text-muted hover:text-text-main transition-colors">
                    <Play size={20} className="fill-current" />
                  </button>
                  <div className="text-sm font-mono text-text-main">
                    Lesson {activeLesson}:{" "}
                    {lessons.find((l) => l.n === activeLesson)?.title}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-text-muted">
                  <button className="text-xs font-mono hover:text-text-main transition-colors">
                    1× Speed
                  </button>
                  <button className="hover:text-text-main transition-colors">
                    <Eye size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 border-l border-border flex flex-col hidden lg:flex">
            <div className="p-6 border-b border-border">
              <div className="text-label font-mono text-gold tracking-widest uppercase mb-1">
                Section 01 · Foundation
              </div>
              <div className="text-text-main font-semibold">
                {"Oil Painting Fundamentals"}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-1 bg-border">
                  <div className="h-full bg-gold w-[34%]" />
                </div>
                <span className="text-label font-mono text-text-muted">
                  34%
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {lessons.map((l) => (
                <button
                  key={l.n}
                  onClick={() => setActiveLesson(l.n)}
                  className={cn(
                    "w-full flex items-center gap-4 px-6 py-4 text-left border-b border-border transition-colors",
                    activeLesson === l.n ? "bg-muted" : "hover:bg-muted-light"
                  )}
                >
                  <div
                    className={cn(
                      "w-7 h-7 shrink-0 border flex items-center justify-center",
                      l.done
                        ? "border-gold bg-gold/10"
                        : activeLesson === l.n
                          ? "border-text-main"
                          : "border-border"
                    )}
                  >
                    {l.done ? (
                      <Check size={12} className="text-gold" />
                    ) : (
                      <Play
                        size={10}
                        className={
                          activeLesson === l.n
                            ? "text-text-main ml-0.5"
                            : "text-text-muted ml-0.5"
                        }
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={cn(
                        "text-sm truncate",
                        l.done
                          ? "text-text-muted"
                          : activeLesson === l.n
                            ? "text-text-main font-semibold"
                            : "text-text-muted"
                      )}
                    >
                      {l.title}
                    </div>
                    <div className="text-label font-mono text-text-muted mt-0.5">
                      {l.duration}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
