"use client";

export const dynamic = "force-dynamic";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { PrimaryBtn } from "@/components/ui/buttons";
import { RevealBlock } from "@/components/ui/misc";
import { useAuth } from "@/lib/auth-store";
import { passwordSchema } from "@/lib/auth-validation";
import { getErrorMessage } from "@/lib/error-handler";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { resetPassword } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) {
      toast.error("Invalid reset link. Please request a new one.");
      return;
    }
    setIsSubmitting(true);
    try {
      await resetPassword(token, data.password);
      setSuccess(true);
      toast.success("Password reset successfully", {
        description: "You can now sign in with your new password.",
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <AuthGuard guestOnly>
        <main className="flex min-h-dvh items-center justify-center overflow-hidden px-4 py-6 sm:px-6 sm:py-8">
          <div className="w-full max-w-md text-center">
            <RevealBlock>
              <div className="mb-8">
                <div className="text-text-main text-2xl font-extrabold tracking-widest uppercase">
                  Artist
                </div>
                <div className="text-gold text-tiny font-mono tracking-[0.25em] uppercase">
                  Kashi
                </div>
              </div>
              <h1 className="text-3xl font-bold text-text-main mb-4">
                Invalid Reset Link
              </h1>
              <p className="text-text-muted text-sm mb-8">
                This password reset link is invalid or has expired. Please request
                a new one.
              </p>
              <Link
                href="/forgot-password"
                className="text-gold text-xs font-mono tracking-widest uppercase hover:text-text-main transition-colors"
              >
                Request New Reset Link
              </Link>
            </RevealBlock>
          </div>
        </main>
      </AuthGuard>
    );
  }

  if (success) {
    return (
      <AuthGuard guestOnly>
        <main className="flex min-h-dvh items-center justify-center overflow-hidden px-4 py-6 sm:px-6 sm:py-8">
          <div className="w-full max-w-md text-center">
            <RevealBlock>
              <div className="mb-8">
                <div className="text-text-main text-2xl font-extrabold tracking-widest uppercase">
                  Artist
                </div>
                <div className="text-gold text-tiny font-mono tracking-[0.25em] uppercase">
                  Kashi
                </div>
              </div>
              <h1 className="text-3xl font-bold text-text-main mb-4">
                Password Reset
              </h1>
              <p className="text-text-muted text-sm mb-8">
                Your password has been reset successfully. You can now sign in
                with your new password.
              </p>
              <Link
                href="/login"
                className="text-gold text-xs font-mono tracking-widest uppercase hover:text-text-main transition-colors inline-flex items-center gap-1.5"
              >
                <ArrowLeft size={14} /> Sign In
              </Link>
            </RevealBlock>
          </div>
        </main>
      </AuthGuard>
    );
  }

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
                Set New Password
              </h1>
              <p className="text-text-muted text-sm mt-2">
                Choose a strong password for your account.
              </p>
            </div>

            <form
              className="space-y-5 sm:space-y-6"
              onSubmit={handleSubmit(onSubmit)}
            >
              <div>
                <label className="block text-label font-mono text-text-muted tracking-widest uppercase mb-1.5 sm:mb-2">
                  New Password
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
                      "w-full bg-muted-light border text-text-main px-4 py-3 pr-12 focus:outline-none focus:border-gold transition-colors",
                      errors.password ? "border-red-500" : "border-border"
                    )}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute inset-y-0 right-0 flex items-center px-4 text-text-muted hover:text-text-main transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
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

              <div>
                <label className="block text-label font-mono text-text-muted tracking-widest uppercase mb-1.5 sm:mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    {...register("confirmPassword")}
                    type={showConfirm ? "text" : "password"}
                    className={cn(
                      "w-full bg-muted-light border text-text-main px-4 py-3 pr-12 focus:outline-none focus:border-gold transition-colors",
                      errors.confirmPassword ? "border-red-500" : "border-border"
                    )}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((value) => !value)}
                    className="absolute inset-y-0 right-0 flex items-center px-4 text-text-muted hover:text-text-main transition-colors"
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500 font-mono">
                    {errors.confirmPassword.message}
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
                  "Reset Password"
                )}
              </PrimaryBtn>
            </form>

            <div className="mt-6 text-center text-sm text-text-muted sm:mt-8">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-gold hover:text-text-main transition-colors text-xs font-mono tracking-widest uppercase"
              >
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </div>
          </RevealBlock>
        </div>
      </main>
    </AuthGuard>
  );
}
