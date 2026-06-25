"use client";

export const dynamic = "force-dynamic";

import { GoogleLoginButton } from "@/components/auth/google-login-button";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PrimaryBtn } from "@/components/ui/buttons";
import { RevealBlock } from "@/components/ui/misc";
import { useAuth } from "@/lib/auth-store";
import { getSafeReturnTo } from "@/lib/auth-utils";
import { signupSchema, type SignupFormValues } from "@/lib/auth-validation";
import { getErrorMessage } from "@/lib/error-handler";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, ArrowRight, Eye, EyeOff, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get("returnTo"));
  const { signup, googleLogin } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    mode: "onBlur",
  });

  const redirectUser = (user: { role: string }) => {
    if (user.role === "admin") {
      router.push("/admin");
    } else {
      router.push(returnTo ?? "/dashboard");
    }
  };

  const onSubmit = async (data: SignupFormValues) => {
    setIsSubmitting(true);
    try {
      const user = await signup({
        full_name: data.fullName,
        email: data.email,
        password: data.password,
      });
      toast.success("Welcome to Artist Kashi!", {
        description: "Your membership has been activated.",
      });
      redirectUser(user);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const [pendingGoogleCredential, setPendingGoogleCredential] = useState<string | null>(null);

  const handleGoogleSuccess = async (credential: string) => {
    setIsSubmitting(true);
    try {
      const user = await googleLogin(credential);
      toast.success("Welcome to Artist Kashi!", {
        description: "Your membership has been activated.",
      });
      redirectUser(user);
    } catch (error: unknown) {
      const axiosErr = error as
        | { response?: { data?: { error_code?: string } } }
        | undefined;
      const errorCode = axiosErr?.response?.data?.error_code;
      if (errorCode === "MAX_SESSIONS_REACHED") {
        setPendingGoogleCredential(credential);
      } else {
        toast.error(getErrorMessage(error));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForceGoogleLogin = async () => {
    if (!pendingGoogleCredential) return;
    setIsSubmitting(true);
    try {
      const user = await googleLogin(pendingGoogleCredential, true);
      toast.success("Welcome to Artist Kashi!", {
        description: "Previous sessions have been revoked.",
      });
      setPendingGoogleCredential(null);
      redirectUser(user);
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
                Sign Up
              </h1>
              <p className="text-text-muted text-sm mt-2">
                Join a global community of collectors and artists.
              </p>
            </div>
            <form
              className="space-y-5 sm:space-y-6"
              onSubmit={handleSubmit(onSubmit)}
            >
              <div>
                <label className="block text-label font-mono text-text-muted tracking-widest uppercase mb-1.5 sm:mb-2">
                  Full Name
                </label>
                <input
                  {...register("fullName")}
                  type="text"
                  className={cn(
                    "w-full glass-input rounded text-text-main px-4 py-3 focus:outline-none focus:border-gold transition-colors",
                    errors.fullName ? "border-danger" : "border-border"
                  )}
                  placeholder="Elena Marchetti"
                />
                {errors.fullName && (
                  <p className="mt-1 text-xs text-danger font-mono">
                    {errors.fullName.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-label font-mono text-text-muted tracking-widest uppercase mb-1.5 sm:mb-2">
                  Email Address
                </label>
                <input
                  {...register("email")}
                  type="email"
                  className={cn(
                    "w-full glass-input rounded text-text-main px-4 py-3 focus:outline-none focus:border-gold transition-colors",
                    errors.email ? "border-danger" : "border-border"
                  )}
                  placeholder="collector@email.com"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-danger font-mono">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-label font-mono text-text-muted tracking-widest uppercase mb-1.5 sm:mb-2">
                  Password
                </label>
                <p className="mb-2 text-label font-mono text-text-muted">
                  Use 8+ characters with one uppercase letter and one special
                  character.
                </p>
                <div className="relative">
                  <input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    className={cn(
                      "w-full glass-input rounded text-text-main px-4 py-3 pr-12 focus:outline-none focus:border-gold transition-colors",
                      errors.password ? "border-danger" : "border-border"
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
                  <p className="mt-1 text-xs text-danger font-mono">
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
                  <div className="luxury-loader scale-75 luxury-loader-dark" />
                ) : (
                  <>
                    Sign Up <ArrowRight size={16} />
                  </>
                )}
              </PrimaryBtn>
            </form>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-dark px-2 text-text-muted font-mono tracking-widest">
                  Or continue with
                </span>
              </div>
            </div>
            <div className="mb-6">
              <GoogleLoginButton
                onSuccess={handleGoogleSuccess}
                isSubmitting={isSubmitting}
              />
            </div>
            <div className="mt-6 text-center text-sm text-text-muted sm:mt-8">
              Already a member?{" "}
              <Link
                href={
                  returnTo
                    ? `/login?returnTo=${encodeURIComponent(returnTo)}`
                    : "/login"
                }
                className="text-gold hover:text-text-main transition-colors"
              >
                Sign in
              </Link>
            </div>
          </RevealBlock>
        </div>
      </main>

      {/* Force Login Confirmation Modal */}
      {pendingGoogleCredential && (
        <div
          className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setPendingGoogleCredential(null);
            }
          }}
        >
          <div className="w-full max-w-sm bg-surface border border-border shadow-lg rounded">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <AlertTriangle size={18} className="text-gold" />
                <h3 className="text-text-main font-bold text-base">
                  Session Limit Reached
                </h3>
              </div>
              <button
                onClick={() => setPendingGoogleCredential(null)}
                className="text-text-muted hover:text-text-main transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-gold/5 border border-gold/20">
                <p className="text-text-muted text-sm">
                  You have reached the maximum of 3 concurrent sessions. Signing
                  in here will revoke all other active sessions.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button
                onClick={() => setPendingGoogleCredential(null)}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-border text-text-muted text-xs font-mono tracking-widest uppercase hover:text-text-main hover:border-gold/50 transition-colors rounded disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleForceGoogleLogin}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gold/10 border border-gold/30 text-gold text-xs font-mono tracking-widest uppercase hover:bg-gold/20 transition-colors rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  "Sign In Anyway"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
