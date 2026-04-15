/**
 * EmptyState
 *
 * Zero-data placeholder. Icon sits in a subtle tinted circle,
 * heading + body text below, optional CTA.
 */

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?:      ReactNode;
  heading:    string;
  body?:      string;
  action?:    ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  heading,
  body,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center text-center py-14 px-6 space-y-4", className)}>
      {icon && (
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full"
          style={{
            background: "rgba(34,197,94,0.08)",
            border:     "1px solid rgba(34,197,94,0.12)",
          }}
        >
          <span style={{ color: "var(--accent-green)" }}>{icon}</span>
        </div>
      )}

      <div className="space-y-1.5 max-w-[260px]">
        <p
          className="text-[17px] font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {heading}
        </p>
        {body && (
          <p className="text-[14px] leading-snug" style={{ color: "var(--text-muted)" }}>
            {body}
          </p>
        )}
      </div>

      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
