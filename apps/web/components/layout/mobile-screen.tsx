/**
 * MobileScreen
 *
 * Centred, max-width constrained container that enforces the mobile-first
 * layout language. Wraps page <main> content — sits above the aurora layer
 * (z-10) so content is always readable.
 *
 * maxWidth:
 *   "sm"   — 430px  (single-column content, forms, detail screens)
 *   "md"   — 560px  (slightly wider for import / WFH log)
 *   "lg"   — 768px  (review list — needs more horizontal breathing room)
 */

import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type MaxWidth = "sm" | "md" | "lg";

const MAX: Record<MaxWidth, string> = {
  sm: "max-w-[430px]",
  md: "max-w-[560px]",
  lg: "max-w-3xl",
};

interface MobileScreenProps extends HTMLAttributes<HTMLElement> {
  as?:       "main" | "div" | "section";
  maxWidth?: MaxWidth;
  padX?:     boolean;
  padY?:     boolean;
}

export function MobileScreen({
  as:      Tag    = "main",
  maxWidth        = "sm",
  padX            = true,
  padY            = true,
  className,
  children,
  ...props
}: MobileScreenProps) {
  return (
    <Tag
      className={cn(
        "relative z-10 mx-auto w-full",
        MAX[maxWidth],
        padX && "px-5",
        padY && "py-10 sm:py-14",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
