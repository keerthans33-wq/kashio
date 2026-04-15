/**
 * SectionHeader
 *
 * Page-level and section-level headings.
 *
 * level:
 *   "page"    — large page title + optional subtitle (30px)
 *   "section" — section divider label (11px caps)
 *   "card"    — card-level title (16px)
 */

import { cn } from "@/lib/utils";

type Level = "page" | "section" | "card";

interface SectionHeaderProps {
  title:     string;
  subtitle?: string;
  level?:    Level;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  level = "page",
  className,
}: SectionHeaderProps) {
  if (level === "section") {
    return (
      <p
        className={cn("text-[11px] font-semibold uppercase tracking-widest", className)}
        style={{ color: "var(--text-muted)" }}
      >
        {title}
      </p>
    );
  }

  if (level === "card") {
    return (
      <div className={className}>
        <p
          className="text-[16px] font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </p>
        {subtitle && (
          <p className="mt-0.5 text-[13px]" style={{ color: "var(--text-muted)" }}>
            {subtitle}
          </p>
        )}
      </div>
    );
  }

  // page
  return (
    <div className={className}>
      <h1
        className="text-[30px] font-bold leading-tight tracking-tight"
        style={{ color: "var(--text-primary)" }}
      >
        {title}
      </h1>
      {subtitle && (
        <p className="mt-2 text-[15px]" style={{ color: "var(--text-muted)" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
