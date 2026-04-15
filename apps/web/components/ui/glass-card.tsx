/**
 * GlassCard
 *
 * Dark tinted glass surface. Semi-transparent background lets the aurora
 * glow through. Use `blur` for stronger glass effect on elevated surfaces.
 *
 * variants:
 *   "default"  — standard card surface
 *   "elevated" — slightly lighter tint for modals/popovers
 *   "ghost"    — barely-there surface, useful for subtle grouping
 */

import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type Variant = "default" | "elevated" | "ghost";

const BG: Record<Variant, string> = {
  default:  "rgba(17, 24, 39, 0.72)",
  elevated: "rgba(31, 41, 55, 0.82)",
  ghost:    "rgba(255, 255, 255, 0.03)",
};

const BORDER: Record<Variant, string> = {
  default:  "rgba(255, 255, 255, 0.06)",
  elevated: "rgba(255, 255, 255, 0.09)",
  ghost:    "rgba(255, 255, 255, 0.04)",
};

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  blur?:    boolean;
  glow?:    "green" | "teal" | "none";
  noPad?:   boolean;
}

export function GlassCard({
  variant = "default",
  blur    = false,
  glow    = "none",
  noPad   = false,
  className,
  style,
  children,
  ...props
}: GlassCardProps) {
  const glowShadow =
    glow === "green" ? ", 0 0 32px rgba(34,197,94,0.10)"
  : glow === "teal"  ? ", 0 0 32px rgba(20,184,166,0.10)"
  : "";

  return (
    <div
      className={cn("rounded-2xl", !noPad && "px-5 py-5", className)}
      style={{
        backgroundColor: BG[variant],
        border:          `1px solid ${BORDER[variant]}`,
        boxShadow:       `0 1px 3px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.25)${glowShadow}`,
        backdropFilter:  blur ? "blur(12px)" : undefined,
        WebkitBackdropFilter: blur ? "blur(12px)" : undefined,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
