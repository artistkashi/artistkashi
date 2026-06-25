"use client";

import { unwrap, unwrapPaginated } from "@/api/client-service";
import {
  createAddress,
  createOrder,
  listAddresses,
  OrderRead,
  verifyPayment,
} from "@/api/openapi-client";
import { GhostBtn, PrimaryBtn } from "@/components/ui/buttons";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { ModalType, StatusModal } from "@/components/ui/StatusModal";
import { useAuth } from "@/lib/auth-store";
import { useCheckoutStore } from "@/lib/checkout-store";
import { cn, displayPrice } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Minus, Plus, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────────

type CheckoutStep = "address" | "summary" | "payment" | "success";

// ─── Custom Hooks ──────────────────────────────────────────────────────────

function useAddresses() {
  return useQuery({
    queryKey: ["addresses"],
    queryFn: async () => {
      const { data } = await unwrapPaginated(listAddresses({}));
      return data;
    },
  });
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function CheckoutPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { items: checkoutItems, clearCheckout, updateItemQuantity } =
    useCheckoutStore();

  const [step, setStep] = useState<CheckoutStep>("address");
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(
    null
  );
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type: ModalType;
    title: string;
    message: string;
    actionText?: string;
    onAction?: () => void;
  }>({
    isOpen: false,
    type: "success",
    title: "",
    message: "",
  });

  const { data: addresses, refetch: refetchAddresses } = useAddresses();

  // Handle hydration
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Redirect if no items
  useEffect(() => {
    if (hasHydrated && checkoutItems.length === 0 && step !== "success") {
      router.push("/shop");
    }
  }, [checkoutItems, step, router, hasHydrated]);

  // Auto-select default address
  useEffect(() => {
    if (addresses && addresses.length > 0 && !selectedAddressId) {
      const defaultAddr = addresses.find((a) => a.is_default) || addresses[0];
      setSelectedAddressId(defaultAddr.id);
      setStep("summary"); // If address exists, show summary directly as requested
    }
  }, [addresses, selectedAddressId]);

  const subtotal = checkoutItems.reduce((acc, item) => {
    const price =
      typeof item.price === "string" ? parseFloat(item.price) : item.price;
    return acc + price * item.quantity;
  }, 0);

  const PACKAGING_FEE = 99;

  const handleCreateOrder = async () => {
    if (!selectedAddressId) {
      setModalConfig({
        isOpen: true,
        type: "warning",
        title: "Address Required",
        message: "Please select or add a shipping address to continue.",
        actionText: "UNDERSTOOD",
      });
      return;
    }

    setIsCreatingOrder(true);
    try {
      const orderData = {
        total_amount: subtotal.toString(),
        shipping_address_id: selectedAddressId,
        billing_address_id: selectedAddressId,
        payment_method: "razorpay",
        items: checkoutItems.map((item) => ({
          product_id: item.product_id,
          variant_id: item.variant_id,
          course_id: item.course_id,
          quantity: item.quantity,
          price: item.price.toString(),
        })),
      };

      const order = await unwrap(createOrder({ body: orderData }));
      setStep("payment");

      // Initialize Razorpay here
      handleRazorpayPayment(order);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create order";
      setModalConfig({
        isOpen: true,
        type: "error",
        title: "Order Failed",
        message: message,
        actionText: "TRY AGAIN",
      });
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleRazorpayPayment = (order: OrderRead) => {
    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: order.total_amount,
      currency: "INR",
      name: "ArtistKashi",
      description: "Secure Acquisition",
      order_id: order.razorpay_order_id,
      handler: async function (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) {
        setIsVerifyingPayment(true);
        try {
          const verificationData = {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          };

          await unwrap(
            verifyPayment({
              path: { order_id: order.id },
              body: verificationData,
            })
          );

          setModalConfig({
            isOpen: true,
            type: "success",
            title: "Payment Successful",
            message:
              "Your vision has been secured. A confirmation of provenance has been sent to your email.",
            actionText: "GO TO DASHBOARD",
            onAction: () => {
              setModalConfig((prev) => ({ ...prev, isOpen: false }));
              router.push("/dashboard");
            },
          });

          setStep("success");
          clearCheckout();
        } catch (err: unknown) {
          console.error("Payment verification failed:", err);
          setIsVerifyingPayment(false);
          setModalConfig({
            isOpen: true,
            type: "error",
            title: "Verification Failed",
            message:
              "We couldn't verify your payment. If money was deducted, please contact support.",
            actionText: "CONTACT SUPPORT",
            onAction: () => {
              setModalConfig((prev) => ({ ...prev, isOpen: false }));
              router.push("/contact");
            },
          });
        }
      },
      prefill: {
        name: user?.full_name,
        email: user?.email,
      },
      theme: {
        color: "#D4AF37",
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  if (step === "success") {
    return (
      <div className="pt-32 pb-24 px-6 bg-background min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full text-center space-y-8">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex justify-center"
          >
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
              <CheckCircle2 className="w-12 h-12 text-primary gold-glow" />
            </div>
          </motion.div>
          <div className="space-y-4">
            <h1 className="text-5xl font-extrabold uppercase tracking-tighter text-text-main leading-none">
              Acquisition Confirmed
            </h1>
            <p className="text-text-muted text-xs uppercase tracking-widest leading-loose font-mono max-w-sm mx-auto">
              Your vision has been secured. A confirmation of provenance has
              been sent to your digital address.
            </p>
          </div>
          <div className="pt-8 flex flex-col gap-4">
            <Link href="/dashboard" className="w-full">
              <PrimaryBtn className="w-full py-5 text-2xs tracking-widest justify-center">
                VIEW COLLECTION IN DASHBOARD
              </PrimaryBtn>
            </Link>
            <Link href="/shop" className="w-full">
              <GhostBtn className="w-full py-5 text-2xs tracking-widest justify-center border-border/90">
                CONTINUE EXPLORING
              </GhostBtn>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const selectedAddress = addresses?.find((a) => a.id === selectedAddressId);

  if (isVerifyingPayment) {
    return (
      <div className="pt-32 pb-24 px-6 bg-background min-h-screen flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold uppercase tracking-widest text-text-muted">
            Verifying your payment…
          </p>
        </div>
      </div>
    );
  }

  if (!hasHydrated) return null;

  return (
    <div className="pt-32 pb-24 px-6 min-h-screen">
      {/* Razorpay Script */}
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Flow steps */}
        <div className="lg:col-span-8 space-y-8">
          {/* 1. SHIPPING ADDRESS */}
          <section className="bg-surface/30 border border-border/90 rounded-sm overflow-hidden">
            <div className="bg-dark/40 px-6 py-4 border-b border-border/90 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 bg-primary text-dark text-xs font-bold rounded flex items-center justify-center">
                  1
                </span>
                <h2 className="text-xs font-bold uppercase tracking-widest text-text-main">
                  Delivery Address
                </h2>
              </div>
              {step !== "address" && (
                <button
                  onClick={() => setStep("address")}
                  className="text-primary text-2xs font-bold uppercase tracking-widest hover:underline"
                >
                  Change
                </button>
              )}
            </div>

            <div className="p-6">
              {step === "address" ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses?.map((addr) => (
                      <button
                        key={addr.id}
                        onClick={() => setSelectedAddressId(addr.id)}
                        className={cn(
                          "p-4 border text-left transition-all relative rounded-sm group",
                          selectedAddressId === addr.id
                            ? "border-primary bg-primary/5 shadow-[0_0_15px_rgba(212,175,55,0.05)]"
                            : "border-border/90 hover:border-primary/40"
                        )}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-2xs font-mono text-primary uppercase tracking-widest">
                            {addr.is_default ? "Default Address" : "Alternate"}
                          </span>
                          {selectedAddressId === addr.id && (
                            <CheckCircle2 size={14} className="text-primary" />
                          )}
                        </div>
                        <p className="text-sm text-text-main font-medium">
                          {addr.line1}
                        </p>
                        {addr.line2 && (
                          <p className="text-xs text-text-muted mt-0.5">
                            {addr.line2}
                          </p>
                        )}
                        <p className="text-xs text-text-muted mt-2 uppercase font-mono tracking-tighter">
                          {addr.city}, {addr.state} {addr.postal_code}
                        </p>
                        <p className="text-xs text-text-muted mt-1 uppercase font-mono tracking-tighter">
                          {addr.country}
                        </p>
                        <div className="mt-4 pt-4 border-t border-border/10 flex justify-between items-center">
                          <span className="text-2xs text-text-muted/60 font-mono">
                            {addr.phone}
                          </span>
                          {selectedAddressId === addr.id && (
                            <PrimaryBtn
                              onClick={() => setStep("summary")}
                              className="py-1.5 px-3 text-[9px] tracking-widest"
                            >
                              DELIVER HERE
                            </PrimaryBtn>
                          )}
                        </div>
                      </button>
                    ))}

                    <button
                      onClick={() => setShowAddressForm(true)}
                      className="p-8 border border-dashed border-border/90 rounded-sm flex flex-col items-center justify-center gap-3 text-text-muted hover:border-primary/40 hover:text-primary transition-all group"
                    >
                      <Plus
                        size={24}
                        className="opacity-40 group-hover:opacity-100 transition-opacity"
                      />
                      <span className="text-2xs font-bold uppercase tracking-[0.2em]">
                        Add New Address
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-sm text-text-main font-bold uppercase tracking-tight">
                      {user?.full_name}{" "}
                      <span className="text-text-muted ml-2 font-mono text-2xs tracking-widest">
                        {selectedAddress?.phone}
                      </span>
                    </p>
                    <p className="text-xs text-text-muted">
                      {selectedAddress?.line1},{" "}
                      {selectedAddress?.line2 && `${selectedAddress.line2}, `}
                      {selectedAddress?.city}, {selectedAddress?.state} -{" "}
                      {selectedAddress?.postal_code}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 2. ORDER SUMMARY */}
          <section
            className={cn(
              "bg-surface/30 border border-border/90 rounded-sm overflow-hidden transition-all duration-500",
              step === "address"
                ? "opacity-40 grayscale pointer-events-none"
                : "opacity-100"
            )}
          >
            <div className="bg-dark/40 px-6 py-4 border-b border-border/90 flex items-center gap-3">
              <span className="w-6 h-6 bg-primary text-dark text-xs font-bold rounded flex items-center justify-center">
                2
              </span>
              <h2 className="text-xs font-bold uppercase tracking-widest text-text-main">
                Order Summary
              </h2>
            </div>

            <div className="p-6">
              {step === "summary" || step === "payment" ? (
                <div className="space-y-8">
                  <div className="space-y-4">
                    {checkoutItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex gap-6 pb-6 border-b border-border/10 last:border-0 last:pb-0"
                      >
                        <div className="relative w-20 aspect-4/5 bg-muted-light/5 border border-border/90 rounded-sm overflow-hidden shrink-0">
                          {item.image && (
                            <ImageWithFallback
                              src={item.image}
                              alt={item.title}
                              unoptimized
                              fill
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                          <div>
                            <h3 className="text-sm font-bold text-text-main uppercase tracking-tight truncate">
                              {item.title}
                            </h3>
                            <p className="text-2xs font-mono text-primary uppercase tracking-widest mt-1">
                              {item.variant_name}
                            </p>
                          </div>
                          <div className="flex justify-between items-end">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-text-muted">
                                Qty:
                              </span>
                              {step === "summary" ? (
                                <div className="flex items-center border border-border/60 rounded-sm">
                                  <button
                                    onClick={() =>
                                      updateItemQuantity(
                                        idx,
                                        item.quantity - 1
                                      )
                                    }
                                    disabled={item.quantity <= 1}
                                    className="w-7 h-7 flex items-center justify-center text-text-muted hover:text-text-main hover:bg-muted/50 transition-colors disabled:opacity-30"
                                  >
                                    <Minus size={10} />
                                  </button>
                                  <span className="w-8 text-center text-xs font-mono text-text-main">
                                    {item.quantity}
                                  </span>
                                  <button
                                    onClick={() =>
                                      updateItemQuantity(
                                        idx,
                                        item.quantity + 1
                                      )
                                    }
                                    className="w-7 h-7 flex items-center justify-center text-text-muted hover:text-text-main hover:bg-muted/50 transition-colors"
                                  >
                                    <Plus size={10} />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs font-mono text-text-main">
                                  {item.quantity}
                                </span>
                              )}
                            </div>
                            <span className="text-sm font-bold text-text-main">
                              {displayPrice(item.price)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {step === "summary" && (
                    <div className="pt-4 flex justify-end">
                      <PrimaryBtn
                        onClick={() => handleCreateOrder()}
                        disabled={isCreatingOrder}
                        className="px-10 py-4 text-2xs tracking-[0.3em] font-bold"
                      >
                        {isCreatingOrder ? "PREPARING..." : "CONFIRM & PAY"}
                      </PrimaryBtn>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </section>

          {/* 3. PAYMENT OPTIONS (Summary of payment method) */}
          <section
            className={cn(
              "bg-surface/30 border border-border/90 rounded-sm overflow-hidden transition-all duration-500",
              step !== "payment"
                ? "opacity-40 grayscale pointer-events-none"
                : "opacity-100"
            )}
          >
            <div className="bg-dark/40 px-6 py-4 border-b border-border/90 flex items-center gap-3">
              <span className="w-6 h-6 bg-primary text-dark text-xs font-bold rounded flex items-center justify-center">
                3
              </span>
              <h2 className="text-xs font-bold uppercase tracking-widest text-text-main">
                Payment Options
              </h2>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-4 p-4 border border-primary bg-primary/5 rounded-sm">
                <div className="w-10 h-10 bg-dark flex items-center justify-center rounded border border-border/90">
                  <img
                    src="https://razorpay.com/favicon.png"
                    className="w-6 h-6"
                    alt="Razorpay"
                  />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-text-main">
                    Razorpay Secure Gateway
                  </p>
                  <p className="text-2xs font-mono text-text-muted uppercase tracking-tighter">
                    UPI, Cards, Netbanking enabled
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Price Details */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface/30 border border-border/90 rounded-sm overflow-hidden sticky top-32">
            <div className="bg-dark/40 px-6 py-4 border-b border-border/90">
              <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted">
                Price Details
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between text-xs uppercase tracking-widest text-text-muted">
                  <span>Price ({checkoutItems.length} items)</span>
                  <span className="font-mono">{displayPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs uppercase tracking-widest text-text-muted">
                  <span>Delivery Charges</span>
                  <span className="text-primary font-mono font-bold tracking-tighter">
                    FREE
                  </span>
                </div>
                <div className="flex justify-between text-xs uppercase tracking-widest text-text-muted">
                  <span>Secured Packaging Fee</span>
                  <span className="font-mono">₹99</span>
                </div>
              </div>

              <div className="pt-6 border-t border-dashed border-border/90 flex justify-between items-baseline">
                <span className="text-sm font-bold uppercase tracking-widest text-text-main">
                  Total Amount
                </span>
                <span className="text-2xl font-bold text-primary tracking-tighter">
                  {displayPrice(subtotal + 99)}
                </span>
              </div>

              <p className="text-2xs font-mono text-text-muted uppercase tracking-tighter italic border-t border-border/10 pt-4 leading-relaxed">
                * Final valuation inclusive of taxes and cinematic preservation
                fees.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-2 text-2xs text-text-muted uppercase tracking-widest font-mono opacity-60">
            <ShieldCheck size={14} className="text-primary" /> Safe and Secure
            Payments. 100% Authentic Art.
          </div>
        </div>
      </div>

      {/* Address Form Modal - To be implemented for full flow */}
      <AnimatePresence>
        {showAddressForm && (
          <AddressFormModal
            onClose={() => setShowAddressForm(false)}
            onSuccess={() => {
              setShowAddressForm(false);
              refetchAddresses();
            }}
          />
        )}
      </AnimatePresence>

      <StatusModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        actionText={modalConfig.actionText}
        onAction={modalConfig.onAction}
      />
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function AddressFormModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      line1: formData.get("line1") as string,
      line2: (formData.get("line2") as string) || undefined,
      city: formData.get("city") as string,
      state: formData.get("state") as string,
      postal_code: formData.get("postal_code") as string,
      country: formData.get("country") as string,
      phone: formData.get("phone") as string,
      is_default: formData.get("is_default") === "on",
    };

    try {
      await unwrap(createAddress({ body: payload }));
      toast.success("New location archived.");
      onSuccess();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to record address.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-100 bg-dark/95 backdrop-blur-xl flex items-center justify-center p-6"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="w-full max-w-xl bg-surface border border-border/90 rounded-sm shadow-2xl overflow-hidden"
      >
        <div className="px-8 py-6 border-b border-border/10 flex justify-between items-center bg-dark/40">
          <div className="space-y-1">
            <h2 className="text-lg font-bold uppercase tracking-widest text-text-main">
              Add Shipping Location
            </h2>
            <p className="text-2xs font-mono text-gold/60 uppercase tracking-widest">
              New Delivery Archive
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-primary transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-2xs font-bold uppercase tracking-widest text-text-muted ml-1">
                Street Address
              </label>
              <input
                name="line1"
                required
                className="checkout-input w-full"
                placeholder="e.g. 123 Gallery Street"
              />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-2xs font-bold uppercase tracking-widest text-text-muted ml-1">
                Apartment, suite, etc. (optional)
              </label>
              <input
                name="line2"
                className="checkout-input w-full"
                placeholder="e.g. Suite 4B"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-2xs font-bold uppercase tracking-widest text-text-muted ml-1">
                City
              </label>
              <input
                name="city"
                required
                className="checkout-input w-full"
                placeholder="City"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-2xs font-bold uppercase tracking-widest text-text-muted ml-1">
                State / Province
              </label>
              <input
                name="state"
                required
                className="checkout-input w-full"
                placeholder="State"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-2xs font-bold uppercase tracking-widest text-text-muted ml-1">
                Postal Code
              </label>
              <input
                name="postal_code"
                required
                className="checkout-input w-full"
                placeholder="Postal Code"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-2xs font-bold uppercase tracking-widest text-text-muted ml-1">
                Country
              </label>
              <input
                name="country"
                required
                className="checkout-input w-full"
                placeholder="India"
                defaultValue="India"
              />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-2xs font-bold uppercase tracking-widest text-text-muted ml-1">
                Contact Phone
              </label>
              <input
                name="phone"
                required
                className="checkout-input w-full"
                placeholder="+91 00000 00000"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              name="is_default"
              id="is_default"
              className="accent-primary w-4 h-4"
            />
            <label
              htmlFor="is_default"
              className="text-xs text-text-muted uppercase tracking-widest select-none cursor-pointer"
            >
              Set as default delivery address
            </label>
          </div>

          <div className="pt-6 flex gap-4">
            <PrimaryBtn
              type="submit"
              disabled={isSubmitting}
              className="flex-1 justify-center py-4 text-xs tracking-widest"
            >
              {isSubmitting ? "ARCHIVING..." : "SAVE ADDRESS"}
            </PrimaryBtn>
            <GhostBtn
              type="button"
              onClick={onClose}
              className="flex-1 justify-center py-4 text-xs tracking-widest border-border/90"
            >
              CANCEL
            </GhostBtn>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
