import { Check, X, Globe, KeyRound } from "lucide-react";
import type { ReactNode } from "react";

interface ProviderCardProps {
  name: string;
  description: string;
  icon: ReactNode;
  isConnected: boolean;
  action?: ReactNode;
  connectedAt?: string | null;
}

export function ProviderCard({
  name,
  description,
  icon,
  isConnected,
  action,
  connectedAt,
}: ProviderCardProps) {
  return (
    <div className="px-6 md:px-8 py-5 md:py-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-sm bg-gold-bg border border-gold/20 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-text-main font-semibold">{name}</div>
          <div className="text-text-muted text-xs font-mono truncate">
            {description}
          </div>
          {isConnected && connectedAt && (
            <div className="text-text-muted text-tiny font-mono mt-0.5">
              Connected {connectedAt}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {isConnected ? (
          <span className="flex items-center gap-1.5 text-xs font-mono tracking-widest uppercase text-green">
            <Check size={14} /> Connected
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-mono tracking-widest uppercase text-text-muted">
            <X size={14} /> Not connected
          </span>
        )}
        {action}
      </div>
    </div>
  );
}

export function googleIcon() {
  return <Globe size={18} className="text-gold" />;
}

export function passwordIcon() {
  return <KeyRound size={18} className="text-gold" />;
}
