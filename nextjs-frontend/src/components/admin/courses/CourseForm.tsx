"use client";

import {
  CourseLevel,
  CourseRead,
  listCourseCategories,
} from "@/api/openapi-client";
import { GhostBtn, PrimaryBtn } from "@/components/ui/buttons";
import { CustomSelect } from "@/components/ui/custom-select";
import { slugify } from "@/lib/slugify";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ImageUp, Play, Plus, Save, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { Controller, Resolver, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

// ── Schema — array items are objects so useFieldArray works correctly ───────

const courseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  short_description: z.string().optional(),
  description: z.string().optional(),
  level: z.enum(["beginner", "intermediate", "advanced"] as const),
  language: z.string().default("english"),
  price: z.coerce.number().min(0.01, "Price must be > 0"),
  welcome_message: z.string().optional(),
  whatsapp_channel_url: z.string().optional(),
  category_id: z.string().nullable().catch(null).default(null),
  what_you_will_learn: z
    .array(z.object({ value: z.string().min(1, "Cannot be empty") }))
    .default(() => []),
  requirements: z
    .array(z.object({ value: z.string().min(1, "Cannot be empty") }))
    .default(() => []),
  demo_video_url: z.string().optional(),
  is_featured: z.boolean().default(false),
  is_published: z.boolean().default(false),
});

type CourseSchemaValues = z.infer<typeof courseSchema>;

// ── External, API-facing shape — plain string arrays ────────────────────────

export interface CourseFormValues {
  title: string;
  slug: string;
  short_description?: string;
  description?: string;
  level: "beginner" | "intermediate" | "advanced";
  language: string;
  price: number;
  welcome_message?: string;
  whatsapp_channel_url?: string;
  category_id: string | null;
  what_you_will_learn: string[];
  requirements: string[];
  is_featured: boolean;
  is_published: boolean;
  thumbnail?: File | null;
  thumbnail_url?: string | null;
  demo_video?: File | null;
  demo_video_url?: string | null;
}

interface CourseFormProps {
  initialData?: CourseRead | null;
  onSubmit: (data: CourseFormValues) => Promise<void> | void;
  isSubmitting: boolean;
}

// ── Local UI components ──────────────────────────────────────────────────────

function Label({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "text-label! font-mono tracking-widest uppercase text-text-muted block mb-2",
        className
      )}
    >
      {children}
    </label>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...rest }, ref) => (
    <div className="space-y-1 w-full">
      <input
        ref={ref}
        type={type}
        className={cn(
          "w-full bg-surface border border-border px-4 py-3 text-sm text-foreground rounded-sm focus:border-primary outline-none transition-all duration-300 placeholder:text-text-muted/50 font-mono",
          type === "number" &&
            "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          error && "border-danger danger-glow",
          className
        )}
        {...rest}
      />
      {error && <p className="text-xs text-danger font-mono mt-1">{error}</p>}
    </div>
  )
);
Input.displayName = "Input";

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, error, ...rest }, ref) => (
    <div className="space-y-1 w-full">
      <textarea
        ref={ref}
        className={cn(
          "w-full bg-surface border border-border px-4 py-3 text-sm text-foreground rounded-sm focus:border-primary outline-none transition-all duration-300 resize-none placeholder:text-text-muted/50 font-mono",
          error && "border-danger danger-glow",
          className
        )}
        {...rest}
      />
      {error && <p className="text-xs text-danger font-mono mt-1">{error}</p>}
    </div>
  )
);
TextArea.displayName = "TextArea";

function Checkbox({
  id,
  checked,
  onCheckedChange,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (c: boolean) => void;
}) {
  return (
    <CheckboxPrimitive.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      className="h-5 w-5 border border-border data-[state=checked]:border-primary transition-all duration-300 bg-surface flex items-center justify-center group/cb hover:border-primary rounded"
    >
      <CheckboxPrimitive.Indicator>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-2.5 h-2.5 bg-primary gold-glow rounded-sm"
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────

export function CourseForm({
  initialData,
  onSubmit,
  isSubmitting,
}: CourseFormProps) {
  const router = useRouter();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CourseSchemaValues>({
    resolver: zodResolver(courseSchema) as Resolver<CourseSchemaValues>,
    defaultValues: {
      title: initialData?.title ?? "",
      slug: initialData?.slug ?? "",
      short_description: initialData?.short_description ?? "",
      description: initialData?.description ?? "",
      level: (initialData?.level as CourseLevel) ?? "beginner",
      language: initialData?.language ?? "english",
      price: initialData?.price ? Number(initialData.price) : 0,
      welcome_message: initialData?.welcome_message ?? "",
      whatsapp_channel_url: initialData?.whatsapp_channel_url ?? "",
      demo_video_url: initialData?.demo_video_url ?? "",
      category_id: initialData?.category_id ?? null,
      what_you_will_learn: (initialData?.what_you_will_learn ?? []).map(
        (v) => ({
          value: v,
        })
      ),
      requirements: (initialData?.requirements ?? []).map((v) => ({
        value: v,
      })),
      is_featured: initialData?.is_featured ?? false,
      is_published: initialData?.is_published ?? false,
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["course-categories"],
    queryFn: () =>
      listCourseCategories({ query: { page_size: 100 } }).then(
        (r) => r.data?.data ?? []
      ),
  });

  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(
    initialData?.computed_thumbnail_url ?? null
  );
  const [thumbnailUrl, setThumbnailUrl] = useState<string>(
    initialData?.thumbnail_url ?? ""
  );
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const [demoVideoPreview, setDemoVideoPreview] = useState<string | null>(
    initialData?.computed_demo_video_url ?? null
  );
  const demoVideoInputRef = useRef<HTMLInputElement>(null);

  const title = watch("title");
  const isEdit = !!initialData;

  useEffect(() => {
    if (!isEdit && title) {
      setValue("slug", slugify(title));
    }
  }, [title, isEdit, setValue]);

  const learnFields = useFieldArray({
    control,
    name: "what_you_will_learn",
  });

  const reqFields = useFieldArray({
    control,
    name: "requirements",
  });

  const handleFormSubmit = (values: CourseSchemaValues) => {
    const thumbnail = thumbnailInputRef.current?.files?.[0] ?? null;
    const demo_video = demoVideoInputRef.current?.files?.[0] ?? null;
    const payload: CourseFormValues = {
      title: values.title,
      slug: values.slug,
      short_description: values.short_description,
      description: values.description,
      level: values.level,
      language: values.language,
      price: values.price,
      welcome_message: values.welcome_message,
      whatsapp_channel_url: values.whatsapp_channel_url,
      category_id: values.category_id,
      what_you_will_learn: values.what_you_will_learn.map((item) => item.value),
      requirements: values.requirements.map((item) => item.value),
      is_featured: values.is_featured,
      is_published: values.is_published,
      thumbnail,
      thumbnail_url: thumbnailUrl || null,
      demo_video,
      demo_video_url: values.demo_video_url || null,
    };
    return onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Title *</Label>
          <Input
            placeholder="Oil Painting Fundamentals"
            error={errors.title?.message}
            {...register("title")}
          />
        </div>
        <div className="space-y-2">
          <Label>Slug *</Label>
          <Input
            placeholder="oil-painting-fundamentals"
            error={errors.slug?.message}
            {...register("slug")}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label>Level</Label>
          <Controller
            name="level"
            control={control}
            render={({ field }) => (
              <CustomSelect
                placeholder="Select Level"
                options={[
                  { value: "beginner", label: "Beginner" },
                  { value: "intermediate", label: "Intermediate" },
                  { value: "advanced", label: "Advanced" },
                ]}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>
        <div className="space-y-2">
          <Label>Language</Label>
          <Input placeholder="English" {...register("language")} />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Controller
            name="category_id"
            control={control}
            render={({ field }) => (
              <CustomSelect
                placeholder="No category"
                options={(categories ?? []).map((cat) => ({
                  value: String(cat.id),
                  label: cat.name,
                }))}
                value={field.value ?? ""}
                onChange={(val) => field.onChange(val ? String(val) : null)}
              />
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Price (INR) *</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="2999"
            error={errors.price?.message}
            {...register("price", { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-2">
          <Label>WhatsApp Community URL</Label>
          <Input
            placeholder="https://chat.whatsapp.com/..."
            {...register("whatsapp_channel_url")}
          />
        </div>
        <div className="space-y-2">
          <Label>Demo Video (File)</Label>
          <div
            onClick={() => demoVideoInputRef.current?.click()}
            className="relative w-full aspect-video max-h-48 bg-surface border-2 border-dashed border-border/60 hover:border-gold/40 rounded-sm cursor-pointer transition-all flex items-center justify-center overflow-hidden group"
          >
            {demoVideoPreview ? (
              <>
                <video
                  src={demoVideoPreview}
                  className="w-full h-full object-cover"
                  controls={false}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                  <Play
                    size={28}
                    className="text-white/0 group-hover:text-white/80 transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDemoVideoPreview(null);
                    if (demoVideoInputRef.current)
                      demoVideoInputRef.current.value = "";
                  }}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                >
                  <X size={14} />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 text-text-muted">
                <Play size={32} />
                <span className="text-2xs font-mono uppercase tracking-widest">
                  Click to upload
                </span>
              </div>
            )}
          </div>
          <input
            ref={demoVideoInputRef}
            type="file"
            accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setDemoVideoPreview(URL.createObjectURL(file));
              }
            }}
          />
        </div>
        <div className="space-y-2">
          <Label>Demo Video URL</Label>
          <Input
            placeholder="https://youtube.com/watch?v=... or S3 video URL"
            {...register("demo_video_url")}
          />
          <p className="text-2xs font-mono text-text-muted">
            Paste an external URL instead of uploading a file
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Thumbnail (File)</Label>
          <div
            onClick={() => thumbnailInputRef.current?.click()}
            className="relative w-full aspect-video max-h-48 bg-surface border-2 border-dashed border-border/60 hover:border-gold/40 rounded-sm cursor-pointer transition-all flex items-center justify-center overflow-hidden group"
          >
            {thumbnailPreview ? (
              <>
                <img
                  src={thumbnailPreview}
                  alt="Thumbnail preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                  <ImageUp
                    size={28}
                    className="text-white/0 group-hover:text-white/80 transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setThumbnailPreview(null);
                    if (thumbnailInputRef.current)
                      thumbnailInputRef.current.value = "";
                  }}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                >
                  <X size={14} />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 text-text-muted">
                <ImageUp size={32} />
                <span className="text-2xs font-mono uppercase tracking-widest">
                  Click to upload
                </span>
              </div>
            )}
          </div>
          <input
            ref={thumbnailInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setThumbnailPreview(URL.createObjectURL(file));
                setThumbnailUrl("");
              }
            }}
          />
        </div>
        <div className="space-y-2">
          <Label>Thumbnail URL</Label>
          <Input
            placeholder="https://example.com/thumbnail.jpg"
            value={thumbnailUrl}
            onChange={(e) => {
              setThumbnailUrl(e.target.value);
              if (e.target.value) {
                setThumbnailPreview(e.target.value);
                if (thumbnailInputRef.current) {
                  thumbnailInputRef.current.value = "";
                }
              }
            }}
          />
          <p className="text-2xs font-mono text-text-muted">
            Paste an external URL instead of uploading a file
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Short Description</Label>
        <Input
          placeholder="From blank canvas to confident composition"
          {...register("short_description")}
        />
      </div>

      <div className="space-y-2">
        <Label>Full Description</Label>
        <TextArea
          placeholder="A comprehensive course covering..."
          rows={4}
          {...register("description")}
        />
      </div>

      <div className="space-y-2">
        <Label>Welcome Message</Label>
        <TextArea
          placeholder="Message shown to enrolled students..."
          rows={3}
          {...register("welcome_message")}
        />
      </div>

      <div className="space-y-3">
        <Label>What You Will Learn</Label>
        <div className="space-y-2">
          {learnFields.fields.map((field, i) => (
            <div key={field.id} className="flex gap-2">
              <input
                {...register(`what_you_will_learn.${i}.value`)}
                placeholder="e.g. Master color mixing techniques"
                className="flex-1 h-10 bg-surface border border-border px-4 text-sm text-foreground rounded-sm focus:border-primary outline-none transition-all duration-300 placeholder:text-text-muted/50 font-mono"
              />
              <button
                type="button"
                onClick={() => learnFields.remove(i)}
                className="w-10 h-10 flex items-center justify-center text-danger/60 hover:text-danger hover:bg-danger/5 transition-all rounded-sm border border-border shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => learnFields.append({ value: "" })}
          className="text-primary text-2xs uppercase tracking-[0.2em] font-bold hover:text-foreground transition-all flex items-center gap-2 group pt-1"
        >
          <Plus
            size={14}
            className="group-hover:scale-110 transition-transform"
          />
          Add Item
        </button>
      </div>

      <div className="space-y-3">
        <Label>Requirements</Label>
        <div className="space-y-2">
          {reqFields.fields.map((field, i) => (
            <div key={field.id} className="flex gap-2">
              <input
                {...register(`requirements.${i}.value`)}
                placeholder="e.g. Basic drawing skills"
                className="flex-1 h-10 bg-surface border border-border px-4 text-sm text-foreground rounded-sm focus:border-primary outline-none transition-all duration-300 placeholder:text-text-muted/50 font-mono"
              />
              <button
                type="button"
                onClick={() => reqFields.remove(i)}
                className="w-10 h-10 flex items-center justify-center text-danger/60 hover:text-danger hover:bg-danger/5 transition-all rounded-sm border border-border shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => reqFields.append({ value: "" })}
          className="text-primary text-2xs uppercase tracking-[0.2em] font-bold hover:text-foreground transition-all flex items-center gap-2 group pt-1"
        >
          <Plus
            size={14}
            className="group-hover:scale-110 transition-transform"
          />
          Add Item
        </button>
      </div>

      <div className="flex items-center gap-8 pt-4 border-t border-border">
        <div className="flex items-center gap-3">
          <Controller
            name="is_featured"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="is_featured"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <label
            htmlFor="is_featured"
            className="text-2xs font-bold uppercase tracking-widest cursor-pointer hover:text-primary transition-colors text-foreground"
          >
            Featured
          </label>
        </div>
        <div className="flex items-center gap-3">
          <Controller
            name="is_published"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="is_published"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <label
            htmlFor="is_published"
            className="text-2xs font-bold uppercase tracking-widest cursor-pointer hover:text-primary transition-colors text-foreground"
          >
            Published
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4">
        <GhostBtn
          type="button"
          onClick={() => router.push("/admin/courses")}
          className="px-8 py-3.5 text-xs"
        >
          Cancel
        </GhostBtn>
        <PrimaryBtn
          type="submit"
          disabled={isSubmitting}
          className="px-6 md:px-12 py-3 md:py-3.5 gold-glow-lg"
        >
          {isSubmitting ? (
            <div className="luxury-loader luxury-loader-dark loader-sm" />
          ) : initialData ? (
            <>
              <Save size={14} /> Update Course
            </>
          ) : (
            <>
              <Plus size={14} /> Create Course
            </>
          )}
        </PrimaryBtn>
      </div>
    </form>
  );
}
