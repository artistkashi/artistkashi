"use client";

import { useAuth } from "@/lib/auth-store";
import { getErrorMessage } from "@/lib/error-handler";
import { AlertTriangle, Eye, EyeOff, Loader2, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function DangerZone() {
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  useAuth();
  const hasGoogle = false; // Check if user has Google provider

  const handleDelete = async () => {
    if (!password) {
      toast.error("Please enter your password to confirm deletion.");
      return;
    }
    setIsDeleting(true);
    try {
      // TODO: Implement API call when backend endpoint is ready
      toast.success("Account deletion request submitted.");
      setShowModal(false);
      setPassword("");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="border border-red/30 bg-red-bg/30 rounded">
      <div className="px-6 md:px-8 py-5 md:py-6 border-b border-red/20">
        <div className="flex items-center gap-3">
          <AlertTriangle size={18} className="text-red" />
          <h2 className="text-text-main font-bold text-lg">Danger Zone</h2>
        </div>
      </div>
      <div className="p-6 md:p-8">
        <p className="text-text-muted text-sm mb-4">
          Once you delete your account, there is no going back. Please be
          certain.
        </p>
        <div className="flex items-center justify-between gap-4 p-4 border border-red/20 bg-red/5 rounded">
          <div className="min-w-0">
            <div className="text-text-main font-semibold text-sm">
              Delete your account
            </div>
            <div className="text-text-muted text-xs font-mono mt-0.5">
              Permanently remove your account and all associated data
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-red/10 border border-red/30 text-red text-xs font-mono tracking-widest uppercase hover:bg-red/20 transition-colors rounded"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
              setPassword("");
            }
          }}
        >
          <div className="w-full max-w-md bg-surface border border-border shadow-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <AlertTriangle size={18} className="text-red" />
                <h3 className="text-text-main font-bold text-base">
                  Delete Account
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setPassword("");
                }}
                className="text-text-muted hover:text-text-main transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-red/5 border border-red/20">
                <p className="text-text-muted text-sm">
                  This action is <strong className="text-red">permanent</strong>
                  . Your profile, courses progress, orders, and all associated
                  data will be deleted. You will not be able to recover your
                  account.
                </p>
              </div>
              <div>
                <label className="block text-label font-mono text-text-muted tracking-widest uppercase mb-1.5">
                  {hasGoogle
                    ? "Re-authenticate with Google to confirm"
                    : "Enter your password to confirm"}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full bg-dark border border-border text-text-main px-4 py-3 pr-12 text-sm focus:outline-none focus:border-red/50 transition-colors"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-4 text-text-muted hover:text-text-main transition-colors"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button
                onClick={() => {
                  setShowModal(false);
                  setPassword("");
                }}
                disabled={isDeleting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-border text-text-muted text-xs font-mono tracking-widest uppercase hover:text-text-main hover:border-gold/50 transition-colors rounded disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting || !password}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-red/10 border border-red/30 text-red text-xs font-mono tracking-widest uppercase hover:bg-red/20 transition-colors rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
