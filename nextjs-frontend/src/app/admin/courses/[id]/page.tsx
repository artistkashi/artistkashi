"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  ExternalLink,
  GripVertical,
  MoveRight,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { unwrap, unwrapVoid } from "@/api/client-service";
import type {
  CourseCurriculumRead,
  CourseLessonCreate,
  CourseLessonUpdate,
  CourseLevel,
  CourseRead,
  CourseSectionWithLessonsRead,
  CourseStatsRead,
} from "@/api/openapi-client";
import {
  createLesson,
  createSection,
  deleteCourse,
  deleteLesson,
  deleteSection,
  getCourseCurriculum,
  getCourseStats,
  moveLesson,
  reorderLessons,
  reorderSections,
  updateCourse,
  updateLesson,
  updateSection,
} from "@/api/openapi-client";
import { uploadLessonVideoViaPresigned } from "@/api/video-upload";
import {
  CourseForm,
  type CourseFormValues,
} from "@/components/admin/courses/CourseForm";
import { EnrolledStudentsSection } from "@/components/admin/EnrolledStudentsSection";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CustomSelect } from "@/components/ui/custom-select";
import { StatusModal } from "@/components/ui/StatusModal";
import { AnimatedCounter } from "@/components/dashboard/AnimatedCounter";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip } from "@/components/ui/tooltip";
import { getErrorMessage } from "@/lib/error-handler";
import { cn, displayPrice } from "@/lib/utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(seconds: number | undefined | null): string {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

async function fetchCourseCurriculum(
  courseId: string
): Promise<CourseCurriculumRead> {
  return unwrap(getCourseCurriculum({ path: { course_id: courseId } }));
}

const fetchCourseStats = (courseId: string) =>
  unwrap<CourseStatsRead>(getCourseStats({ path: { course_id: courseId } }));

// ─── Section Builder ──────────────────────────────────────────────────────────

function SectionBuilder({
  courseId,
  sections,
  onRefresh,
}: {
  courseId: string;
  sections: CourseSectionWithLessonsRead[];
  onRefresh: () => void;
}) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);
  const [sectionDeleteTarget, setSectionDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: ["admin-course-curriculum", courseId],
    });
    onRefresh();
  };

  const createMutation = useMutation({
    mutationFn: (title: string) =>
      unwrap(createSection({ path: { course_id: courseId }, body: { title } })),
    onSuccess: () => {
      toast.success("Section added");
      invalidate();
      setNewTitle("");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ sectionId, title }: { sectionId: string; title: string }) =>
      unwrap(
        updateSection({
          path: { course_id: courseId, section_id: sectionId },
          body: { title },
        })
      ),
    onSuccess: () => {
      toast.success("Section updated");
      invalidate();
      setEditingId(null);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (sectionId: string) =>
      unwrapVoid(
        deleteSection({ path: { course_id: courseId, section_id: sectionId } })
      ),
    onSuccess: () => {
      toast.success("Section deleted");
      invalidate();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) =>
      unwrap(
        reorderSections({ path: { course_id: courseId }, body: orderedIds })
      ),
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({
        queryKey: ["admin-course-curriculum", courseId],
      });
      const prev = queryClient.getQueryData<CourseCurriculumRead>([
        "admin-course-curriculum",
        courseId,
      ]);
      if (prev) {
        const sorted = [...(prev.sections ?? [])].sort(
          (a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id)
        );
        queryClient.setQueryData<CourseCurriculumRead>(
          ["admin-course-curriculum", courseId],
          { ...prev, sections: sorted }
        );
      }
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(
          ["admin-course-curriculum", courseId],
          ctx.prev
        );
      }
      toast.error(getErrorMessage(err));
    },
  });

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const ids = sections.map((s) => s.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    reorderMutation.mutate(ids);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    reorder(index, index - 1);
  };

  const moveDown = (index: number) => {
    if (index === sections.length - 1) return;
    reorder(index, index + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New section title..."
          className="flex-1 h-10 bg-dark border border-border px-4 text-sm text-text-main placeholder:text-text-muted/40 focus:outline-none focus:border-gold/50 font-mono rounded glass-input"
          onKeyDown={(e) => {
            if (e.key === "Enter" && newTitle.trim())
              createMutation.mutate(newTitle.trim());
          }}
        />
        <Button
          size="sm"
          onClick={() =>
            newTitle.trim() && createMutation.mutate(newTitle.trim())
          }
          disabled={!newTitle.trim() || createMutation.isPending}
        >
          <Plus size={14} /> Add Section
        </Button>
      </div>

      <div className="space-y-2 select-none">
        {sections.map((section, i) => (
          <div
            key={section.id}
            draggable={sections.length > 1}
            onDragStart={(e) => {
              dragRef.current = i;
              setDragOverIndex(null);
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", section.id);
            }}
            onDragEnter={() => {
              if (dragRef.current !== null) setDragOverIndex(i);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDragEnd={() => {
              dragRef.current = null;
              setDragOverIndex(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              const from = dragRef.current;
              if (from !== null && from !== i) {
                const ids = sections.map((s) => s.id);
                const [moved] = ids.splice(from, 1);
                ids.splice(i, 0, moved);
                reorderMutation.mutate(ids);
              }
              dragRef.current = null;
              setDragOverIndex(null);
            }}
            className={cn(
              "border border-border bg-dark/40 p-4 flex items-center gap-3 transition-all",
              dragOverIndex === i && "border-gold/50 bg-gold/5"
            )}
          >
            <div className="flex flex-col gap-0.5">
              <Tooltip label="Move up">
                <button
                  onClick={() => moveUp(i)}
                  disabled={i === 0}
                  className="text-text-muted hover:text-text-main disabled:opacity-30"
                >
                  <ChevronUp size={12} />
                </button>
              </Tooltip>
              <Tooltip label="Move down">
                <button
                  onClick={() => moveDown(i)}
                  disabled={i === sections.length - 1}
                  className="text-text-muted hover:text-text-main disabled:opacity-30"
                >
                  <ChevronDown size={12} />
                </button>
              </Tooltip>
            </div>

            <Tooltip label="Drag to reorder">
              <GripVertical
                size={14}
                className="text-text-muted shrink-0 cursor-grab active:cursor-grabbing"
              />
            </Tooltip>

            {editingId === section.id ? (
              <div className="flex-1 flex gap-2">
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="flex-1 h-9 bg-dark border border-border px-3 text-sm text-text-main focus:outline-none focus:border-gold/50 font-mono rounded-sm glass-input"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      updateMutation.mutate({
                        sectionId: section.id,
                        title: editTitle.trim(),
                      });
                    if (e.key === "Escape") setEditingId(null);
                  }}
                />
                <Tooltip label="Save">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-emerald-400"
                    onClick={() =>
                      updateMutation.mutate({
                        sectionId: section.id,
                        title: editTitle.trim(),
                      })
                    }
                  >
                    <Check size={14} />
                  </Button>
                </Tooltip>
                <Tooltip label="Cancel">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-red-400"
                    onClick={() => setEditingId(null)}
                  >
                    <X size={14} />
                  </Button>
                </Tooltip>
              </div>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <div className="text-text-main font-semibold text-sm truncate">
                    <span className="text-text-muted mr-1">{i + 1}.</span>
                    {section.title}
                  </div>
                  <div className="text-2xs font-mono text-text-muted">
                    {section.lessons?.length ?? 0} lessons · sort order{" "}
                    {section.sort_order}
                  </div>
                </div>
                <Tooltip label="Edit section">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-text-muted hover:text-gold"
                    onClick={() => {
                      setEditingId(section.id);
                      setEditTitle(section.title);
                    }}
                  >
                    <Pencil size={13} />
                  </Button>
                </Tooltip>
                <Tooltip label="Delete section">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-text-muted hover:text-red-400"
                    onClick={() =>
                      setSectionDeleteTarget({
                        id: section.id,
                        title: section.title,
                      })
                    }
                  >
                    <Trash2 size={13} />
                  </Button>
                </Tooltip>
              </>
            )}
          </div>
        ))}

        {sections.length === 0 && (
          <div className="text-center py-12 text-text-muted text-sm font-mono border border-dashed border-border">
            No sections yet. Add your first section above.
          </div>
        )}
      </div>

      <StatusModal
        isOpen={!!sectionDeleteTarget}
        onClose={() => setSectionDeleteTarget(null)}
        type="error"
        title="Delete Section"
        message={`This will delete this section and all its lessons.\n${sectionDeleteTarget?.title}`}
        actionText={deleteMutation.isPending ? "Deleting..." : "Delete"}
        onAction={() => {
          if (sectionDeleteTarget) {
            deleteMutation.mutate(sectionDeleteTarget.id);
            setSectionDeleteTarget(null);
          }
        }}
        secondaryText="Cancel"
        onSecondary={() => setSectionDeleteTarget(null)}
      />
    </div>
  );
}

// ─── Lesson Builder ───────────────────────────────────────────────────────────

function LessonBuilder({
  courseId,
  sections,
  onRefresh,
}: {
  courseId: string;
  sections: CourseSectionWithLessonsRead[];
  onRefresh: () => void;
}) {
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [editingLesson, setEditingLesson] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPreview, setEditPreview] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPreview, setNewPreview] = useState(false);

  const [moveLessonId, setMoveLessonId] = useState<string | null>(null);
  const [moveTargetSection, setMoveTargetSection] = useState("");
  const [lessonDeleteTarget, setLessonDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    if (sections.length > 0 && !selectedSectionId) {
      setSelectedSectionId(sections[0].id);
    }
  }, [sections, selectedSectionId]);

  const currentSection = sections.find((s) => s.id === selectedSectionId);
  const lessons = currentSection?.lessons ?? [];

  const createMutation = useMutation({
    mutationFn: (data: CourseLessonCreate) =>
      unwrap(
        createLesson({
          path: { course_id: courseId, section_id: selectedSectionId },
          body: data,
        })
      ),
    onSuccess: () => {
      toast.success("Lesson added");
      onRefresh();
      setNewTitle("");
      setNewDescription("");
      setNewPreview(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      lessonId,
      data,
    }: {
      lessonId: string;
      data: CourseLessonUpdate;
    }) =>
      unwrap(
        updateLesson({
          path: {
            course_id: courseId,
            section_id: selectedSectionId,
            lesson_id: lessonId,
          },
          body: data,
        })
      ),
    onSuccess: () => {
      toast.success("Lesson updated");
      onRefresh();
      setEditingLesson(null);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (lessonId: string) =>
      unwrapVoid(
        deleteLesson({
          path: {
            course_id: courseId,
            section_id: selectedSectionId,
            lesson_id: lessonId,
          },
        })
      ),
    onSuccess: () => {
      toast.success("Lesson deleted");
      onRefresh();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const queryClient = useQueryClient();
  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) =>
      unwrap(
        reorderLessons({
          path: { course_id: courseId, section_id: selectedSectionId },
          body: orderedIds,
        })
      ),
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({
        queryKey: ["admin-course-curriculum", courseId],
      });
      const prev = queryClient.getQueryData<CourseCurriculumRead>([
        "admin-course-curriculum",
        courseId,
      ]);
      if (prev) {
        queryClient.setQueryData<CourseCurriculumRead>(
          ["admin-course-curriculum", courseId],
          {
            ...prev,
            sections: (prev.sections ?? []).map((s) =>
              s.id === selectedSectionId
                ? {
                    ...s,
                    lessons: [...(s.lessons ?? [])].sort(
                      (a, b) =>
                        orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id)
                    ),
                  }
                : s
            ),
          }
        );
      }
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(
          ["admin-course-curriculum", courseId],
          ctx.prev
        );
      }
      toast.error(getErrorMessage(err));
    },
  });

  const moveMutation = useMutation({
    mutationFn: ({
      lessonId,
      targetSectionId,
    }: {
      lessonId: string;
      targetSectionId: string;
    }) =>
      unwrap(
        moveLesson({
          path: { course_id: courseId, lesson_id: lessonId },
          body: { target_section_id: targetSectionId },
        })
      ),
    onSuccess: () => {
      toast.success("Lesson moved");
      onRefresh();
      setMoveLessonId(null);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const moveUp = (index: number) => {
    if (index === 0) return;
    const ids = lessons.map((l) => l.id);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    reorderMutation.mutate(ids);
  };

  const moveDown = (index: number) => {
    if (index === lessons.length - 1) return;
    const ids = lessons.map((l) => l.id);
    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    reorderMutation.mutate(ids);
  };

  return (
    <div className="space-y-6">
      {/* Section selector */}
      <div className="flex items-center gap-4">
        <CustomSelect
          options={sections.map((s) => ({ value: s.id, label: s.title }))}
          value={selectedSectionId}
          onChange={(v) => setSelectedSectionId(v as string)}
          placeholder="Select section..."
          label="Section"
          className="flex-1"
        />
      </div>

      {/* Add new lesson */}
      <div className="border border-border bg-dark/20 p-4 space-y-3 rounded">
        <div className="text-xs font-mono text-gold uppercase tracking-widest ">
          New Lesson
        </div>
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Lesson title..."
          className="w-full h-10 bg-dark border border-border px-4 text-sm text-text-main placeholder:text-text-muted/40 focus:outline-none focus:border-gold/50 font-mono rounded-sm glass-input"
        />
        <input
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          placeholder="Description (optional)"
          className="w-full h-10 bg-dark border border-border px-4 text-sm text-text-main placeholder:text-text-muted/40 focus:outline-none focus:border-gold/50 font-mono rounded-sm glass-input"
        />
        <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
          <Checkbox
            id="new-preview"
            checked={newPreview}
            onCheckedChange={setNewPreview}
          />
          Free preview
        </label>
        <Button
          size="sm"
          onClick={() =>
            newTitle.trim() &&
            createMutation.mutate({
              title: newTitle.trim(),
              description: newDescription.trim() || null,
              is_preview: newPreview,
            })
          }
          disabled={
            !newTitle.trim() || createMutation.isPending || !selectedSectionId
          }
        >
          <Plus size={14} /> Add Lesson
        </Button>
      </div>

      {/* Lesson list */}
      <div className="space-y-1">
        {lessons.map((lesson, i) => (
          <div
            key={lesson.id}
            className="border border-border bg-dark/40 p-3 flex items-center gap-3"
          >
            <div className="flex flex-col gap-0.5">
              <Tooltip label="Move up">
                <button
                  onClick={() => moveUp(i)}
                  disabled={i === 0}
                  className="text-text-muted hover:text-text-main disabled:opacity-30"
                >
                  <ChevronUp size={12} />
                </button>
              </Tooltip>
              <Tooltip label="Move down">
                <button
                  onClick={() => moveDown(i)}
                  disabled={i === lessons.length - 1}
                  className="text-text-muted hover:text-text-main disabled:opacity-30"
                >
                  <ChevronDown size={12} />
                </button>
              </Tooltip>
            </div>

            {editingLesson === lesson.id ? (
              <div className="flex-1 space-y-2">
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full h-9 bg-dark border border-border px-3 text-sm text-text-main focus:outline-none focus:border-gold/50 font-mono rounded-sm glass-input"
                  autoFocus
                />
                <input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Description"
                  className="w-full h-9 bg-dark border border-border px-3 text-sm text-text-main focus:outline-none focus:border-gold/50 font-mono rounded-sm glass-input"
                />
                <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer">
                  <Checkbox
                    id={`edit-preview-${lesson.id}`}
                    checked={editPreview}
                    onCheckedChange={setEditPreview}
                  />
                  Free preview
                </label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() =>
                      updateMutation.mutate({
                        lessonId: lesson.id,
                        data: {
                          title: editTitle.trim(),
                          description: editDescription.trim() || null,
                          is_preview: editPreview,
                        },
                      })
                    }
                  >
                    <Save size={13} /> Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingLesson(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Play size={12} className="text-text-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-text-main text-sm font-medium truncate">
                      <span className="text-text-muted mr-1">{i + 1}.</span>
                      {lesson.title}
                    </span>
                    {lesson.is_preview && (
                      <span className="text-[8px] font-mono text-gold uppercase tracking-wider border border-gold/30 px-1.5 rounded">
                        Preview
                      </span>
                    )}
                  </div>
                  <div className="text-2xs font-mono text-text-muted flex items-center gap-3">
                    <span>{formatDuration(lesson.video_duration_seconds)}</span>
                    <span
                      className={cn(
                        "capitalize",
                        lesson.status === "ready" && !lesson.video_key
                          ? "text-red-400"
                          : lesson.status === "ready"
                            ? "text-emerald-400"
                            : lesson.status === "processing" && !lesson.video_key
                              ? "text-text-muted"
                              : lesson.status === "processing"
                                ? "text-amber-400"
                                : "text-red-400"
                      )}
                    >
                      {lesson.status === "ready" && !lesson.video_key
                        ? "no video"
                        : lesson.status === "processing" && !lesson.video_key
                          ? "no video"
                          : lesson.status}
                    </span>
                  </div>
                </div>

                {/* Move to section */}
                {moveLessonId === lesson.id ? (
                  <div className="flex items-center gap-2">
                    <CustomSelect
                      options={sections
                        .filter((s) => s.id !== selectedSectionId)
                        .map((s) => ({ value: s.id, label: s.title }))}
                      value={moveTargetSection}
                      onChange={(v) => setMoveTargetSection(v as string)}
                      placeholder="Move to..."
                      className="min-w-36"
                    />
                    <Tooltip label="Confirm move">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-emerald-400"
                        onClick={() =>
                          moveTargetSection &&
                          moveMutation.mutate({
                            lessonId: lesson.id,
                            targetSectionId: moveTargetSection,
                          })
                        }
                      >
                        <Check size={13} />
                      </Button>
                    </Tooltip>
                    <Tooltip label="Cancel move">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-400"
                        onClick={() => setMoveLessonId(null)}
                      >
                        <X size={13} />
                      </Button>
                    </Tooltip>
                  </div>
                ) : (
                  <>
                    <UploadButton
                      lessonId={lesson.id}
                      courseId={courseId}
                      onRefresh={onRefresh}
                    />
                    <Tooltip label="Edit lesson">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-text-muted hover:text-gold"
                        onClick={() => {
                          setEditingLesson(lesson.id);
                          setEditTitle(lesson.title);
                          setEditDescription(lesson.description ?? "");
                          setEditPreview(lesson.is_preview ?? false);
                        }}
                      >
                        <Pencil size={13} />
                      </Button>
                    </Tooltip>
                    <Tooltip label="Move to section">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-text-muted hover:text-amber-400"
                        onClick={() => {
                          setMoveLessonId(lesson.id);
                          setMoveTargetSection(
                            sections.find((s) => s.id !== selectedSectionId)
                              ?.id ?? ""
                          );
                        }}
                      >
                        <MoveRight size={13} />
                      </Button>
                    </Tooltip>
                    <Tooltip label="Delete lesson">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-text-muted hover:text-red-400"
                        onClick={() =>
                          setLessonDeleteTarget({
                            id: lesson.id,
                            title: lesson.title,
                          })
                        }
                      >
                        <Trash2 size={13} />
                      </Button>
                    </Tooltip>
                  </>
                )}
              </>
            )}
          </div>
        ))}

        {lessons.length === 0 && (
          <div className="text-center py-8 text-text-muted text-sm font-mono border border-dashed border-border rounded">
            No lessons in this section.
          </div>
        )}
      </div>

      <StatusModal
        isOpen={!!lessonDeleteTarget}
        onClose={() => setLessonDeleteTarget(null)}
        type="error"
        title="Delete Lesson"
        message={`This action cannot be undone.\n${lessonDeleteTarget?.title}`}
        actionText={deleteMutation.isPending ? "Deleting..." : "Delete"}
        onAction={() => {
          if (lessonDeleteTarget) {
            deleteMutation.mutate(lessonDeleteTarget.id);
            setLessonDeleteTarget(null);
          }
        }}
        secondaryText="Cancel"
        onSecondary={() => setLessonDeleteTarget(null)}
      />
    </div>
  );
}

// ─── Lesson Video Upload ───────────────────────────────────────────────────────

function UploadButton({
  lessonId,
  courseId,
  onRefresh,
}: {
  lessonId: string;
  courseId: string;
  onRefresh: () => void;
}) {
  const [uploadState, setUploadState] = useState<
    "idle" | "uploading" | "confirming"
  >("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadState("uploading");
    setUploadProgress(0);
    try {
      await uploadLessonVideoViaPresigned(courseId, lessonId, file, (pct) => {
        setUploadProgress(pct);
      });
      setUploadState("confirming");
      toast.success("Video uploaded");
      onRefresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploadState("idle");
      setUploadProgress(0);
    }
  };

  const busy = uploadState !== "idle";

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleUpload}
      />
      <div className="flex items-center gap-1.5">
        <Tooltip label={busy ? `${uploadProgress}%` : "Upload video"}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-text-muted hover:text-gold"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? (
              <span className="text-label font-mono font-semibold tabular-nums text-gold">
                {uploadProgress}%
              </span>
            ) : (
              <Upload size={13} />
            )}
          </Button>
        </Tooltip>
        {busy && (
          <div className="h-1 w-12 rounded-full bg-border overflow-hidden">
            <div
              className="h-full bg-gold transition-[width] duration-200 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </div>
    </>
  );
}

// ─── Settings Tab ──────────────────────────────────────────────────────────────

function SettingsTab({ course }: { course: CourseRead }) {
  const router = useRouter();
  const [courseDeleteOpen, setCourseDeleteOpen] = useState(false);

  const deleteMut = useMutation({
    mutationFn: () => unwrapVoid(deleteCourse({ path: { slug: course.slug } })),
    onSuccess: () => {
      toast.success("Course deleted");
      router.push("/admin/courses");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <div className="space-y-10">
      <div className="border border-border p-6 space-y-3 rounded">
        <div className="text-sm font-semibold text-text-main">Course Info</div>
        <div className="grid grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <span className="text-text-muted">ID:</span>{" "}
            <span className="text-text-main">{course.id}</span>
          </div>
          <div>
            <span className="text-text-muted">Slug:</span>{" "}
            <span className="text-text-main">{course.slug}</span>
          </div>
          <div>
            <span className="text-text-muted">Created:</span>{" "}
            <span className="text-text-main">
              {course.created_at
                ? new Date(course.created_at).toLocaleDateString()
                : "—"}
            </span>
          </div>
          <div>
            <span className="text-text-muted">Updated:</span>{" "}
            <span className="text-text-main">
              {course.updated_at
                ? new Date(course.updated_at).toLocaleDateString()
                : "—"}
            </span>
          </div>
          <div>
            <span className="text-text-muted">Price:</span>{" "}
            <span className="text-text-main">{displayPrice(course.price)}</span>
          </div>
          <div>
            <span className="text-text-muted">Level:</span>{" "}
            <span className="text-text-main capitalize">{course.level}</span>
          </div>
        </div>
      </div>
      <div className="border border-red-500/20 p-6 space-y-4 bg-red-500/5 rounded">
        <div className="text-sm font-semibold text-red-400">Danger Zone</div>
        <p className="text-xs text-text-muted">
          Permanently delete this course and all its content. This cannot be
          undone.
        </p>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setCourseDeleteOpen(true)}
          disabled={deleteMut.isPending}
        >
          <Trash2 size={14} /> Delete Course
        </Button>
      </div>

      <StatusModal
        isOpen={courseDeleteOpen}
        onClose={() => setCourseDeleteOpen(false)}
        type="error"
        title="Delete Course"
        message={`This will delete all sections, lessons, and enrollments.\n${course.slug}`}
        actionText={deleteMut.isPending ? "Deleting..." : "Delete"}
        onAction={() => {
          deleteMut.mutate();
          setCourseDeleteOpen(false);
        }}
        secondaryText="Cancel"
        onSecondary={() => setCourseDeleteOpen(false)}
      />
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminCourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [detailsEditing, setDetailsEditing] = useState(false);

  const curriculumQuery = useQuery({
    queryKey: ["admin-course-curriculum", id],
    queryFn: () => fetchCourseCurriculum(id),
    enabled: !!id,
  });

  const statsQuery = useQuery({
    queryKey: ["admin-course-stats", id],
    queryFn: () => fetchCourseStats(id),
    enabled: !!id,
  });

  const course = curriculumQuery.data;
  const sections = course?.sections ?? [];
  const stats = statsQuery.data;
  const computedRevenue = stats?.total_revenue
    ? stats.total_revenue
    : (stats?.enrollment_count ?? 0) > 0 && course?.price
      ? stats!.enrollment_count * Number(course.price)
      : 0;

  const refresh = useCallback(() => {
    curriculumQuery.refetch();
    statsQuery.refetch();
    queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
  }, [curriculumQuery, statsQuery, queryClient]);

  const updateMutation = useMutation({
    mutationFn: (data: CourseFormValues) => {
      const payload = JSON.stringify({
        title: data.title,
        slug: data.slug || null,
        short_description: data.short_description || null,
        description: data.description || null,
        level: data.level as CourseLevel,
        language: data.language,
        price: data.price,
        welcome_message: data.welcome_message || null,
        whatsapp_channel_url: data.whatsapp_channel_url || null,
        category_id: data.category_id || null,
        what_you_will_learn:
          (data.what_you_will_learn ?? []).filter(Boolean).length > 0
            ? (data.what_you_will_learn ?? []).filter(Boolean)
            : null,
        requirements:
          (data.requirements ?? []).filter(Boolean).length > 0
            ? (data.requirements ?? []).filter(Boolean)
            : null,
        is_featured: data.is_featured,
        is_published: data.is_published,
        thumbnail_url: data.thumbnail_url ?? null,
        demo_video_url: data.demo_video_url ?? null,
      });
      return unwrap(
        updateCourse({
          path: { slug: course!.slug },
          body: {
            payload,
            thumbnail: data.thumbnail ?? null,
            demo_video: data.demo_video ?? null,
          },
        })
      );
    },
    onSuccess: () => {
      toast.success("Course updated");
      refresh();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (curriculumQuery.isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-4 w-28" />
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-3 min-w-0 flex-1">
            <Skeleton className="h-9 w-96" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-20 rounded-sm" />
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Skeleton className="h-9 w-9 rounded" />
            <Skeleton className="h-9 w-32 rounded" />
          </div>
        </div>
        <div className="flex gap-2 border-b border-border/40 pb-px">
          {["Overview", "Curriculum", "Details", "Sections", "Lessons", "Settings"].map((t) => (
            <Skeleton key={t} className="h-10 w-24 rounded-t" />
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border border-border p-4 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
        <div className="border border-border p-6 space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (curriculumQuery.error || !course) notFound();

  return (
    <div className="space-y-8">
      <Link
        href="/admin/courses"
        className="flex items-center gap-2 text-2xs font-mono uppercase tracking-[0.2em] text-text-muted hover:text-gold transition-colors"
      >
        <ChevronLeft size={14} /> Back to Courses
      </Link>

      <div className="flex items-start justify-between gap-6">
        <div className="space-y-3 min-w-0">
          <h1 className="text-3xl font-black text-text-main tracking-tighter uppercase leading-tight">
            {course.title}
          </h1>
          <div className="flex items-center flex-wrap gap-3 text-sm font-mono">
            <span className="text-text-muted">{course.slug}</span>
            <span className="w-px h-3 bg-border/40" />
            <span className="text-gold font-bold tracking-tight">
              {displayPrice(course.price)}
            </span>
            <span className="w-px h-3 bg-border/40" />
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-2xs font-mono uppercase tracking-widest px-3 py-1 rounded-sm border",
                course.is_published
                  ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/5"
                  : "text-text-muted border-border bg-muted/30"
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  course.is_published ? "bg-emerald-400" : "bg-text-muted"
                )}
              />
              {course.is_published ? "Published" : "Draft"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Tooltip label="Refresh">
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={curriculumQuery.isFetching}
            >
              <RefreshCw
                size={14}
                className={curriculumQuery.isFetching ? "animate-spin" : ""}
              />
            </Button>
          </Tooltip>
          <Tooltip label="View on site">
            <Link href={`/courses/${course.slug}`} target="_blank">
              <Button variant="outline" size="sm">
                <ExternalLink size={14} /> Public View
              </Button>
            </Link>
          </Tooltip>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-10!">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="sections">Sections</TabsTrigger>
          <TabsTrigger value="lessons">Lessons</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatBox label="Sections" value={String(sections.length)} count={sections.length} />
            <StatBox
              label="Lessons"
              value={String(
                sections.reduce((a, s) => a + (s.lessons?.length ?? 0), 0)
              )}
              count={sections.reduce((a, s) => a + (s.lessons?.length ?? 0), 0)}
            />
            <StatBox
              label="Duration"
              value={formatDuration(course.total_duration_seconds)}
            />
            <StatBox
              label="Level"
              value={
                course.level.charAt(0).toUpperCase() + course.level.slice(1)
              }
            />
            <StatBox
              label="Students Enrolled"
              value={String(stats?.enrollment_count ?? "—")}
              count={stats?.enrollment_count ?? 0}
            />
            <StatBox
              label="Total Revenue"
              value={
                computedRevenue ? displayPrice(computedRevenue) : displayPrice(0)
              }
            />
          </div>
          {course.short_description && (
            <div className="border border-border p-6">
              <div className="text-2xs font-mono text-text-muted uppercase tracking-widest mb-2">
                Description
              </div>
              <p className="text-text-muted text-sm">
                {course.short_description}
              </p>
            </div>
          )}
          {/* Media preview */}
          {(course.computed_thumbnail_url ||
            course.computed_demo_video_url) && (
            <div className="border border-border p-6 rounded">
              <div className="text-2xs font-mono text-text-muted uppercase tracking-widest mb-4">
                Media
              </div>
              <div className="flex flex-wrap gap-6">
                {course.computed_thumbnail_url && (
                  <div className="space-y-2">
                    <div className="text-xs font-mono text-text-muted">
                      Thumbnail
                    </div>
                    <div className="aspect-video w-60 bg-dark border border-border overflow-hidden rounded-sm">
                      <img
                        src={course.computed_thumbnail_url}
                        alt="Thumbnail"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
                {course.computed_demo_video_url && (
                  <div className="space-y-2">
                    <div className="text-xs font-mono text-text-muted">
                      Demo Video
                    </div>
                    <a
                      href={course.computed_demo_video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-dark border border-border text-xs font-mono text-gold hover:border-gold/40 rounded-sm transition-all"
                    >
                      <Play size={14} /> Watch Demo
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {sections.length > 0 && (
            <div className="border border-border rounded">
              <div className="p-4 border-b border-border bg-dark/30 rounded">
                <div className="text-xs font-mono text-gold uppercase tracking-widest">
                  Curriculum Preview ({sections.length} sections)
                </div>
              </div>
              {sections.map((s, i) => (
                <div
                  key={s.id}
                  className="border-b border-border last:border-b-0 p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-mono text-text-muted">
                      Section {i + 1}
                    </div>
                    <div className="text-sm text-text-main font-medium">
                      {s.title}
                    </div>
                  </div>
                  <span className="text-xs font-mono text-text-muted">
                    {s.lessons?.length ?? 0} lessons
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="students">
          <EnrolledStudentsSection courseId={course.id} courseTitle={course.title} />
        </TabsContent>

        <TabsContent value="curriculum">
          <CurriculumTab sections={sections} />
        </TabsContent>

        <TabsContent value="details">
          {detailsEditing ? (
            <div className="border border-border bg-surface/30 p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="text-xs font-mono text-gold uppercase tracking-widest">
                  Edit Course Details
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDetailsEditing(false)}
                >
                  <X size={14} /> Cancel
                </Button>
              </div>
              <CourseForm
                initialData={course}
                onSubmit={(data) => {
                  updateMutation.mutate(data);
                  setDetailsEditing(false);
                }}
                isSubmitting={updateMutation.isPending}
              />
            </div>
          ) : (
            <div className="border border-border bg-surface/30 p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-xs font-mono text-gold uppercase tracking-widest">
                  Course Details
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailsEditing(true)}
                >
                  <Pencil size={13} /> Edit Details
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <Field label="Title" value={course.title} />
                <Field label="Slug" value={course.slug} />
                <Field
                  label="Level"
                  value={
                    course.level.charAt(0).toUpperCase() + course.level.slice(1)
                  }
                />
                <Field
                  label="Language"
                  value={
                    course.language.charAt(0).toUpperCase() +
                    course.language.slice(1)
                  }
                />
                <Field label="Price" value={displayPrice(course.price)} />
                <Field label="Category" value={course.category_id ?? "—"} />
                <Field
                  label="Featured"
                  value={course.is_featured ? "Yes" : "No"}
                />
                <Field
                  label="Published"
                  value={course.is_published ? "Yes" : "No"}
                />
              </div>
              <Field
                label="Short Description"
                value={course.short_description || "—"}
              />
              {course.description && (
                <Field label="Full Description" value={course.description} />
              )}
              {course.welcome_message && (
                <Field label="Welcome Message" value={course.welcome_message} />
              )}
              {course.whatsapp_channel_url && (
                <Field
                  label="WhatsApp Channel"
                  value={course.whatsapp_channel_url}
                />
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {course.what_you_will_learn &&
                  course.what_you_will_learn.length > 0 && (
                    <div>
                      <div className="font-mono tracking-widest uppercase text-text-muted text-2xs mb-2">
                        What You Will Learn
                      </div>
                      <ul className="list-disc list-inside text-sm text-text-muted space-y-1">
                        {course.what_you_will_learn.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                {course.requirements && course.requirements.length > 0 && (
                  <div>
                    <div className=" font-mono tracking-widest uppercase text-text-muted text-2xs mb-2">
                      Requirements
                    </div>
                    <ul className="list-disc list-inside text-sm text-text-muted space-y-1">
                      {course.requirements.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="sections">
          <SectionBuilder
            courseId={id}
            sections={sections}
            onRefresh={refresh}
          />
        </TabsContent>

        <TabsContent value="lessons">
          <LessonBuilder
            courseId={id}
            sections={sections}
            onRefresh={refresh}
          />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsTab course={course} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatBox({ label, value, count }: { label: string; value: string; count?: number }) {
  return (
    <div className="rounded border border-border bg-dark/30 p-5 flex flex-col items-center justify-center text-center">
      <div className="text-2xl font-bold text-text-main">
        {count !== undefined ? <AnimatedCounter target={count} /> : value}
      </div>
      <div className="text-2xs font-mono text-text-muted uppercase tracking-widest mt-1">
        {label}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className=" font-mono tracking-widest uppercase text-text-muted text-2xs mb-1">
        {label}
      </div>
      <div className="text-text-main text-sm wrap-break-words">{value}</div>
    </div>
  );
}

function CurriculumTab({
  sections,
}: {
  sections: CourseSectionWithLessonsRead[];
}) {
  const [openSections, setOpenSections] = useState<string[]>([]);

  const toggle = (id: string) => {
    setOpenSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  return (
    <div className="border border-border rounded overflow-hidden">
      {sections.length === 0 && (
        <div className="p-8 text-center text-text-muted text-sm font-mono">
          No sections yet.
        </div>
      )}
      {sections.map((section, i) => {
        const isOpen = openSections.includes(section.id);
        return (
          <div
            key={section.id}
            className="border-b border-border last:border-b-0"
          >
            <button
              onClick={() => toggle(section.id)}
              className="w-full flex items-center justify-between gap-4 px-6 py-4 bg-dark/20 hover:bg-dark/40 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <BookOpen size={15} className="text-gold shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-mono text-text-muted">
                    Section {i + 1}
                  </div>
                  <div className="text-sm text-text-main font-medium truncate">
                    {section.title}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-2xs font-mono text-text-muted">
                  {section.lessons?.length ?? 0} lesson
                  {(section.lessons?.length ?? 0) !== 1 ? "s" : ""}
                </span>
                <ChevronDown
                  size={14}
                  className={cn(
                    "text-text-muted transition-transform duration-200",
                    isOpen && "rotate-180"
                  )}
                />
              </div>
            </button>
            {isOpen && (
              <div className="border-t border-border bg-dark-soft">
                {(!section.lessons || section.lessons.length === 0) && (
                  <div className="px-6 py-4 text-text-muted text-sm font-mono">
                    No lessons in this section.
                  </div>
                )}
                {section.lessons?.map((lesson, li) => (
                  <div
                    key={lesson.id}
                    className="flex items-center gap-4 px-6 py-3 border-b border-border last:border-b-0"
                  >
                    <div className="w-7 h-7 bg-muted border border-border flex items-center justify-center shrink-0 rounded-sm">
                      {lesson.computed_video_url ? (
                        <Play size={10} className="text-text-muted ml-0.5" />
                      ) : (
                        <span className="text-tiny font-mono text-text-muted">
                          {li + 1}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-text-main truncate">
                        <span className="text-text-muted mr-1">{li + 1}.</span>
                        {lesson.title}
                      </div>
                      {lesson.description && (
                        <div className="text-xs text-text-muted truncate mt-0.5">
                          {lesson.description}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-2xs font-mono text-text-muted">
                        {formatDuration(lesson.video_duration_seconds)}
                      </span>
                      <span
                        className={cn(
                          "text-2xs font-mono uppercase tracking-wider px-2 py-0.5 rounded-sm border",
                          lesson.status === "ready" && !lesson.video_key
                            ? "text-red-400 border-red-400/30"
                            : lesson.status === "ready"
                              ? "text-emerald-400 border-emerald-400/30"
                              : lesson.status === "processing" &&
                                  !lesson.video_key
                                ? "text-text-muted border-border"
                                : lesson.status === "processing"
                                  ? "text-amber-400 border-amber-400/30"
                                  : "text-red-400 border-red-400/30"
                        )}
                      >
                        {lesson.status === "ready" && !lesson.video_key
                          ? "no video"
                          : lesson.status === "processing" && !lesson.video_key
                            ? "no video"
                            : lesson.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
