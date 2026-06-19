"use client";

export const dynamic = "force-dynamic";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { PrimaryBtn } from "@/components/ui/buttons";
import { RevealBlock } from "@/components/ui/misc";
import { useAuth } from "@/lib/auth-store";
import { getErrorMessage } from "@/lib/error-handler";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const { forgotPassword } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsSubmitting(true);
    try {
      await forgotPassword(data.email);
      setSent(true);
      toast.success("Reset link sent", {
        description: "If the account exists, you'll receive a password reset email.",
      });
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
                Forgot Password
              </h1>
              <p className="text-text-muted text-sm mt-2">
                Enter your email address and we'll send you a reset link.
              </p>
            </div>

            {sent ? (
              <div className="border border-border bg-muted-light p-8 text-center">
                <Mail size={32} className="text-gold mx-auto mb-4" />
                <p className="text-text-main font-semibold mb-2">
                  Check your inbox
                </p>
                <p className="text-text-muted text-sm font-mono mb-6">
                  If an account with that email exists, you'll receive a password
                  reset link shortly.
                </p>
                <Link
                  href="/login"
                  className="text-gold text-xs font-mono tracking-widest uppercase hover:text-text-main transition-colors"
                >
                  Back to Sign In
                </Link>
              </div>
            ) : (
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
                <PrimaryBtn
                  type="submit"
                  className="w-full justify-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="luxury-loader scale-75" />
                  ) : (
                    <>
                      Send Reset Link <ArrowRight size={16} />
                    </>
                  )}
                </PrimaryBtn>
              </form>
            )}

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
