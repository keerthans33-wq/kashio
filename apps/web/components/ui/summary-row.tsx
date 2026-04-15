/**
 * SummaryRow
 *
 * A single transaction / merchant / line-item row.
 * Used in the export breakdown, review cards, and anywhere
 * a label+date+amount pattern appears.
 */

import { cn } from "@/lib/utils";

interface SummaryRowProps {
  label:       string;
  sub?:        string;
  amount:      string;
  amountColor?: string;
  bordered?:   boolean;
  className?:  string;
}

export function SummaryRow({
  label,
  sub,
  amount,
  amountColor,
  bordered = true,
  className,
}: SummaryRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 py-2.5",
        bordered && "border-b",
        className,
      )}
      style={bordered ? { borderColor: "var(--bg-border)" } : undefined}
    >
      <div className="min-w-0">
        <p
          className="truncate text-sm font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          {label}
        </p>
        {sub && (
          <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
            {sub}
          </p>
        )}
      </div>

      <span
        className="shrink-0 text-[14px] font-semibold tabular-nums"
        style={{ color: amountColor ?? "var(--text-primary)" }}
      >
        {amount}
      </span>
    </div>
  );
}
