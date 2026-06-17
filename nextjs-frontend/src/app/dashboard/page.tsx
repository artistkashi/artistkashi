"use client";

import { PrimaryBtn } from "@/components/ui/buttons";
import { COURSES } from "@/data/constants";
import { cn } from "@/lib/utils";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock,
  LayoutDashboard,
  LogOut,
  Package,
  Play,
  Settings,
  ShoppingBag,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { useAuth } from "@/lib/auth-store";
import { getRoleLabel } from "@/lib/auth-utils";
import { profileSchema, type ProfileFormValues } from "@/lib/auth-validation";
import { getErrorMessage } from "@/lib/error-handler";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [greeting, setGreeting] = useState("Welcome");
  const { user, logout } = useAuth();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: "onBlur",
    defaultValues: {
      fullName: user?.full_name || user?.email || "",
      email: user?.email || "",
      phone: user?.phone || "",
    },
  });

  const onProfileSubmit = async () => {
    toast.info("Profile update coming soon.", {
      description:
        "This feature is currently being integrated with the backend.",
    });
  };

  useEffect(() => {
    const hour = new Date().getHours();

    if (hour < 12) {
      setGreeting("Good morning");
      return;
    }

    if (hour < 18) {
      setGreeting("Good afternoon");
      return;
    }

    setGreeting("Good evening");
  }, []);

  const greetingLabel = useMemo(() => greeting, [greeting]);

  if (!user) return null;

  return (
    <AuthGuard allowedRoles={["user", "admin"]}>
      <main className="pt-20 min-h-screen">
        <div className="max-w-360 mx-auto px-8 lg:px-16 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-3">
              <div className="border border-border bg-muted-light p-6 mb-6">
                <div className="w-14 h-14 bg-muted border border-border flex items-center justify-center text-gold font-bold text-xl mb-4">
                  {(user?.full_name ?? "Admin")
                    .split(" ")
                    .filter(Boolean)
                    .map((word) => word[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div className="text-text-main font-bold text-lg">
                  {user?.full_name}
                </div>
                <div className="text-text-muted text-sm font-mono">
                  {user.email}
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span
                    className={cn(
                      "border text-tiny font-mono tracking-widest uppercase px-2.5 py-1",
                      user.role === "admin"
                        ? "bg-red-500/10 border-red-500/30 text-red-500"
                        : "bg-gold/10 border-gold/30 text-gold"
                    )}
                  >
                    {getRoleLabel(user)}
                  </span>
                </div>
              </div>

              <div className="border border-border bg-muted-light overflow-hidden">
                {[
                  { id: "overview", label: "Overview", icon: LayoutDashboard },
                  { id: "courses", label: "My Courses", icon: BookOpen },
                  { id: "orders", label: "Orders", icon: Package },
                  { id: "settings", label: "Settings", icon: Settings },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "w-full flex items-center gap-4 px-6 py-4 text-sm text-left border-b border-border last:border-b-0 transition-colors",
                      activeTab === item.id
                        ? "bg-border-soft text-text-main"
                        : "text-text-muted hover:text-text-main hover:bg-muted"
                    )}
                  >
                    <item.icon
                      size={16}
                      className={activeTab === item.id ? "text-gold" : ""}
                    />
                    {item.label}
                  </button>
                ))}
                {user.role === "admin" && (
                  <Link
                    href="/admin"
                    className="w-full flex items-center gap-4 px-6 py-4 text-sm text-text-muted hover:text-red-500 hover:bg-muted transition-colors border-t border-border"
                  >
                    <Settings size={16} /> Instructor Panel
                  </Link>
                )}
                <button
                  onClick={async () => {
                    try {
                      await logout();
                      router.push("/");
                    } catch (error) {
                      toast.error(getErrorMessage(error));
                      router.push("/");
                    }
                  }}
                  className="w-full flex items-center gap-4 px-6 py-4 text-sm text-text-muted hover:text-text-main transition-colors"
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-9">
              {activeTab === "overview" && (
                <div>
                  <div className="mb-8">
                    <div className="text-label font-mono text-gold tracking-widest uppercase mb-2">
                      Student Portal
                    </div>
                    <h1 className="text-h3 font-extrabold tracking-tight text-text-main">
                      {greetingLabel}, {user.full_name}.
                    </h1>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border mb-8">
                    {[
                      { label: "Enrolled Courses", value: "3", icon: BookOpen },
                      { label: "Hours Watched", value: "47h", icon: Clock },
                      { label: "Lessons Done", value: "84", icon: Check },
                      { label: "Art Purchases", value: "2", icon: ShoppingBag },
                    ].map((s) => (
                      <div key={s.label} className="bg-muted-light p-6">
                        <s.icon size={18} className="text-gold mb-3" />
                        <div className="text-text-main font-extrabold text-3xl">
                          {s.value}
                        </div>
                        <div className="text-text-muted text-label font-mono mt-1 uppercase tracking-widest">
                          {s.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Continue Watching */}
                  <div className="border border-border bg-muted-light mb-6">
                    <div className="px-8 py-6 border-b border-border flex items-center justify-between">
                      <h2 className="text-text-main font-bold text-xl">
                        Continue Watching
                      </h2>
                      <Link
                        href="/lesson-player"
                        className="text-gold text-xs font-mono tracking-widest uppercase hover:text-text-main transition-colors flex items-center gap-1"
                      >
                        Open <ArrowUpRight size={12} />
                      </Link>
                    </div>
                    <Link
                      href="/lesson-player"
                      className="group w-full flex items-center gap-6 p-6 hover:bg-muted transition-colors"
                    >
                      <div className="w-28 h-16 shrink-0 overflow-hidden relative bg-dark">
                        <Image
                          src={COURSES[0].image_url || ""}
                          alt={COURSES[0].title}
                          fill
                          sizes="112px"
                          className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Play
                            size={18}
                            fill="white"
                            className="text-white ml-0.5 drop-shadow-md"
                          />
                        </div>
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-tiny font-mono text-text-muted uppercase tracking-widest mb-1">
                          Lesson 3 of 42
                        </div>
                        <div className="text-text-main font-semibold mb-2">
                          Color theory for oil painters
                        </div>
                        <div className="w-full h-1 bg-border">
                          <div className="h-full bg-gold w-[34%]" />
                        </div>
                        <div className="text-label font-mono text-text-muted mt-1">
                          34% complete · 14 min remaining
                        </div>
                      </div>
                    </Link>
                  </div>
                </div>
              )}

              {activeTab === "courses" && (
                <div>
                  <h2 className="text-text-main font-bold text-3xl mb-8">
                    My Courses
                  </h2>
                  <div className="space-y-px bg-border">
                    {COURSES.map((c) => (
                      <Link
                        key={c.id}
                        href="/lesson-player"
                        className="group w-full bg-muted-light flex items-center gap-6 p-6 text-left hover:bg-muted transition-colors"
                      >
                        <div className="w-20 h-14 shrink-0 overflow-hidden relative bg-dark">
                          <Image
                            src={c.image_url || ""}
                            alt={c.title}
                            fill
                            sizes="80px"
                            className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-text-main font-semibold truncate">
                            {c.title}
                          </div>
                          <div className="text-text-muted text-xs font-mono mt-1">
                            {c.instructor}
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <div className="w-32 h-1 bg-border">
                              <div className="h-full bg-gold w-[45%]" />
                            </div>
                            <span className="text-tiny font-mono text-text-muted">
                              45%
                            </span>
                          </div>
                        </div>
                        <ChevronRight
                          size={16}
                          className="text-text-muted group-hover:text-text-main transition-colors shrink-0"
                        />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "orders" && (
                <div>
                  <h2 className="text-text-main font-bold text-3xl mb-8">
                    Purchase History
                  </h2>
                  <div className="border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            {["Item", "Type", "Date", "Amount", "Status"].map(
                              (h) => (
                                <th
                                  key={h}
                                  className="text-left px-6 py-4 text-label font-mono text-text-muted tracking-widest uppercase bg-dark-soft"
                                >
                                  {h}
                                </th>
                              )
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {[
                            {
                              item: "Oil Painting Fundamentals",
                              type: "Course",
                              date: "12 Apr 2026",
                              amount: "₹280",
                              status: "Active",
                            },
                            {
                              item: "Solitude in Ochre",
                              type: "Painting",
                              date: "03 Mar 2026",
                              amount: "₹4,800",
                              status: "Shipped",
                            },
                            {
                              item: "Abstract Expression Workshop",
                              type: "Course",
                              date: "18 Jan 2026",
                              amount: "₹195",
                              status: "Active",
                            },
                          ].map((r, i) => (
                            <tr
                              key={i}
                              className="hover:bg-muted-light transition-colors"
                            >
                              <td className="px-6 py-4 text-text-main">
                                {r.item}
                              </td>
                              <td className="px-6 py-4 text-text-muted font-mono text-xs">
                                {r.type}
                              </td>
                              <td className="px-6 py-4 text-text-muted font-mono text-xs">
                                {r.date}
                              </td>
                              <td className="px-6 py-4 text-text-main font-semibold">
                                {r.amount}
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={cn(
                                    "text-tiny font-mono tracking-widest uppercase px-2.5 py-1",
                                    r.status === "Active"
                                      ? "bg-gold/10 text-gold border border-gold/30"
                                      : "bg-text-muted/10 text-text-muted border border-text-muted/20"
                                  )}
                                >
                                  {r.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "settings" && (
                <div>
                  <h2 className="text-text-main font-bold text-3xl mb-8">
                    Profile Settings
                  </h2>
                  <form onSubmit={handleSubmit(onProfileSubmit)}>
                    <div className="border border-border bg-muted-light divide-y divide-border">
                      <div className="px-8 py-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                        <label className="text-label font-mono text-text-muted tracking-widest uppercase md:w-32 shrink-0">
                          Full Name
                        </label>
                        <div className="flex-1">
                          <input
                            {...register("fullName")}
                            type="text"
                            className={cn(
                              "w-full bg-transparent text-text-main text-sm outline-none border-b transition-colors pb-1",
                              errors.fullName
                                ? "border-red-500"
                                : "border-border focus:border-gold"
                            )}
                          />
                          {errors.fullName && (
                            <p className="mt-1 text-xs text-red-500 font-mono">
                              {errors.fullName.message}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="px-8 py-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                        <label className="text-label font-mono text-text-muted tracking-widest uppercase md:w-32 shrink-0">
                          Email
                        </label>
                        <div className="flex-1">
                          <input
                            {...register("email")}
                            type="email"
                            className={cn(
                              "w-full bg-transparent text-text-main text-sm outline-none border-b transition-colors pb-1",
                              errors.email
                                ? "border-red-500"
                                : "border-border focus:border-gold"
                            )}
                          />
                          {errors.email && (
                            <p className="mt-1 text-xs text-red-500 font-mono">
                              {errors.email.message}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="px-8 py-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                        <label className="text-label font-mono text-text-muted tracking-widest uppercase md:w-32 shrink-0">
                          Phone
                        </label>
                        <div className="flex-1">
                          <input
                            {...register("phone")}
                            type="text"
                            className={cn(
                              "w-full bg-transparent text-text-main text-sm outline-none border-b transition-colors pb-1",
                              errors.phone
                                ? "border-red-500"
                                : "border-border focus:border-gold"
                            )}
                          />
                          {errors.phone && (
                            <p className="mt-1 text-xs text-red-500 font-mono">
                              {errors.phone.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-6">
                      <PrimaryBtn type="submit">
                        Save Changes <Check size={16} />
                      </PrimaryBtn>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
