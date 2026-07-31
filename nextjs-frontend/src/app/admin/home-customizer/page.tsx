"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Save,
  RotateCcw,
  Layout,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Plus,
  Trash2,
  Video,
  BarChart3,
  MessageSquare,
  HelpCircle,
  Share2,
  Megaphone,
  Clapperboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PrimaryBtn } from "@/components/ui/buttons";
import { ImagePicker } from "@/components/admin/ImagePicker";
import {
  homePageSchema,
  defaultHomeSettings,
  type HomePageSettings,
} from "@/lib/home-customization";
import { getHomePageSettings, updateHomePageSettings } from "@/api/openapi-client";
import { toast } from "@/lib/toast";
import { unwrap } from "@/api/client-service";

export default function HomeCustomizerPage() {
  const [activeSection, setActiveSection] = useState<string | null>("hero");
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { isDirty },
  } = useForm<HomePageSettings>({
    resolver: zodResolver(homePageSchema),
    defaultValues: defaultHomeSettings,
    mode: "onChange", // For character counters
  });

  useEffect(() => {
    let active = true;

    unwrap(getHomePageSettings())
      .then((data) => {
        if (active) {
          reset({
            ...defaultHomeSettings,
            ...data,
            footer: data?.footer ?? defaultHomeSettings.footer,
          } as HomePageSettings);
        }
      })
      .catch(() => {
        if (active) {
          toast.error("Failed to load home settings");
        }
      });

    return () => {
      active = false;
    };
  }, [reset]);

  // Field arrays for dynamic lists
  const {
    fields: heroStats,
    append: addHeroStat,
    remove: removeHeroStat,
  } = useFieldArray({
    control,
    name: "hero.stats",
  });

  const {
    fields: aboutStats,
    append: addAboutStat,
    remove: removeAboutStat,
  } = useFieldArray({
    control,
    name: "about.stats",
  });

  const {
    fields: faqs,
    append: addFaq,
    remove: removeFaq,
  } = useFieldArray({
    control,
    name: "faq.items",
  });

  const {
    fields: testimonials,
    append: addTestimonial,
    remove: removeTestimonial,
  } = useFieldArray({
    control,
    name: "community.items",
  });

  const {
    fields: socials,
    append: addSocial,
    remove: removeSocial,
  } = useFieldArray({
    control,
    name: "footer.socials",
  });

  const onSubmit = async (data: HomePageSettings) => {
    setIsLoading(true);
    try {
      const saved = await unwrap(updateHomePageSettings({ body: data }));
      if (saved) {
        reset(saved as HomePageSettings);
      }
      toast.success("Home page settings saved to database!");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  // Character counter helper
  const CharCount = ({
    value,
    max,
  }: {
    value: string | undefined;
    max: number;
  }) => {
    const length = value?.length || 0;
    const isOver = length > max;
    return (
      <div
        className={cn(
          "text-2xs font-mono mt-1 text-right",
          isOver ? "text-red-500 font-bold" : "text-text-muted opacity-60"
        )}
      >
        {length}/{max} characters
      </div>
    );
  };

  const SectionHeader = ({
    id,
    title,
    icon: Icon,
  }: {
    id: string;
    title: string;
    icon: React.ElementType;
  }) => (
    <button
      type="button"
      onClick={() => toggleSection(id)}
      className={cn(
        "w-full flex items-center justify-between p-6 transition-colors border-b border-border",
        activeSection === id ? "bg-muted" : "hover:bg-muted-light"
      )}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "w-10 h-10 flex items-center justify-center border transition-colors",
            activeSection === id
              ? "bg-gold border-gold text-dark"
              : "border-border text-text-muted"
          )}
        >
          <Icon size={20} />
        </div>
        <div className="text-left">
          <h3
            className={cn(
              "font-bold text-lg leading-none",
              activeSection === id ? "text-text-main" : "text-text-muted"
            )}
          >
            {title}
          </h3>
        </div>
      </div>
      {activeSection === id ? (
        <ChevronUp size={20} className="text-gold" />
      ) : (
        <ChevronDown size={20} className="text-text-muted" />
      )}
    </button>
  );

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-h3 font-extrabold tracking-tight text-text-main leading-none">
            Home Page Customizer
          </h1>
          <p className="text-text-muted text-sm mt-2">
            Design and persist the landing experience to the database.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => reset()}
            className="flex items-center gap-2 px-4 py-2 text-xs font-mono tracking-widest uppercase text-text-muted hover:text-text-main transition-colors disabled:opacity-30"
            disabled={!isDirty || isLoading}
          >
            <RotateCcw size={14} /> Reset
          </button>
          <PrimaryBtn
            onClick={handleSubmit(onSubmit)}
            className="px-6 py-3"
            disabled={isLoading}
          >
            <Save size={16} /> {isLoading ? "Saving..." : "Save to DB"}
          </PrimaryBtn>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="border border-border bg-muted-light divide-y divide-border"
      >
        {/* --- Hero Section --- */}
        <div className="overflow-hidden">
          <SectionHeader id="hero" title="Hero / Landing" icon={Layout} />
          {activeSection === "hero" && (
            <div className="p-8 space-y-8 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                    Main Headline
                  </label>
                  <textarea
                    {...register("hero.title")}
                    className="w-full bg-dark border border-border p-4 text-text-main focus:border-gold outline-none h-32 resize-none"
                  />
                  <CharCount value={watch("hero.title")} max={150} />
                </div>
                <div className="space-y-2">
                  <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                    Subtitle
                  </label>
                  <textarea
                    {...register("hero.subtitle")}
                    className="w-full bg-dark border border-border p-4 text-text-main focus:border-gold outline-none h-32 resize-none"
                  />
                  <CharCount value={watch("hero.subtitle")} max={300} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                    Media Type
                  </label>
                  <div className="flex gap-4">
                    {["image", "video"].map((type) => (
                      <label key={type} className="flex-1 cursor-pointer">
                        <input
                          {...register("hero.mediaType")}
                          type="radio"
                          value={type}
                          className="sr-only peer"
                        />
                        <div className="p-4 border border-border bg-dark text-center peer-checked:border-gold peer-checked:text-gold transition-colors flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-widest">
                          {type === "image" ? (
                            <ImageIcon size={14} />
                          ) : (
                            <Video size={14} />
                          )}{" "}
                          {type}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                    Media (S3/CDN Link)
                  </label>
                  <ImagePicker
                    label="hero media"
                    value={watch("hero.mediaUrl")}
                    onChange={(url) =>
                      setValue("hero.mediaUrl", url, { shouldDirty: true })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-border/40">
                <div className="space-y-2">
                  <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                    Primary Button Text
                  </label>
                  <input
                    {...register("hero.primaryBtnText")}
                    placeholder="Begin Learning"
                    className="w-full bg-dark border border-border p-4 text-text-main focus:border-gold outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                    Primary Button Link
                  </label>
                  <input
                    {...register("hero.primaryBtnLink")}
                    placeholder="/courses"
                    className="w-full bg-dark border border-border p-4 text-text-main focus:border-gold outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                    Ghost Button Text
                  </label>
                  <input
                    {...register("hero.ghostBtnText")}
                    placeholder="View Paintings"
                    className="w-full bg-dark border border-border p-4 text-text-main focus:border-gold outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                    Ghost Button Link
                  </label>
                  <input
                    {...register("hero.ghostBtnLink")}
                    placeholder="/shop"
                    className="w-full bg-dark border border-border p-4 text-text-main focus:border-gold outline-none"
                  />
                </div>
              </div>

              {/* Stats Management */}
              <div className="space-y-4 pt-4 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                    Hero Statistics (Max 4)
                  </label>
                  {heroStats.length < 4 && (
                    <button
                      type="button"
                      onClick={() => addHeroStat({ label: "", value: "" })}
                      className="text-gold flex items-center gap-1 text-2xs font-mono uppercase tracking-widest hover:text-text-main transition-colors"
                    >
                      <Plus size={12} /> Add Stat
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {heroStats.map((field, index) => (
                    <div
                      key={field.id}
                      className="flex gap-2 items-start bg-dark/50 p-4 border border-border/50"
                    >
                      <div className="flex-1 space-y-3">
                        <input
                          {...register(`hero.stats.${index}.value` as const)}
                          placeholder="Value (e.g. 12K+)"
                          className="w-full bg-transparent border-b border-border focus:border-gold outline-none py-1 text-sm text-text-main"
                        />
                        <input
                          {...register(`hero.stats.${index}.label` as const)}
                          placeholder="Label (e.g. Students)"
                          className="w-full bg-transparent border-b border-border focus:border-gold outline-none py-1 text-2xs font-mono uppercase text-text-muted"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeHeroStat(index)}
                        className="text-red-500/50 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* --- Featured & Best Sellers --- */}
        <div className="overflow-hidden">
          <SectionHeader
            id="featured"
            title="Featured Collections & Sellers"
            icon={BarChart3}
          />
          {activeSection === "featured" && (
            <div className="p-8 space-y-10">
              <div className="space-y-6">
                <h4 className="text-gold font-mono text-2xs tracking-[0.2em] uppercase border-b border-border pb-2">
                  Paintings Section
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                      Title
                    </label>
                    <textarea
                      {...register("featuredPaintings.title")}
                      className="w-full bg-dark border border-border p-4 text-text-main focus:border-gold outline-none h-24 resize-none"
                    />
                    <CharCount
                      value={watch("featuredPaintings.title")}
                      max={150}
                    />
                  </div>
                  <div className="bg-dark/30 p-6 border border-border border-dashed flex flex-col items-center justify-center text-center">
                    <ImageIcon size={24} className="text-text-muted mb-2" />
                    <p className="text-xs text-text-muted font-mono uppercase tracking-widest">
                      Painting Selection UI Coming Soon
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* --- About Section --- */}
        <div className="overflow-hidden">
          <SectionHeader id="about" title="About Instructor" icon={ImageIcon} />
          {activeSection === "about" && (
            <div className="p-8 space-y-8 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-2">
                  <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                    Label
                  </label>
                  <input
                    {...register("about.label")}
                    placeholder="The Artist Behind the Vision"
                    className="w-full bg-dark border border-border p-4 text-text-main focus:border-gold outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                    Title
                  </label>
                  <input
                    {...register("about.title")}
                    placeholder="Mastering the Art of Visual Storytelling"
                    className="w-full bg-dark border border-border p-4 text-text-main focus:border-gold outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                    Instructor Role
                  </label>
                  <input
                    {...register("about.instructorRole")}
                    placeholder="Lead Instructor"
                    className="w-full bg-dark border border-border p-4 text-text-main focus:border-gold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-2">
                  <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                    Instructor Name
                  </label>
                  <input
                    {...register("about.instructorName")}
                    className="w-full bg-dark border border-border p-4 text-text-main focus:border-gold outline-none"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                    Instructor Image
                  </label>
                  <ImagePicker
                    label="instructor image"
                    value={watch("about.image")}
                    onChange={(url) =>
                      setValue("about.image", url, { shouldDirty: true })
                    }
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                  Biography Paragraphs (Max 600ch each)
                </label>
                {[1, 2, 3].map((num) => (
                  <div key={num}>
                    <textarea
                      {...register(
                        `about.description${num}` as
                          | "about.description1"
                          | "about.description2"
                          | "about.description3"
                      )}
                      placeholder={`Paragraph ${num}`}
                      className="w-full bg-dark border border-border p-4 text-text-main focus:border-gold outline-none h-32 resize-none"
                    />
                    <CharCount
                      value={watch(
                        `about.description${num}` as
                          | "about.description1"
                          | "about.description2"
                          | "about.description3"
                      )}
                      max={600}
                    />
                  </div>
                ))}
              </div>

              {/* About Stats */}
              <div className="space-y-4 pt-4 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                    Achievement Stats (Max 4)
                  </label>
                  {aboutStats.length < 4 && (
                    <button
                      type="button"
                      onClick={() => addAboutStat({ label: "", value: "" })}
                      className="text-gold flex items-center gap-1 text-2xs font-mono uppercase tracking-widest hover:text-text-main transition-colors"
                    >
                      <Plus size={12} /> Add Stat
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {aboutStats.map((field, index) => (
                    <div
                      key={field.id}
                      className="flex gap-2 items-start bg-dark/50 p-4 border border-border/50"
                    >
                      <div className="flex-1 space-y-2">
                        <input
                          {...register(`about.stats.${index}.value` as const)}
                          placeholder="20+ Yrs"
                          className="w-full bg-transparent border-b border-border focus:border-gold outline-none py-1 text-sm text-text-main font-bold"
                        />
                        <input
                          {...register(`about.stats.${index}.label` as const)}
                          placeholder="Experience"
                          className="w-full bg-transparent border-b border-border focus:border-gold outline-none py-1 text-2xs font-mono uppercase text-text-muted"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAboutStat(index)}
                        className="text-red-500/30 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* --- FAQ Management --- */}
        <div className="overflow-hidden">
          <SectionHeader id="faq" title="FAQ Management" icon={HelpCircle} />
          {activeSection === "faq" && (
            <div className="p-8 space-y-8 animate-in fade-in duration-300">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                      FAQ Section Label
                    </label>
                    <input
                      {...register("faq.label")}
                      className="w-full bg-dark border border-border p-4 text-text-main focus:border-gold outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                      FAQ Section Title
                    </label>
                    <input
                      {...register("faq.title")}
                      className="w-full bg-dark border border-border p-4 text-text-main focus:border-gold outline-none"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                      Section Description
                    </label>
                    <textarea
                      {...register("faq.description")}
                      className="w-full bg-dark border border-border p-4 text-text-main focus:border-gold outline-none h-20 resize-none"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                      Individual FAQ Items
                    </label>
                    <button
                      type="button"
                      onClick={() => addFaq({ question: "", answer: "" })}
                      className="text-gold flex items-center gap-1 text-2xs font-mono uppercase tracking-widest hover:text-text-main transition-colors"
                    >
                      <Plus size={12} /> New FAQ
                    </button>
                  </div>
                  <div className="space-y-4">
                    {faqs.map((field, index) => (
                      <div
                        key={field.id}
                        className="bg-dark/50 border border-border/50 p-6 space-y-4 relative group"
                      >
                        <button
                          type="button"
                          onClick={() => removeFaq(index)}
                          className="absolute top-4 right-4 text-red-500/50 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                        <div className="pr-10 space-y-4">
                          <input
                            {...register(
                              `faq.items.${index}.question` as const
                            )}
                            placeholder="The Question"
                            className="w-full bg-transparent border-b border-border/50 focus:border-gold outline-none py-2 text-text-main font-bold"
                          />
                          <textarea
                            {...register(`faq.items.${index}.answer` as const)}
                            placeholder="The Answer (Max 1000 characters)"
                            className="w-full bg-transparent border border-border/20 focus:border-gold outline-none p-4 text-sm text-text-muted h-32 resize-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* --- Community & Testimonials --- */}
        <div className="overflow-hidden">
          <SectionHeader
            id="community"
            title="Testimonials & Community"
            icon={MessageSquare}
          />
          {activeSection === "community" && (
            <div className="p-8 space-y-8 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                    Section Label
                  </label>
                  <input
                    {...register("community.label")}
                    className="w-full bg-dark border border-border p-4 text-text-main focus:border-gold outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                    Section Title
                  </label>
                  <input
                    {...register("community.title")}
                    className="w-full bg-dark border border-border p-4 text-text-main focus:border-gold outline-none"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                    Section Description
                  </label>
                  <textarea
                    {...register("community.description")}
                    className="w-full bg-dark border border-border p-4 text-text-main focus:border-gold outline-none h-20 resize-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                  Community Reviews
                </label>
                <button
                  type="button"
                  onClick={() =>
                    addTestimonial({
                      name: "",
                      role: "",
                      text: "",
                      rating: 5,
                      avatar: "AK",
                    })
                  }
                  className="text-gold flex items-center gap-1 text-2xs font-mono uppercase tracking-widest hover:text-text-main transition-colors"
                >
                  <Plus size={12} /> New Review
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {testimonials.map((field, index) => (
                  <div
                    key={field.id}
                    className="bg-dark/50 border border-border/50 p-6 space-y-4 relative group"
                  >
                    <button
                      type="button"
                      onClick={() => removeTestimonial(index)}
                      className="absolute top-4 right-4 text-red-500/30 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                    <div className="flex items-center gap-4">
                      <input
                        {...register(
                          `community.items.${index}.avatar` as const
                        )}
                        placeholder="Initials"
                        className="w-10 h-10 bg-muted border border-border text-gold text-xs font-bold text-center outline-none focus:border-gold"
                        maxLength={2}
                      />
                      <div className="flex-1 space-y-1">
                        <input
                          {...register(
                            `community.items.${index}.name` as const
                          )}
                          placeholder="User Name"
                          className="w-full bg-transparent text-sm font-bold text-text-main outline-none"
                        />
                        <input
                          {...register(
                            `community.items.${index}.role` as const
                          )}
                          placeholder="Role (e.g. Collector)"
                          className="w-full bg-transparent text-2xs font-mono uppercase text-text-muted outline-none"
                        />
                      </div>
                    </div>
                    <textarea
                      {...register(`community.items.${index}.text` as const)}
                      placeholder="Review Text"
                      className="w-full bg-dark border border-border/30 focus:border-gold outline-none p-4 text-sm text-text-muted h-24 resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* --- Video CTA Section --- */}
        <div className="overflow-hidden">
          <SectionHeader id="videoCta" title="Video CTA Banner" icon={Clapperboard} />
          {activeSection === "videoCta" && (
            <div className="p-8 space-y-8 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                    Label
                  </label>
                  <input
                    {...register("videoCta.label")}
                    className="w-full bg-dark border border-border p-4 text-text-main focus:border-gold outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                    Title
                  </label>
                  <input
                    {...register("videoCta.title")}
                    className="w-full bg-dark border border-border p-4 text-text-main focus:border-gold outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                    Background Image
                  </label>
                  <ImagePicker
                    label="video CTA background"
                    value={watch("videoCta.bgImage")}
                    onChange={(url) =>
                      setValue("videoCta.bgImage", url, { shouldDirty: true })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                    Video URL
                  </label>
                  <input
                    {...register("videoCta.videoUrl")}
                    placeholder="https://www.youtube.com/embed/..."
                    className="w-full bg-dark border border-border p-4 text-text-main focus:border-gold outline-none"
                  />
                  <CharCount value={watch("videoCta.videoUrl")} max={500} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* --- CTA Banner Section --- */}
        <div className="overflow-hidden">
          <SectionHeader id="banner" title="Bottom CTA Banner" icon={Megaphone} />
          {activeSection === "banner" && (
            <div className="p-8 space-y-8 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                    Label
                  </label>
                  <input
                    {...register("banner.label")}
                    className="w-full bg-dark border border-border p-4 text-text-main focus:border-gold outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                    Title
                  </label>
                  <textarea
                    {...register("banner.title")}
                    className="w-full bg-dark border border-border p-4 text-text-main focus:border-gold outline-none h-24 resize-none"
                  />
                  <CharCount value={watch("banner.title")} max={150} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                    Description
                  </label>
                  <textarea
                    {...register("banner.description")}
                    className="w-full bg-dark border border-border p-4 text-text-main focus:border-gold outline-none h-24 resize-none"
                  />
                  <CharCount value={watch("banner.description")} max={400} />
                </div>
                <div className="space-y-2">
                  <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                    Primary Button Text
                  </label>
                  <input
                    {...register("banner.primaryBtnText")}
                    className="w-full bg-dark border border-border p-4 text-text-main focus:border-gold outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                    Primary Button Link
                  </label>
                  <input
                    {...register("banner.primaryBtnLink")}
                    className="w-full bg-dark border border-border p-4 text-text-main focus:border-gold outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                    Ghost Button Text
                  </label>
                  <input
                    {...register("banner.ghostBtnText")}
                    className="w-full bg-dark border border-border p-4 text-text-main focus:border-gold outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                    Ghost Button Link
                  </label>
                  <input
                    {...register("banner.ghostBtnLink")}
                    className="w-full bg-dark border border-border p-4 text-text-main focus:border-gold outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* --- Footer / Social Links --- */}
        <div className="overflow-hidden">
          <SectionHeader
            id="footer"
            title="Footer & Social Links"
            icon={Share2}
          />
          {activeSection === "footer" && (
            <div className="p-8 space-y-8 animate-in fade-in duration-300">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-tiny font-mono text-text-muted uppercase tracking-widest">
                    Social Media Links
                  </label>
                  <button
                    type="button"
                    onClick={() => addSocial({ platform: "instagram", url: "" })}
                    className="text-gold flex items-center gap-1 text-2xs font-mono uppercase tracking-widest hover:text-text-main transition-colors"
                  >
                    <Plus size={12} /> Add Link
                  </button>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Only platforms with a URL set here will appear in the footer.
                  Supported: Facebook, Instagram, Twitter/X, YouTube, LinkedIn,
                  WhatsApp, Pinterest, TikTok.
                </p>
                <div className="space-y-4">
                  {socials.map((field, index) => (
                    <div
                      key={field.id}
                      className="bg-dark/50 border border-border/50 p-4 flex gap-4 items-start relative group"
                    >
                      <div className="w-40 shrink-0">
                        <select
                          {...register(`footer.socials.${index}.platform` as const)}
                          className="w-full bg-dark border border-border/50 text-sm text-text-main outline-none focus:border-gold px-3 py-3"
                        >
                          {[
                            "facebook",
                            "instagram",
                            "twitter",
                            "youtube",
                            "linkedin",
                            "whatsapp",
                            "pinterest",
                            "tiktok",
                          ].map((platform) => (
                            <option key={platform} value={platform}>
                              {platform.charAt(0).toUpperCase() +
                                platform.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1">
                        <input
                          {...register(`footer.socials.${index}.url` as const)}
                          placeholder="https://instagram.com/artistkashi"
                          className="w-full bg-transparent border-b border-border/50 focus:border-gold outline-none py-2 text-sm text-text-main"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSocial(index)}
                        className="text-red-500/50 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {socials.length === 0 && (
                    <div className="border border-dashed border-border/50 p-8 text-center text-text-muted text-xs font-mono uppercase tracking-widest">
                      No social links configured
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </form>

      {/* Database Persist Info */}
      <div className="mt-8 p-6 bg-gold/5 border border-gold/20 flex items-start gap-4">
        <AlertCircle className="text-gold shrink-0 mt-0.5" size={18} />
        <div>
          <h5 className="text-gold font-bold text-sm mb-1">
            Database-Backed Persistence
          </h5>
          <p className="text-text-muted text-xs leading-relaxed">
            Changes saved here are stored in the PostgreSQL database and fetched
            dynamically by the home page. Hero statistics and achievement
            counters are fully editable.
          </p>
        </div>
      </div>
    </div>
  );
}
