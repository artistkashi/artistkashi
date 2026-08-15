"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Search, UserPlus, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { unwrap, unwrapPaginated } from "@/api/client-service";
import {
  adminDirectEnroll,
  listAdminUsers,
  type AdminUserListRead,
} from "@/api/openapi-client";
import { getErrorMessage } from "@/lib/error-handler";
import { cn } from "@/lib/utils";

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseTitle: string;
  onEnrolled: () => void;
}

const inputClass = cn(
  "w-full bg-dark/40 border px-4 py-3 text-sm text-text-main",
  "focus:outline-none focus:bg-dark/60 transition-all duration-300",
  "placeholder:text-text-muted/30 rounded-sm border-border/60 focus:border-gold/50"
);

export function AddStudentModal({
  isOpen,
  onClose,
  courseId,
  courseTitle,
  onEnrolled,
}: AddStudentModalProps) {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUserListRead | null>(
    null
  );
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSearchInput("");
      setDebouncedSearch("");
      setSelectedUser(null);
      setAmount("");
      setNote("");
    }
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: searchData, isFetching: searching } = useQuery({
    queryKey: ["admin-users-search", debouncedSearch],
    queryFn: () =>
      unwrapPaginated(
        listAdminUsers({
          query: {
            page: 1,
            page_size: 8,
            sort_columns: "full_name",
            sort_orders: "asc",
            is_active: true,
            ...(debouncedSearch ? { search: debouncedSearch } : {}),
          },
        })
      ),
    enabled: isOpen,
  });

  const userResults = useMemo(
    () => (searchData?.data ?? []).filter((u) => u.id !== selectedUser?.id),
    [searchData, selectedUser]
  );

  const enrollMutation = useMutation({
    mutationFn: () =>
      unwrap(
        adminDirectEnroll({
          path: { course_id: courseId },
          body: {
            user_id: selectedUser!.id!,
            amount_paid: Number(amount),
            ...(note.trim() ? { note: note.trim() } : {}),
          },
        })
      ),
    onSuccess: () => {
      toast.success(
        `${selectedUser?.full_name ?? "Student"} enrolled successfully`
      );
      onEnrolled();
      onClose();
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });

  const amountError =
    amount !== "" &&
    (Number.isNaN(Number(amount)) || Number(amount) <= 0)
      ? "Amount must be greater than zero"
      : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      toast.error("Please select a student");
      return;
    }
    if (amountError || amount === "") {
      toast.error("Enter a valid amount paid");
      return;
    }
    enrollMutation.mutate();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          key="add-student-wrapper"
          className="fixed inset-0 z-60 flex items-center justify-center p-4"
        >
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-dark/85 backdrop-blur-md"
          />

          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-md bg-muted-light border border-border shadow-2xl shadow-black/60 overflow-hidden"
          >
            <div className="h-px bg-linear-to-r from-transparent via-gold/50 to-transparent" />

            <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-dark/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gold/10 border border-gold/20 flex items-center justify-center text-gold shrink-0">
                  <UserPlus size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-[0.15em] text-text-main uppercase">
                    Add Student
                  </h3>
                  <p className="text-2xs text-gold/50 font-mono tracking-[0.2em] uppercase mt-0.5">
                    Direct enrollment — offline payment
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

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Course (fixed) */}
              <div className="space-y-2">
                <label className="text-label font-mono tracking-widest uppercase text-text-muted block">
                  Course
                </label>
                <div className="px-4 py-3 text-sm text-text-main border border-border/40 bg-dark/20 rounded-sm">
                  {courseTitle}
                </div>
              </div>

              {/* Student search */}
              <div className="space-y-2">
                <label className="text-label font-mono tracking-widest uppercase text-text-muted block">
                  Student{" "}
                  <span className="text-gold" aria-hidden="true">
                    *
                  </span>
                </label>
                {selectedUser ? (
                  <div className="flex items-center justify-between gap-3 px-4 py-3 border border-gold/30 bg-gold/5 rounded-sm">
                    <div className="min-w-0">
                      <div className="text-sm text-text-main truncate">
                        {selectedUser.full_name || selectedUser.email}
                      </div>
                      <div className="text-xs text-text-muted truncate">
                        {selectedUser.email}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedUser(null)}
                      className="text-text-muted hover:text-gold shrink-0"
                      aria-label="Clear student selection"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted/50"
                    />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Search by name or email..."
                      autoFocus
                      className={cn(inputClass, "pl-9")}
                    />
                    {searchInput !== "" && (
                      <div className="absolute top-full left-0 right-0 mt-1 z-10 bg-muted-light border border-border max-h-56 overflow-y-auto shadow-2xl shadow-black/60">
                        {searching ? (
                          <div className="px-4 py-3 text-xs text-text-muted font-mono">
                            Searching...
                          </div>
                        ) : userResults.length === 0 ? (
                          <div className="px-4 py-3 text-xs text-text-muted font-mono">
                            No registered users found
                          </div>
                        ) : (
                          userResults.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => {
                                setSelectedUser(user);
                                setSearchInput("");
                                setDebouncedSearch("");
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <div className="text-sm text-text-main truncate">
                                  {user.full_name || "Unnamed"}
                                </div>
                                <div className="text-xs text-text-muted truncate">
                                  {user.email}
                                </div>
                              </div>
                              <Users
                                size={14}
                                className="text-gold/60 shrink-0"
                              />
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Amount paid */}
              <div className="space-y-2">
                <label className="text-label font-mono tracking-widest uppercase text-text-muted block">
                  Amount Paid (₹){" "}
                  <span className="text-gold" aria-hidden="true">
                    *
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 1500"
                  className={cn(
                    inputClass,
                    amountError && "border-red-500/50 focus:border-red-500"
                  )}
                />
                {amountError && (
                  <p className="text-xs text-red-500">{amountError}</p>
                )}
              </div>

              {/* Payment method (fixed) */}
              <div className="space-y-2">
                <label className="text-label font-mono tracking-widest uppercase text-text-muted block">
                  Payment Method
                </label>
                <div className="inline-flex items-center gap-2 px-4 py-3 border border-gold/30 bg-gold/5 rounded-sm text-sm text-gold font-mono tracking-widest uppercase">
                  Direct
                </div>
              </div>

              {/* Optional note */}
              <div className="space-y-2">
                <label className="text-label font-mono tracking-widest uppercase text-text-muted block">
                  Note{" "}
                  <span className="text-text-muted/40 normal-case text-2xs tracking-normal font-sans">
                    (optional)
                  </span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Special price agreed directly with artist"
                  rows={2}
                  className={cn(inputClass, "resize-none")}
                />
              </div>

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
                  disabled={enrollMutation.isPending}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 px-7 py-2.5",
                    "bg-text-main text-dark text-2xs font-semibold tracking-[0.08em] uppercase",
                    "transition-all duration-300 hover:bg-gold hover:text-dark",
                    "disabled:opacity-40 disabled:cursor-not-allowed"
                  )}
                >
                  {enrollMutation.isPending ? (
                    <div className="luxury-loader scale-50 -mx-4 -my-2" />
                  ) : (
                    "Enroll Student"
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