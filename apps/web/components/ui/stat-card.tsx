/**
 * StatCard
 *
 * Displays a single metric: label → large value → optional sub-label.
 * Used on Export and Review summary surfaces.
 *
 * accentColor: "green" | "teal" | "none"  — tints the value and optional glow
 */

import { cn } from "@/lib/utils";
import { GlassCard } from "./glass-card";

const ACCENT_COLOR = {
  green: "#22C55E",
  teal:  "#14B8A6",
  none:  "var(--text-primary)",
};

interface StatCardProps {
  label:       string;
  value:       string;
  sub?:        string;
  accent?:     keyof typeof ACCENT_COLOR;
  glow?:       boolean;
  className?:  string;
}

export function StatCard({
  label,
  value,
  sub,
  accent = "none",
  glow   = false,
  className,
}: StatCardProps) {
  const color = ACCENT_COLOR[accent];

  return (
    <GlassCard
      glow={glow ? (accent === "teal" ? "teal" : "green") : "none"}
      className={cn("flex flex-col gap-3 min-h-[140px]", className)}
    >
      <p
        className="text-[11px] font-semibold uppercase tracking-widest"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </p>

      <div className="flex-1 flex flex-col justify-end gap-1">
        <p
          className="text-[36px] font-bold tabular-nums leading-none tracking-tight"
          style={{ color }}
        >
          {value}
        </p>
        {sub && (
          <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
            {sub}
          </p>
        )}
      </div>
    </GlassCard>
  );
}
