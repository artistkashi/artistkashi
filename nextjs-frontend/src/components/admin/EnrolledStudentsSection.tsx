"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Plus, UserRoundX } from "lucide-react";
import { useState } from "react";

import { unwrap } from "@/api/client-service";
import {
  listCourseEnrolledStudents,
  type AdminEnrolledStudentRead,
} from "@/api/openapi-client";
import { AddStudentModal } from "@/components/admin/AddStudentModal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn, displayPrice } from "@/lib/utils";

interface EnrolledStudentsSectionProps {
  courseId: string;
  courseTitle: string;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function methodLabel(method: string | null | undefined): string {
  if (!method) return "—";
  return method === "direct" ? "Direct" : "Razorpay";
}

export function EnrolledStudentsSection({
  courseId,
  courseTitle,
}: EnrolledStudentsSectionProps) {
  const queryClient = useQueryClient();
  const [addModalOpen, setAddModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-course-enrolled-students", courseId],
    queryFn: () =>
      unwrap(listCourseEnrolledStudents({ path: { course_id: courseId } })),
    enabled: !!courseId,
  });

  const students = data ?? [];

  const handleEnrolled = () => {
    queryClient.invalidateQueries({
      queryKey: ["admin-course-enrolled-students", courseId],
    });
    queryClient.invalidateQueries({ queryKey: ["admin-course-stats", courseId] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gold/10 border border-gold/20 flex items-center justify-center text-gold shrink-0">
            <GraduationCap size={16} />
          </div>
          <div>
            <div className="text-xs font-mono text-gold uppercase tracking-widest">
              Enrolled Students ({students.length})
            </div>
            <div className="text-2xs text-text-muted font-mono tracking-widest uppercase">
              Online & direct enrollments
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setAddModalOpen(true)}>
          <Plus size={14} /> Add Student
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : students.length === 0 ? (
        <div className="border border-border border-dashed rounded p-10 flex flex-col items-center text-center gap-3">
          <UserRoundX size={28} className="text-text-muted/40" />
          <div className="text-sm text-text-muted">
            No students enrolled yet
          </div>
          <Button variant="outline" size="sm" onClick={() => setAddModalOpen(true)}>
            <Plus size={14} /> Add Student
          </Button>
        </div>
      ) : (
        <div className="border border-border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-dark/30">
                {[
                  "Student",
                  "Amount Paid",
                  "Payment",
                  "Status",
                  "Enrolled",
                  "Progress",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-2xs font-mono text-text-muted uppercase tracking-widest"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((student: AdminEnrolledStudentRead) => (
                <tr
                  key={student.id}
                  className="border-b border-border last:border-b-0 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="text-text-main">
                      {student.user_full_name || "Unnamed"}
                    </div>
                    <div className="text-xs text-text-muted">
                      {student.user_email}
                    </div>
                    {student.admin_note && (
                      <div className="text-2xs text-gold/70 italic mt-0.5 max-w-56 truncate">
                        {student.admin_note}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-main font-mono">
                    {displayPrice(student.amount_paid)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 text-2xs font-mono uppercase tracking-widest border rounded-sm",
                        student.payment_method === "direct"
                          ? "border-gold/40 bg-gold/5 text-gold"
                          : "border-border/60 bg-white/5 text-text-muted"
                      )}
                    >
                      {methodLabel(student.payment_method)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-2xs font-mono uppercase tracking-widest text-emerald-500/90">
                      {student.payment_status === "paid" ? "Paid" : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted font-mono">
                    {formatDate(student.enrolled_at)}
                  </td>
                  <td className="px-4 py-3">
                    {student.progress_percentage != null ? (
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-20 bg-dark border border-border/40 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gold transition-all"
                            style={{
                              width: `${Math.min(
                                100,
                                student.progress_percentage
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-text-muted font-mono">
                          {Math.round(student.progress_percentage)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddStudentModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        courseId={courseId}
        courseTitle={courseTitle}
        onEnrolled={handleEnrolled}
      />
    </div>
  );
}