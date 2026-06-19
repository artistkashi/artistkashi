"use client";

export const dynamic = "force-dynamic";

import { RevealBlock } from "@/components/ui/misc";
import { useAuth } from "@/lib/auth-store";
import { getErrorMessage } from "@/lib/error-handler";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function VerifyEmailTokenPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { verifyEmail } = useAuth();
  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    "verifying"
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No verification token provided.");
      return;
    }

    let active = true;

    const verify = async () => {
      try {
        await verifyEmail(token);
        if (!active) return;
        setStatus("success");
        toast.success("Email verified successfully");
      } catch (error) {
        if (!active) return;
        setStatus("error");
        setErrorMessage(getErrorMessage(error));
      }
    };

    void verify();

    return () => {
      active = false;
    };
  }, [token, verifyEmail]);

  if (!token) {
    return (
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
            <XCircle size={48} className="text-red mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-text-main mb-4">
              Invalid Link
            </h1>
            <p className="text-text-muted text-sm mb-8">
              No verification token provided. Please check your verification
              email and try again.
            </p>
            <Link
              href="/verify-email"
              className="text-gold text-xs font-mono tracking-widest uppercase hover:text-text-main transition-colors"
            >
              Request New Verification Email
            </Link>
          </RevealBlock>
        </div>
      </main>
    );
  }

  return (
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

          {status === "verifying" && (
            <>
              <div className="luxury-loader luxury-loader-gold loader-lg mx-auto mb-6" />
              <h1 className="text-3xl font-bold text-text-main mb-4">
                Verifying
              </h1>
              <p className="text-text-muted text-sm">
                Please wait while we verify your email address...
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle size={48} className="text-green mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-text-main mb-4">
                Email Verified
              </h1>
              <p className="text-text-muted text-sm mb-8">
                Your email address has been successfully verified. You can now
                access all features.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-gold text-xs font-mono tracking-widest uppercase hover:text-text-main transition-colors"
              >
                <ArrowLeft size={14} /> Sign In
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle size={48} className="text-red mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-text-main mb-4">
                Verification Failed
              </h1>
              <p className="text-text-muted text-sm mb-8">{errorMessage}</p>
              <Link
                href="/verify-email"
                className="text-gold text-xs font-mono tracking-widest uppercase hover:text-text-main transition-colors"
              >
                Request New Verification Email
              </Link>
            </>
          )}
        </RevealBlock>
      </div>
    </main>
  );
}
