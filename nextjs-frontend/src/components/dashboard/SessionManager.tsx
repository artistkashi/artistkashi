"use client";

import { unwrap } from "@/api/client-service";
import type { UserSessionRead } from "@/api/openapi-client";
import { listSessions, logoutAll, revokeSession } from "@/api/openapi-client";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Globe,
  Laptop,
  Loader2,
  LogOut,
  Monitor,
  Smartphone,
  Tablet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";

interface DeviceInfo {
  device?: string;
  device_type?: string;
  os?: string;
  browser?: string;
}

function parseDeviceInfo(raw: string | null | undefined): DeviceInfo | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DeviceInfo;
  } catch {
    return null;
  }
}

function DeviceIcon({ deviceType }: { deviceType?: string }) {
  switch (deviceType) {
    case "mobile":
      return <Smartphone size={14} />;
    case "tablet":
      return <Tablet size={14} />;
    case "desktop":
      return <Monitor size={14} />;
    default:
      return <Globe size={14} />;
  }
}

function formatSessionTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function SessionManager() {
  const [sessions, setSessions] = useState<UserSessionRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const sessions = await unwrap(listSessions({}));
      setSessions(sessions ?? []);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleLogoutAll = async () => {
    setLoggingOutAll(true);
    try {
      await unwrap(logoutAll({}));
      toast.success("All other sessions revoked");
      fetchSessions();
    } catch {
      toast.error("Failed to revoke sessions");
    } finally {
      setLoggingOutAll(false);
    }
  };

  const handleRevoke = async (sessionId: number) => {
    setRevokingId(sessionId);
    try {
      await unwrap(revokeSession({ path: { session_id: sessionId } }));
      toast.success("Session revoked");
      fetchSessions();
    } catch {
      toast.error("Failed to revoke session");
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-text-main font-bold text-2xl md:text-3xl">
          Active Sessions
        </h2>
        {sessions.length > 1 && (
          <button
            onClick={handleLogoutAll}
            disabled={loggingOutAll}
            className="flex items-center gap-1.5 text-2xs font-mono text-text-muted hover:text-red-400 transition-colors uppercase tracking-widest disabled:opacity-50"
            title="Revoke all other sessions"
          >
            {loggingOutAll ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <LogOut size={12} />
            )}
            Logout All
          </button>
        )}
      </div>
      <div className="border border-border bg-surface rounded overflow-hidden">
        {loading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="px-6 md:px-8 py-5 md:py-6 space-y-3">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-text-muted">
            <Laptop size={32} className="opacity-40" />
            <p className="text-xs font-mono uppercase tracking-widest">
              No active sessions
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sessions.map((s) => {
              const device = parseDeviceInfo(s.device_info);
              const isCurrent = sessions.indexOf(s) === 0;
              const displayName = [device?.device, device?.browser, device?.os]
                .filter(Boolean)
                .join(" — ");
              return (
                <div key={s.id} className="px-6 md:px-8 py-5 md:py-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <DeviceIcon deviceType={device?.device_type} />
                        <span className="text-sm text-text-main font-semibold">
                          {displayName || "Unknown device"}
                        </span>
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 text-2xs font-mono text-gold uppercase tracking-widest border border-gold/20 bg-gold/5 px-2 py-0.5">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-2xs font-mono text-text-muted">
                        {s.user_agent && (
                          <span
                            className="truncate max-w-64"
                            title={s.user_agent}
                          >
                            {s.user_agent}
                          </span>
                        )}
                        {s.ip_address && (
                          <span className="shrink-0">{s.ip_address}</span>
                        )}
                      </div>
                      <div className="text-2xs font-mono text-text-muted/60">
                        Active {formatSessionTime(s.last_activity)}
                      </div>
                    </div>
                    {!isCurrent && (
                      <button
                        onClick={() => handleRevoke(s.id)}
                        disabled={revokingId === s.id}
                        className="flex items-center justify-center w-8 h-8 border border-border/60 text-text-muted hover:text-red-400 hover:border-red-400/40 transition-all rounded-sm disabled:opacity-50 group relative"
                      >
                        {revokingId === s.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <LogOut size={12} />
                        )}
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface border border-border text-2xs font-mono text-text-muted px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          Revoke
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
