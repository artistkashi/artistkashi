"use client";

export const dynamic = "force-dynamic";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { PrimaryBtn } from "@/components/ui/buttons";
import { RevealBlock } from "@/components/ui/misc";
import { useAuth } from "@/lib/auth-store";
import { getSafeReturnTo } from "@/lib/auth-utils";
import { loginSchema, type LoginFormValues } from "@/lib/auth-validation";
import { getErrorMessage } from "@/lib/error-handler";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get("returnTo"));
  const { login } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      const user = await login(data.email, data.password);
      toast.success(`Welcome back, ${user.full_name}!`, {
        description:
          user.role === "admin"
            ? "Logged in as Administrator"
            : "Logged in successfully",
      });

      // Admin goes to admin panel, users go to returnTo or dashboard
      if (user.role === "admin") {
        router.push("/admin");
      } else {
        router.push(returnTo ?? "/dashboard");
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthGuard guestOnly>
      <main className="flex min-h-dvh items-center justify-center overflow-hidden px-4 py-6 sm:px-6 sm:py-8">
        <div className="w-full max-w-md">
          <RevealBlock>
            <div className="mb-8 text-center sm:mb-10">
              <div className="text-text-main text-2xl font-extrabold tracking-widest uppercase">
                Artist
              </div>
              <div className="text-gold text-tiny font-mono tracking-[0.25em] uppercase">
                Kashi
              </div>
              <h1 className="mt-6 text-3xl font-bold text-text-main sm:mt-8">
                Welcome Back
              </h1>
              <p className="text-text-muted text-sm mt-2">
                Enter your credentials to access your collection.
              </p>
            </div>
            <form
              className="space-y-5 sm:space-y-6"
              onSubmit={handleSubmit(onSubmit)}
            >
              <div>
                <label className="block text-label font-mono text-text-muted tracking-widest uppercase mb-1.5 sm:mb-2">
                  Email Address
                </label>
                <input
                  {...register("email")}
                  type="email"
                  className={cn(
                    "w-full bg-muted-light border text-text-main px-4 py-3 focus:outline-none focus:border-gold transition-colors",
                    errors.email ? "border-red-500" : "border-border"
                  )}
                  placeholder="collector@email.com"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500 font-mono">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-label font-mono text-text-muted tracking-widest uppercase mb-1.5 sm:mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    className={cn(
                      "w-full bg-muted-light border text-text-main px-4 py-3 pr-12 focus:outline-none focus:border-gold transition-colors",
                      errors.password ? "border-red-500" : "border-border"
                    )}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute inset-y-0 right-0 flex items-center px-4 text-text-muted hover:text-text-main transition-colors"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-500 font-mono">
                    {errors.password.message}
                  </p>
                )}
              </div>
              <PrimaryBtn
                type="submit"
                className="w-full justify-center"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="luxury-loader scale-75" />
                ) : (
                  <>
                    Sign In <ArrowRight size={16} />
                  </>
                )}
              </PrimaryBtn>
            </form>
            <div className="mt-6 text-center text-sm text-text-muted sm:mt-8">
              Don't have an account?{" "}
              <Link
                href={
                  returnTo
                    ? `/signup?returnTo=${encodeURIComponent(returnTo)}`
                    : "/signup"
                }
                className="text-gold hover:text-text-main transition-colors"
              >
                Sign up
              </Link>
            </div>
          </RevealBlock>
        </div>
      </main>
    </AuthGuard>
  );
}
