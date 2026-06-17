"use client";

import { cn } from "@/lib/utils";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { PrimaryBtn, GhostBtn } from "@/components/ui/buttons";

export default function CheckoutPage() {
  const [step, setStep] = useState<"billing" | "payment" | "success">(
    "billing"
  );
  const [method, setMethod] = useState("razorpay");

  const handleBillingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("payment");
  };

  const handlePaymentSubmit = () => {
    setStep("success");
  };

  if (step === "success") {
    return (
      <div className="pt-32 pb-24 px-6 bg-background min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-8 flex justify-center"
          >
            <CheckCircle2 className="w-24 h-24 text-primary" />
          </motion.div>
          <h1 className="text-5xl italic uppercase tracking-tighter mb-6 text-foreground">
            Acquisition Confirmed
          </h1>
          <p className="text-text-muted text-xs uppercase tracking-widest mb-12 leading-loose font-mono">
            Your vision has been secured. A confirmation of provenance has been
            sent to your digital address.
          </p>
          <Link href="/dashboard" className="inline-block">
            <PrimaryBtn className="px-12 py-5 text-2xs tracking-widest">
              GO TO DASHBOARD
            </PrimaryBtn>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-24 px-6 bg-background min-h-screen font-mono">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-center mb-16">
          <div className="flex items-center gap-4">
            <span
              className={cn(
                "text-2xs font-bold uppercase tracking-widest pb-2 border-b-2 transition-all",
                step === "billing"
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted"
              )}
            >
              01 Identity
            </span>
            <div className="w-8 h-px bg-border" />
            <span
              className={cn(
                "text-2xs font-bold uppercase tracking-widest pb-2 border-b-2 transition-all",
                step === "payment"
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted"
              )}
            >
              02 Payment
            </span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === "billing" ? (
            <motion.div
              key="billing"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-12"
            >
              <h1 className="text-6xl italic uppercase tracking-tighter text-center text-foreground font-sans">
                Identity & Address
              </h1>
              <form className="space-y-12" onSubmit={handleBillingSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <h3 className="text-2xs uppercase tracking-widest font-bold border-b border-border pb-2 text-primary">
                      Curatorial Info
                    </h3>
                    <div className="space-y-6">
                      <input
                        type="text"
                        placeholder="FIRST NAME"
                        className="w-full bg-transparent border-b border-border py-4 text-xs tracking-widest uppercase focus:border-primary transition-colors outline-none text-foreground placeholder:text-text-muted/40"
                        required
                      />
                      <input
                        type="text"
                        placeholder="LAST NAME"
                        className="w-full bg-transparent border-b border-border py-4 text-xs tracking-widest uppercase focus:border-primary transition-colors outline-none text-foreground placeholder:text-text-muted/40"
                        required
                      />
                      <input
                        type="email"
                        placeholder="EMAIL ADDRESS"
                        className="w-full bg-transparent border-b border-border py-4 text-xs tracking-widest uppercase focus:border-primary transition-colors outline-none text-foreground placeholder:text-text-muted/40"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-8">
                    <h3 className="text-2xs uppercase tracking-widest font-bold border-b border-border pb-2 text-primary">
                      Logistics
                    </h3>
                    <div className="space-y-6">
                      <input
                        type="text"
                        placeholder="STREET ADDRESS"
                        className="w-full bg-transparent border-b border-border py-4 text-xs tracking-widest uppercase focus:border-primary transition-colors outline-none text-foreground placeholder:text-text-muted/40"
                        required
                      />
                      <div className="grid grid-cols-2 gap-8">
                        <input
                          type="text"
                          placeholder="CITY"
                          className="w-full bg-transparent border-b border-border py-4 text-xs tracking-widest uppercase focus:border-primary transition-colors outline-none text-foreground placeholder:text-text-muted/40"
                          required
                        />
                        <input
                          type="text"
                          placeholder="POSTAL CODE"
                          className="w-full bg-transparent border-b border-border py-4 text-xs tracking-widest uppercase focus:border-primary transition-colors outline-none text-foreground placeholder:text-text-muted/40"
                          required
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="COUNTRY"
                        className="w-full bg-transparent border-b border-border py-4 text-xs tracking-widest uppercase focus:border-primary transition-colors outline-none text-foreground placeholder:text-text-muted/40"
                        required
                      />
                    </div>
                  </div>
                </div>
                <PrimaryBtn type="submit" className="w-full text-2xs tracking-[0.4em] py-6">
                  CONTINUE TO PAYMENT
                </PrimaryBtn>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="payment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div className="text-center mb-16">
                <h1 className="text-6xl italic uppercase tracking-tighter mb-4 text-foreground font-sans">
                  Secure Gateway
                </h1>
                <p className="text-text-muted text-xs uppercase tracking-widest">
                  Finalize your acquisition via our encrypted vault.
                </p>
              </div>

              <div className="space-y-6 mb-12">
                <button
                  onClick={() => setMethod("razorpay")}
                  className={cn(
                    "w-full p-8 border text-left transition-all flex items-center justify-between card-luxury hover:border-primary",
                    method === "razorpay"
                      ? "border-primary bg-gold-bg"
                      : "border-border bg-surface"
                  )}
                >
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-foreground flex items-center justify-center rounded-sm">
                      <img
                        src="https://razorpay.com/favicon.png"
                        className="w-8 h-8 object-contain"
                        alt=""
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">
                        Razorpay Gateway
                      </h3>
                      <p className="text-2xs text-text-muted uppercase tracking-widest font-mono">
                        UPI, Cards, Netbanking
                      </p>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full border-2",
                      method === "razorpay"
                        ? "border-primary bg-primary"
                        : "border-border"
                    )}
                  />
                </button>

                <button
                  className={cn(
                    "w-full p-8 border text-left transition-all flex items-center justify-between opacity-50 cursor-not-allowed card-luxury",
                    method === "stripe"
                      ? "border-primary bg-gold-bg"
                      : "border-border bg-surface"
                  )}
                  disabled
                >
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-border/20 flex items-center justify-center rounded-sm">
                        <CreditCard className="w-6 h-6 text-text-muted" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted">
                        Stripe Global
                      </h3>
                      <p className="text-2xs text-text-muted uppercase tracking-widest italic font-mono">
                        Coming Soon
                      </p>
                    </div>
                  </div>
                  <div className="w-4 h-4 rounded-full border-2 border-border" />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <PrimaryBtn
                  onClick={handlePaymentSubmit}
                  className="w-full text-2xs tracking-[0.4em] py-6"
                >
                  INITIALIZE TRANSACTION <ArrowRight className="w-4 h-4" />
                </PrimaryBtn>
                <GhostBtn
                  onClick={() => setStep("billing")}
                  className="w-full text-2xs tracking-[0.4em] py-6"
                >
                  BACK TO IDENTITY
                </GhostBtn>
              </div>

              <div className="mt-8 flex items-center justify-center gap-3 text-2xs text-text-muted uppercase tracking-widest font-mono">
                <ShieldCheck className="w-4 h-4 text-primary" /> SSL Encrypted
                Transaction
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
