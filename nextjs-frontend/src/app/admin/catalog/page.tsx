"use client";

import { PrimaryBtn } from "@/components/ui/buttons";
import {
  useCategories,
  useCourseCategories,
  useCreateCategory,
  useCreateCourseCategory,
  useCreateMedium,
  useCreateVariantType,
  useMediums,
  useVariantTypes,
} from "@/hooks/catalog";
import { getErrorMessage, getValidationErrors } from "@/lib/error-handler";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  FolderOpen,
  Layers,
  Palette,
  Plus,
  RefreshCw,
  Tag,
  XCircle,
} from "lucide-react";
import React, { useState } from "react";
import { useForm, type Path } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CatalogItem {
  id: number | string;
  name: string;
  slug: string;
  description?: string | null;
  is_active: boolean;
  created_at?: string | null;
}

type ActiveTab = "categories" | "mediums" | "variantTypes" | "courseCategories";

const catalogSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

type CatalogFormData = z.infer<typeof catalogSchema>;

// ─── Tab Configuration ────────────────────────────────────────────────────────

const TABS: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
  { key: "categories", label: "Collections", icon: <Tag size={13} /> },
  { key: "mediums", label: "Mediums", icon: <Palette size={13} /> },
  { key: "variantTypes", label: "Variant Types", icon: <Layers size={13} /> },
  { key: "courseCategories", label: "Course Categories", icon: <BookOpen size={13} /> },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CatalogPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("categories");

  // ── Categories
  const {
    categories,
    loading: catLoading,
    error: catError,
    refetch: refetchCategories,
  } = useCategories();
  const { createCategory, creating: creatingCategory } = useCreateCategory();

  // ── Mediums
  const {
    mediums,
    loading: medLoading,
    error: medError,
    refetch: refetchMediums,
  } = useMediums();
  const { createMedium, creating: creatingMedium } = useCreateMedium();

  // ── Variant Types
  const {
    variantTypes,
    loading: vtLoading,
    error: vtError,
    refetch: refetchVariantTypes,
  } = useVariantTypes();
  const { createVariantType, creating: creatingVariantType } =
    useCreateVariantType();

  // ── Course Categories
  const {
    courseCategories,
    loading: ccLoading,
    error: ccError,
    refetch: refetchCourseCategories,
  } = useCourseCategories();
  const { createCourseCategory, creating: creatingCourseCategory } =
    useCreateCourseCategory();

  // ── Handlers

  const handleCreateCategory = async (
    name: string,
    description?: string
  ): Promise<void> => {
    try {
      await createCategory({
        name,
        description: description?.trim() || null,
      });
      toast.success("Collection added to the archive");
      await refetchCategories();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleCreateMedium = async (name: string): Promise<void> => {
    try {
      await createMedium({ name });
      toast.success("Artistic medium preserved");
      await refetchMediums();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleCreateVariantType = async (
    name: string,
    description?: string
  ): Promise<void> => {
    try {
      await createVariantType({
        name,
        description: description?.trim() || null,
      });
      toast.success("Variant format established");
      await refetchVariantTypes();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleCreateCourseCategory = async (
    name: string,
    description?: string
  ): Promise<void> => {
    try {
      await createCourseCategory({
        name,
        description: description?.trim() || null,
      });
      toast.success("Course category saved");
      await refetchCourseCategories();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between gap-4 border-b border-gold/10 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
            <BookOpen className="text-gold" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-[0.15em] text-text-main uppercase">
              Catalog Management
            </h1>
            <p className="text-2xs text-gold/50 font-mono tracking-[0.25em] uppercase mt-0.5">
              Curate your artistic taxonomy
            </p>
          </div>
        </div>

        {/* Summary badges */}
        <div className="hidden md:flex items-center gap-3 shrink-0 pt-1">
          {!catLoading && (
            <StatBadge icon={<Tag size={10} />} count={categories.length} label="Collections" />
          )}
          {!medLoading && (
            <StatBadge icon={<Palette size={10} />} count={mediums.length} label="Mediums" />
          )}
          {!vtLoading && (
            <StatBadge icon={<Layers size={10} />} count={variantTypes.length} label="Formats" />
          )}
          {!ccLoading && (
            <StatBadge icon={<BookOpen size={10} />} count={courseCategories.length} label="Courses" />
          )}
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="border-b border-border -mt-2">
        <div className="flex">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                id={`catalog-tab-${tab.key}`}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-2 px-6 py-4 text-2xs font-mono tracking-widest uppercase",
                  "border-r border-border last:border-r-0 transition-all duration-300 relative",
                  isActive
                    ? "text-gold bg-gold/5"
                    : "text-text-muted hover:text-text-main hover:bg-white/3"
                )}
              >
                {tab.icon}
                {tab.label}
                {/* Active underline indicator */}
                {isActive && (
                  <motion.div
                    layoutId="catalog-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-px bg-gold"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Panels ── */}
      <AnimatePresence mode="wait">
        {activeTab === "categories" && (
          <motion.div
            key="categories"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            <CatalogTabPanel
              entityLabel="Collection"
              entityLabelPlural="Collections"
              icon={<Tag size={15} />}
              items={categories.map((c) => ({
                id: c.id,
                name: c.name,
                slug: c.slug,
                description: c.description,
                is_active: c.is_active,
                created_at: c.created_at,
              }))}
              loading={catLoading}
              error={catError}
              creating={creatingCategory}
              hasDescription
              onRefetch={refetchCategories}
              onSubmit={handleCreateCategory}
              namePlaceholder="e.g. Landscapes, Portraits..."
              examples={["Landscapes", "Portraits", "Abstract", "Still Life", "Wildlife"]}
            />
          </motion.div>
        )}

        {activeTab === "mediums" && (
          <motion.div
            key="mediums"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            <CatalogTabPanel
              entityLabel="Artistic Medium"
              entityLabelPlural="Mediums"
              icon={<Palette size={15} />}
              items={mediums.map((m) => ({
                id: m.id,
                name: m.name,
                slug: m.slug,
                description: null,
                is_active: m.is_active,
                created_at: m.created_at,
              }))}
              loading={medLoading}
              error={medError}
              creating={creatingMedium}
              hasDescription={false}
              onRefetch={refetchMediums}
              onSubmit={async (name) => handleCreateMedium(name)}
              namePlaceholder="e.g. Oil Painting, Acrylic..."
              examples={[
                "Oil Painting",
                "Acrylic",
                "Watercolor",
                "Charcoal",
                "Mixed Media",
              ]}
            />
          </motion.div>
        )}

        {activeTab === "variantTypes" && (
          <motion.div
            key="variantTypes"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            <CatalogTabPanel
              entityLabel="Variant Type"
              entityLabelPlural="Variant Types"
              icon={<Layers size={15} />}
              items={variantTypes.map((vt) => ({
                id: vt.id,
                name: vt.name,
                slug: vt.slug,
                description: vt.description,
                is_active: vt.is_active,
                created_at: vt.created_at,
              }))}
              loading={vtLoading}
              error={vtError}
              creating={creatingVariantType}
              hasDescription
              onRefetch={refetchVariantTypes}
              onSubmit={handleCreateVariantType}
              namePlaceholder="e.g. Original, Canvas Print..."
              examples={[
                "Original",
                "Canvas Print",
                "Framed Print",
                "Limited Edition Print",
              ]}
            />
          </motion.div>
        )}

        {activeTab === "courseCategories" && (
          <motion.div
            key="courseCategories"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            <CatalogTabPanel
              entityLabel="Course Category"
              entityLabelPlural="Course Categories"
              icon={<BookOpen size={15} />}
              items={courseCategories.map((cc) => ({
                id: cc.id,
                name: cc.name,
                slug: cc.slug,
                description: cc.description,
                is_active: cc.is_active ?? true,
                created_at: cc.created_at,
              }))}
              loading={ccLoading}
              error={ccError}
              creating={creatingCourseCategory}
              hasDescription
              onRefetch={refetchCourseCategories}
              onSubmit={handleCreateCourseCategory}
              namePlaceholder="e.g. Beginner, Advanced, Acrylic..."
              examples={[
                "Beginner",
                "Oil Painting",
                "Sketching",
                "Advanced Techniques",
              ]}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── StatBadge ────────────────────────────────────────────────────────────────

function StatBadge({
  icon,
  count,
  label,
}: {
  icon: React.ReactNode;
  count: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-dark/40 border border-border/60">
      <span className="text-gold">{icon}</span>
      <span className="text-text-main text-2xs font-mono font-bold">
        {count}
      </span>
      <span className="text-text-muted text-2xs font-mono tracking-wider uppercase">
        {label}
      </span>
    </div>
  );
}

// ─── CatalogTabPanel ──────────────────────────────────────────────────────────

interface CatalogTabPanelProps {
  entityLabel: string;
  entityLabelPlural: string;
  icon: React.ReactNode;
  items: CatalogItem[];
  loading: boolean;
  error: string | null;
  creating: boolean;
  hasDescription: boolean;
  onRefetch: () => Promise<void>;
  onSubmit: (name: string, description?: string) => Promise<void>;
  namePlaceholder: string;
  examples: string[];
}

function CatalogTabPanel({
  entityLabel,
  entityLabelPlural,
  icon,
  items,
  loading,
  error,
  creating,
  hasDescription,
  onRefetch,
  onSubmit,
  namePlaceholder,
  examples,
}: CatalogTabPanelProps) {
  const form = useForm<CatalogFormData>({
    resolver: zodResolver(catalogSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const {
    register,
    handleSubmit: handleRHFSubmit,
    reset,
    setValue,
    setError,
    formState: { errors },
  } = form;

  const handleFormSubmit = async (data: CatalogFormData) => {
    try {
      await onSubmit(data.name.trim(), hasDescription ? data.description : undefined);
      reset({ name: "", description: "" });
    } catch (err) {
      const validationErrors = getValidationErrors(err);
      if (validationErrors) {
        Object.entries(validationErrors).forEach(([field, messages]) => {
          if (field.startsWith("payload.")) {
            const rhfField = field.replace(/^payload\./, "") as Path<CatalogFormData>;
            setError(rhfField, { type: "server", message: messages[0] });
          }
        });
        toast.error("Validation failed. Please review the fields.");
      } else {
        toast.error(getErrorMessage(err));
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 items-start">
      {/* ── Create Form ── */}
      <div className="bg-muted-light/60 border border-border overflow-hidden">
        {/* Form header */}
        <div className="px-6 py-4 border-b border-border bg-dark/20 flex items-center gap-3">
          <div className="w-8 h-8 bg-gold/10 border border-gold/20 flex items-center justify-center text-gold shrink-0">
            {icon}
          </div>
          <div>
            <p className="text-sm font-bold tracking-[0.12em] text-text-main uppercase">
              Add {entityLabel}
            </p>
            <p className="text-2xs text-gold/40 font-mono tracking-[0.15em] uppercase mt-0.5">
              Expand your taxonomy
            </p>
          </div>
        </div>

        {/* Form body */}
        <form onSubmit={handleRHFSubmit(handleFormSubmit)} className="p-6 space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <label
              htmlFor="catalog-name"
              className="text-label font-mono tracking-widest uppercase text-text-muted block"
            >
              Name{" "}
              <span className="text-gold" aria-hidden="true">
                *
              </span>
            </label>
            <input
              id="catalog-name"
              type="text"
              {...register("name")}
              placeholder={namePlaceholder}
              className={cn(
                "w-full bg-dark/40 border px-4 py-3 text-sm text-text-main focus:outline-none focus:bg-dark/60 transition-all duration-300 placeholder:text-text-muted/30 rounded-sm",
                errors.name ? "border-red-500/50 focus:border-red-500" : "border-border/60 focus:border-gold/50"
              )}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          {/* Description */}
          {hasDescription && (
            <div className="space-y-2">
              <label
                htmlFor="catalog-description"
                className="text-label font-mono tracking-widest uppercase text-text-muted block"
              >
                Description{" "}
                <span className="text-text-muted/40 normal-case text-2xs tracking-normal font-sans">
                  (optional)
                </span>
              </label>
              <textarea
                id="catalog-description"
                {...register("description")}
                placeholder="Brief description..."
                rows={3}
                className={cn(
                  "w-full bg-dark/40 border px-4 py-3 text-sm text-text-main focus:outline-none focus:bg-dark/60 transition-all duration-300 resize-none placeholder:text-text-muted/30 rounded-sm",
                  errors.description ? "border-red-500/50 focus:border-red-500" : "border-border/60 focus:border-gold/50"
                )}
              />
              {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
            </div>
          )}

          {/* Quick-fill examples */}
          <div className="pt-1">
            <p className="text-2xs font-mono uppercase tracking-widest text-text-muted/40 mb-3">
              Quick fill
            </p>
            <div className="flex flex-wrap gap-2">
              {examples.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setValue("name", example, { shouldValidate: true })}
                  className="px-3 py-1 text-2xs font-mono tracking-wider border border-border/40 text-text-muted hover:border-gold/40 hover:text-gold transition-all rounded-sm"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <PrimaryBtn
            type="submit"
            disabled={creating}
            className={cn(
              "w-full justify-center gap-2.5 px-6 py-3"
            )}
          >
            {creating ? (
              <div className="luxury-loader scale-50" />
            ) : (
              <>
                <Plus size={15} />
                Add {entityLabel}
              </>
            )}
          </PrimaryBtn>
        </form>
      </div>

      {/* ── Item List ── */}
      <div className="min-h-0">
        {/* List header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold tracking-[0.12em] text-text-main uppercase">
              {entityLabelPlural}
            </h3>
            {!loading && !error && (
              <span className="px-2 py-0.5 bg-gold/10 border border-gold/20 text-gold text-2xs font-mono font-bold tracking-widest">
                {items.length}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => void onRefetch()}
            className="flex items-center gap-1.5 text-2xs font-mono uppercase tracking-widest text-text-muted hover:text-gold transition-colors"
          >
            <RefreshCw size={11} />
            Refresh
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-17 bg-muted-light/30 border border-border animate-pulse"
                style={{ opacity: 1 - i * 0.18 }}
              />
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border border-red-500/20 bg-red-500/5 p-6 flex items-start gap-4"
          >
            <AlertCircle
              size={18}
              className="text-red-400 shrink-0 mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-400">{error}</p>
              <button
                type="button"
                onClick={() => void onRefetch()}
                className="mt-3 flex items-center gap-1.5 text-2xs font-mono uppercase tracking-widest text-red-400/60 hover:text-red-400 transition-colors"
              >
                <RefreshCw size={10} />
                Try again
              </button>
            </div>
          </motion.div>
        )}

        {/* Empty state */}
        {!loading && !error && items.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border-2 border-dashed border-border/40 p-14 flex flex-col items-center justify-center text-center"
          >
            <div className="w-14 h-14 bg-gold/5 border border-gold/10 flex items-center justify-center text-gold/25 mb-4">
              <FolderOpen size={26} />
            </div>
            <p className="text-sm font-medium text-text-muted">
              No {entityLabelPlural.toLowerCase()} yet
            </p>
            <p className="text-2xs font-mono text-text-muted/40 tracking-wider mt-1.5">
              Use the form to add your first one
            </p>
          </motion.div>
        )}

        {/* Item cards */}
        {!loading && !error && items.length > 0 && (
          <div className="space-y-2">
            <AnimatePresence>
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(index * 0.04, 0.3) }}
                  className={cn(
                    "flex items-center gap-4 px-5 py-4",
                    "bg-muted-light/40 border border-border",
                    "hover:border-gold/20 hover:bg-dark/20 transition-all duration-300 group"
                  )}
                >
                  {/* Active dot */}
                  <div
                    className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0 transition-colors duration-300",
                      item.is_active
                        ? "bg-gold group-hover:shadow-[0_0_6px_rgba(184,157,92,0.6)]"
                        : "bg-text-muted/20"
                    )}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-medium text-text-main group-hover:text-gold transition-colors duration-300 truncate">
                        {item.name}
                      </span>
                      {item.is_active ? (
                        <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 bg-green/10 border border-green/20 text-green text-2xs font-mono tracking-widest uppercase shrink-0">
                          <CheckCircle2 size={8} />
                          Active
                        </span>
                      ) : (
                        <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 bg-red/10 border border-red/20 text-red text-2xs font-mono tracking-widest uppercase shrink-0">
                          <XCircle size={8} />
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-2xs font-mono text-text-muted/40 tracking-wider shrink-0">
                        /{item.slug}
                      </span>
                      {item.description && (
                        <span className="text-2xs text-text-muted/50 truncate">
                          {item.description}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date */}
                  {item.created_at && (
                    <div className="text-2xs font-mono text-text-muted/30 tracking-wider shrink-0 hidden md:block">
                      {new Date(item.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
