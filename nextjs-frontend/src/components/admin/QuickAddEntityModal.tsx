"use client";

import {
  ProductCategoryRead,
  ProductMediumRead,
  VariantTypeRead,
} from "@/api/openapi-client";
import {
  useCreateCategory,
  useCreateMedium,
  useCreateVariantType,
} from "@/hooks/catalog";
import { getErrorMessage, getValidationErrors } from "@/lib/error-handler";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { Layers, Palette, Tag, X } from "lucide-react";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "@/lib/toast";
import { z } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────────

export type QuickAddEntityType = "category" | "medium" | "variantType";

export interface QuickAddCreatedEntity {
  id: number;
  name: string;
  slug: string;
}

interface QuickAddEntityModalProps {
  isOpen: boolean;
  entityType: QuickAddEntityType;
  onClose: () => void;
  onCreated: (entity: QuickAddCreatedEntity) => void;
}

const quickAddSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

type QuickAddFormData = z.infer<typeof quickAddSchema>;

// ─── Config ───────────────────────────────────────────────────────────────────

interface EntityConfig {
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  hasDescription: boolean;
  namePlaceholder: string;
}

const ENTITY_CONFIG: Record<QuickAddEntityType, EntityConfig> = {
  category: {
    label: "Collection",
    subtitle: "Add a new artwork category",
    icon: <Tag size={16} />,
    hasDescription: true,
    namePlaceholder: "e.g. Landscapes, Portraits...",
  },
  medium: {
    label: "Artistic Medium",
    subtitle: "Add a new artistic medium",
    icon: <Palette size={16} />,
    hasDescription: false,
    namePlaceholder: "e.g. Oil Painting, Acrylic...",
  },
  variantType: {
    label: "Variant Type",
    subtitle: "Add a new product variant format",
    icon: <Layers size={16} />,
    hasDescription: true,
    namePlaceholder: "e.g. Original, Canvas Print...",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function QuickAddEntityModal({
  isOpen,
  entityType,
  onClose,
  onCreated,
}: QuickAddEntityModalProps) {
  const form = useForm<QuickAddFormData>({
    resolver: zodResolver(quickAddSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const {
    register,
    handleSubmit: handleRHFSubmit,
    reset,
    setError,
    formState: { errors },
  } = form;

  const { createCategory, creating: creatingCategory } = useCreateCategory();
  const { createMedium, creating: creatingMedium } = useCreateMedium();
  const { createVariantType, creating: creatingVariantType } =
    useCreateVariantType();

  const creating = creatingCategory || creatingMedium || creatingVariantType;
  const config = ENTITY_CONFIG[entityType];

  // Reset when modal opens or entity type changes
  useEffect(() => {
    if (isOpen) {
      reset({ name: "", description: "" });
    }
  }, [isOpen, entityType, reset]);

  const onSubmit = async (data: QuickAddFormData) => {
    try {
      let created: QuickAddCreatedEntity;

      if (entityType === "category") {
        const result: ProductCategoryRead = await createCategory({
          name: data.name,
          description: data.description?.trim() || null,
        });
        created = { id: result.id, name: result.name, slug: result.slug };
      } else if (entityType === "medium") {
        const result: ProductMediumRead = await createMedium({
          name: data.name,
        });
        created = { id: result.id, name: result.name, slug: result.slug };
      } else {
        const result: VariantTypeRead = await createVariantType({
          name: data.name,
          description: data.description?.trim() || null,
        });
        created = { id: result.id, name: result.name, slug: result.slug };
      }

      toast.success(`${config.label} created successfully`);
      onCreated(created);
    } catch (err) {
      const validationErrors = getValidationErrors(err);
      if (validationErrors) {
        Object.entries(validationErrors).forEach(([field, messages]) => {
          // Remove potential payload prefix if present
          const rhfField = field.replace(
            /^payload\./,
            ""
          ) as keyof QuickAddFormData;
          setError(rhfField, { type: "server", message: messages[0] });
        });
        toast.error("Validation failed. Please check the fields.");
      } else {
        toast.error(getErrorMessage(err));
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          key="quick-add-wrapper"
          className="fixed inset-0 z-60 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-dark/85 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-md bg-muted-light border border-border shadow-2xl shadow-black/60 overflow-hidden"
          >
            {/* Gold accent top line */}
            <div className="h-px bg-linear-to-r from-transparent via-gold/50 to-transparent" />

            {/* Header */}
            <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-dark/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gold/10 border border-gold/20 flex items-center justify-center text-gold shrink-0">
                  {config.icon}
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-[0.15em] text-text-main uppercase">
                    New {config.label}
                  </h3>
                  <p className="text-2xs text-gold/50 font-mono tracking-[0.2em] uppercase mt-0.5">
                    {config.subtitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-gold hover:bg-white/5 transition-all rounded-full"
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleRHFSubmit(onSubmit)}
              className="p-6 space-y-5"
            >
              {/* Name field */}
              <div className="space-y-2">
                <label className="text-label font-mono tracking-widest uppercase text-text-muted block">
                  Name{" "}
                  <span className="text-gold" aria-hidden="true">
                    *
                  </span>
                </label>
                <input
                  id="quick-add-name"
                  type="text"
                  {...register("name")}
                  placeholder={config.namePlaceholder}
                  autoFocus
                  className={cn(
                    "w-full bg-dark/40 border px-4 py-3 text-sm text-text-main focus:outline-none focus:bg-dark/60 transition-all duration-300 placeholder:text-text-muted/30 rounded-sm",
                    errors.name
                      ? "border-red-500/50 focus:border-red-500"
                      : "border-border/60 focus:border-gold/50"
                  )}
                />
                {errors.name && (
                  <p className="text-xs text-red-500">{errors.name.message}</p>
                )}
              </div>

              {/* Description field (conditional) */}
              {config.hasDescription && (
                <div className="space-y-2">
                  <label className="text-label font-mono tracking-widest uppercase text-text-muted block">
                    Description{" "}
                    <span className="text-text-muted/40 normal-case text-2xs tracking-normal font-sans">
                      (optional)
                    </span>
                  </label>
                  <textarea
                    id="quick-add-description"
                    {...register("description")}
                    placeholder="Brief description..."
                    rows={3}
                    className={cn(
                      "w-full bg-dark/40 border px-4 py-3 text-sm text-text-main focus:outline-none focus:bg-dark/60 transition-all duration-300 resize-none placeholder:text-text-muted/30 rounded-sm",
                      errors.description
                        ? "border-red-500/50 focus:border-red-500"
                        : "border-border/60 focus:border-gold/50"
                    )}
                  />
                  {errors.description && (
                    <p className="text-xs text-red-500">
                      {errors.description.message}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-5 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-2xs font-mono tracking-[0.3em] uppercase text-text-muted hover:text-text-main transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 px-7 py-2.5",
                    "bg-text-main text-dark text-2xs font-semibold tracking-[0.08em] uppercase",
                    "transition-all duration-300 hover:bg-gold hover:text-dark",
                    "disabled:opacity-40 disabled:cursor-not-allowed"
                  )}
                >
                  {creating ? (
                    <div className="luxury-loader scale-50 -mx-4 -my-2" />
                  ) : (
                    "Create"
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
