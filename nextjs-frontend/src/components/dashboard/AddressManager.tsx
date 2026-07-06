"use client";

import { unwrap, unwrapPaginated } from "@/api/client-service";
import {
  createAddress,
  deleteAddress,
  listAddresses,
  updateAddress,
} from "@/api/openapi-client";
import type { AddressRead } from "@/api/openapi-client";
import { GhostBtn, PrimaryBtn } from "@/components/ui/buttons";
import { Skeleton } from "@/components/ui/Skeleton";
import { AnimatePresence, motion } from "framer-motion";
import {
  MapPin,
  Pen,
  Phone,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";

export function AddressManager() {
  const [addresses, setAddresses] = useState<AddressRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const { data } = await unwrapPaginated(listAddresses({}));
      setAddresses(data);
    } catch {
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await unwrap(deleteAddress({ path: { address_id: id } }));
      toast.success("Address deleted");
      fetchAddresses();
    } catch {
      toast.error("Failed to delete address");
    }
  };

  return (
    <div>
      <h2 className="text-text-main font-bold text-2xl md:text-3xl mb-6">
        Saved Addresses
      </h2>
      <div className="border border-border bg-surface rounded overflow-hidden">
        {loading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="px-6 md:px-8 py-5 md:py-6 space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3.5 w-64" />
                <Skeleton className="h-3 w-48" />
              </div>
            ))}
          </div>
        ) : addresses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-text-muted">
            <MapPin size={32} className="opacity-40" />
            <p className="text-xs font-mono uppercase tracking-widest">
              No addresses saved yet
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {addresses.map((addr) =>
              editingId === addr.id ? (
                <AddressForm
                  key={addr.id}
                  initial={addr}
                  onClose={() => setEditingId(null)}
                  onSuccess={() => {
                    setEditingId(null);
                    fetchAddresses();
                  }}
                />
              ) : (
                <div key={addr.id} className="px-6 md:px-8 py-5 md:py-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {addr.is_default && (
                          <span className="inline-flex items-center gap-1 text-2xs font-mono text-gold uppercase tracking-widest border border-gold/20 bg-gold/5 px-2 py-0.5">
                            <Star size={9} />
                            Default
                          </span>
                        )}
                        <span className="text-2xs font-mono text-text-muted uppercase tracking-wider">
                          {addr.city}, {addr.state}
                        </span>
                      </div>
                      <p className="text-sm text-text-main">
                        {addr.line1}
                        {addr.line2 && <>, {addr.line2}</>}
                      </p>
                      <p className="text-xs font-mono text-text-muted">
                        {[addr.city, addr.state, addr.postal_code]
                          .filter(Boolean)
                          .join(", ")}{" "}
                        — {addr.country}
                      </p>
                      {addr.phone && (
                        <div className="flex items-center gap-1.5 text-2xs font-mono text-text-muted pt-1">
                          <Phone size={10} />
                          {addr.phone}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setEditingId(addr.id)}
                        className="flex items-center justify-center w-8 h-8 border border-border/60 text-text-muted hover:text-gold hover:border-gold/40 transition-all rounded-sm"
                      >
                        <Pen size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(addr.id)}
                        className="flex items-center justify-center w-8 h-8 border border-border/60 text-text-muted hover:text-red-400 hover:border-red-400/40 transition-all rounded-sm"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {!showForm && !loading && (
          <div className="px-6 md:px-8 py-4 border-t border-border">
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 text-2xs font-mono tracking-widest uppercase text-gold hover:text-gold/80 transition-colors"
            >
              <Plus size={14} /> Add New Address
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <AddressFormModal
            onClose={() => setShowForm(false)}
            onSuccess={() => {
              setShowForm(false);
              fetchAddresses();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AddressForm({
  initial,
  onClose,
  onSuccess,
}: {
  initial?: AddressRead;
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
      if (initial) {
        await unwrap(
          updateAddress({ path: { address_id: initial.id }, body: payload })
        );
        toast.success("Address updated");
      } else {
        await unwrap(createAddress({ body: payload }));
        toast.success("Address added");
      }
      onSuccess();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save address";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="px-6 md:px-8 py-5 md:py-6 space-y-4 border-t border-border"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2 space-y-1">
          <label className="text-2xs font-bold uppercase tracking-widest text-text-muted">
            Street Address
          </label>
          <input
            name="line1"
            required
            defaultValue={initial?.line1 ?? ""}
            className="w-full glass-input rounded text-text-main px-4 py-3 text-sm focus:border-gold transition-colors border-border"
          />
        </div>
        <div className="md:col-span-2 space-y-1">
          <label className="text-2xs font-bold uppercase tracking-widest text-text-muted">
            Apartment, suite, etc.
          </label>
          <input
            name="line2"
            defaultValue={initial?.line2 ?? ""}
            className="w-full glass-input rounded text-text-main px-4 py-3 text-sm focus:border-gold transition-colors border-border"
          />
        </div>
        <div className="space-y-1">
          <label className="text-2xs font-bold uppercase tracking-widest text-text-muted">
            City
          </label>
          <input
            name="city"
            required
            defaultValue={initial?.city ?? ""}
            className="w-full glass-input rounded text-text-main px-4 py-3 text-sm focus:border-gold transition-colors border-border"
          />
        </div>
        <div className="space-y-1">
          <label className="text-2xs font-bold uppercase tracking-widest text-text-muted">
            State / Province
          </label>
          <input
            name="state"
            required
            defaultValue={initial?.state ?? ""}
            className="w-full glass-input rounded text-text-main px-4 py-3 text-sm focus:border-gold transition-colors border-border"
          />
        </div>
        <div className="space-y-1">
          <label className="text-2xs font-bold uppercase tracking-widest text-text-muted">
            Postal Code
          </label>
          <input
            name="postal_code"
            required
            defaultValue={initial?.postal_code ?? ""}
            className="w-full glass-input rounded text-text-main px-4 py-3 text-sm focus:border-gold transition-colors border-border"
          />
        </div>
        <div className="space-y-1">
          <label className="text-2xs font-bold uppercase tracking-widest text-text-muted">
            Country
          </label>
          <input
            name="country"
            required
            defaultValue={initial?.country ?? "India"}
            className="w-full glass-input rounded text-text-main px-4 py-3 text-sm focus:border-gold transition-colors border-border"
          />
        </div>
        <div className="md:col-span-2 space-y-1">
          <label className="text-2xs font-bold uppercase tracking-widest text-text-muted">
            Contact Phone
          </label>
          <input
            name="phone"
            required
            defaultValue={initial?.phone ?? ""}
            className="w-full glass-input rounded text-text-main px-4 py-3 text-sm focus:border-gold transition-colors border-border"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <input
          type="checkbox"
          name="is_default"
          id={initial ? `is_default_${initial.id}` : "is_default_new"}
          defaultChecked={initial?.is_default ?? false}
          className="accent-gold w-4 h-4"
        />
        <label
          htmlFor={initial ? `is_default_${initial.id}` : "is_default_new"}
          className="text-xs text-text-muted uppercase tracking-widest select-none cursor-pointer"
        >
          Set as default address
        </label>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <PrimaryBtn
          type="submit"
          disabled={isSubmitting}
          className="px-6! text-xs! py-3!"
        >
          {isSubmitting
            ? "Saving..."
            : initial
              ? "Update Address"
              : "Save Address"}
        </PrimaryBtn>
        <GhostBtn
          type="button"
          onClick={onClose}
          className="px-6! text-xs! py-3!"
        >
          Cancel
        </GhostBtn>
      </div>
    </form>
  );
}

function AddressFormModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
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
            <h3 className="text-lg font-bold uppercase tracking-widest text-text-main">
              Add New Address
            </h3>
            <p className="text-2xs font-mono text-gold/60 uppercase tracking-widest">
              Delivery Location
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-primary transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-8">
          <AddressForm onClose={onClose} onSuccess={onSuccess} />
        </div>
      </motion.div>
    </motion.div>
  );
}
