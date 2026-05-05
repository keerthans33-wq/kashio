import Link from "next/link";
import { ArrowRight, Receipt, Clock } from "lucide-react";
import { CATEGORIES } from "@/lib/rules/categories";

// ── Types ──────────────────────────────────────────────────────────────────────

export type FeedItem = {
  id:          string;
  merchant:    string;
  amount:      number;
  date:        string;
  category:    string;
  confidence:  "HIGH" | "MEDIUM" | "LOW";
  status:      "NEEDS_REVIEW" | "CONFIRMED" | "REJECTED";
  hasEvidence: boolean;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const FEED_LIMIT = 10;

function insightText(category: string, merchant: string): string {
  const m = merchant;
  switch (category) {
    case CATEGORIES.SOFTWARE:
      return `${m} may be a claimable software or subscription expense.`;
    case CATEGORIES.EQUIPMENT:
      return `${m} could be a deductible work equipment purchase.`;
    case CATEGORIES.OFFICE_SUPPLIES:
      return `${m} may be a claimable home office or stationery expense.`;
    case CATEGORIES.PHONE_INTERNET:
      return `${m} may be partially claimable as a phone or internet expense.`;
    case CATEGORIES.WORK_TRAVEL:
      return `${m} looks like a work travel expense — review to confirm.`;
    case CATEGORIES.PROFESSIONAL_DEVELOPMENT:
      return `${m} could be a deductible professional development expense.`;
    case CATEGORIES.MEALS:
      return `${m} may be a claimable work-related meal — review to confirm.`;
    case CATEGORIES.WORK_CLOTHING:
      return `${m} may be a claimable work clothing or uniform expense.`;
    default:
      return `${m} may be a potential tax deduction — review to confirm.`;
  }
}

function confidenceConfig(confidence: "HIGH" | "MEDIUM" | "LOW") {
  switch (confidence) {
    case "HIGH":
      return { label: "High match",   color: "#22C55E", border: "rgba(34,197,94,0.5)",  bg: "rgba(34,197,94,0.08)"  };
    case "MEDIUM":
      return { label: "Possible",     color: "#F59E0B", border: "rgba(245,158,11,0.5)", bg: "rgba(245,158,11,0.08)" };
    case "LOW":
      return { label: "Low match",    color: "#94A3B8", border: "rgba(148,163,184,0.4)", bg: "rgba(148,163,184,0.06)" };
  }
}

function formatDate(yyyyMmDd: string): string {
  const [year, month, day] = yyyyMmDd.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-AU", {
    day:   "numeric",
    month: "short",
  });
}

function fmtAUD(n: number) {
  return Math.abs(n).toLocaleString("en-AU", {
    style:                "currency",
    currency:             "AUD",
    maximumFractionDigits: 0,
  });
}

function categoryShortLabel(category: string): string {
  const map: Record<string, string> = {
    [CATEGORIES.SOFTWARE]:               "Software",
    [CATEGORIES.EQUIPMENT]:              "Equipment",
    [CATEGORIES.OFFICE_SUPPLIES]:        "Home Office",
    [CATEGORIES.PHONE_INTERNET]:         "Phone & Internet",
    [CATEGORIES.WORK_TRAVEL]:            "Work Travel",
    [CATEGORIES.PROFESSIONAL_DEVELOPMENT]: "Education",
    [CATEGORIES.MEALS]:                  "Meals",
    [CATEGORIES.WORK_CLOTHING]:          "Work Clothing",
  };
  return map[category] ?? category;
}

// ── Feed item ──────────────────────────────────────────────────────────────────

function FeedRow({ item }: { item: FeedItem }) {
  const conf    = confidenceConfig(item.confidence);
  const pending = item.status === "NEEDS_REVIEW";

  return (
    <li
      className="relative rounded-xl px-4 py-3.5"
      style={{
        backgroundColor: "rgba(13,20,33,0.88)",
        border:          "1px solid rgba(255,255,255,0.06)",
        borderLeft:      `3px solid ${conf.border}`,
      }}
    >
      {/* Top row: merchant + amount */}
      <div className="flex items-start justify-between gap-3 mb-1">
        <p
          className="text-[13px] font-semibold leading-tight truncate"
          style={{ color: "var(--text-primary)" }}
        >
          {item.merchant}
        </p>
        <p
          className="shrink-0 text-[13px] font-bold tabular-nums"
          style={{ color: "var(--text-primary)" }}
        >
          {fmtAUD(item.amount)}
        </p>
      </div>

      {/* Insight text */}
      <p className="text-[12px] leading-relaxed mb-2.5" style={{ color: "var(--text-muted)" }}>
        {insightText(item.category, item.merchant)}
      </p>

      {/* Bottom row: badges + action */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Date */}
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          {formatDate(item.date)}
        </span>

        <span className="text-[10px] opacity-30" style={{ color: "var(--text-muted)" }}>·</span>

        {/* Category badge */}
        <span
          className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
          style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "var(--text-secondary)" }}
        >
          {categoryShortLabel(item.category)}
        </span>

        {/* Confidence badge */}
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
          style={{ backgroundColor: conf.bg, color: conf.color }}
        >
          {conf.label}
        </span>

        {/* Receipt status */}
        {item.hasEvidence ? (
          <span
            className="flex items-center gap-0.5 text-[10px] font-medium"
            style={{ color: "#22C55E" }}
          >
            <Receipt size={10} strokeWidth={2} />
            Receipt
          </span>
        ) : null}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Review / Confirmed */}
        {pending ? (
          <Link
            href="/review"
            className="flex items-center gap-1 text-[11px] font-semibold transition-opacity hover:opacity-70"
            style={{ color: "#22C55E" }}
          >
            Review
            <ArrowRight size={11} strokeWidth={2.5} />
          </Link>
        ) : (
          <span
            className="flex items-center gap-1 text-[11px] font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            <Clock size={10} strokeWidth={2} />
            Confirmed
          </span>
        )}
      </div>
    </li>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function TaxFeed({ items }: { items: FeedItem[] }) {
  if (items.length === 0) return null;

  const sorted = [...items].sort((a, b) => {
    if (a.status === "NEEDS_REVIEW" && b.status !== "NEEDS_REVIEW") return -1;
    if (b.status === "NEEDS_REVIEW" && a.status !== "NEEDS_REVIEW") return 1;
    return 0;
  });

  const visible  = sorted.slice(0, FEED_LIMIT);
  const hasMore  = sorted.length > FEED_LIMIT;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <p
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-muted)" }}
        >
          Tax feed
        </p>
        {hasMore && (
          <Link
            href="/review"
            className="text-[11px] font-medium transition-opacity hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
          >
            View all {sorted.length}
          </Link>
        )}
      </div>

      <ul className="space-y-2">
        {visible.map((item) => (
          <FeedRow key={item.id} item={item} />
        ))}
      </ul>

      {hasMore && (
        <Link
          href="/review"
          className="mt-3 flex items-center justify-center gap-1.5 rounded-xl py-3 text-[12px] font-medium transition-opacity hover:opacity-70"
          style={{
            backgroundColor: "rgba(13,20,33,0.60)",
            border:          "1px solid rgba(255,255,255,0.06)",
            color:           "var(--text-muted)",
          }}
        >
          View {sorted.length - FEED_LIMIT} more
          <ArrowRight size={12} strokeWidth={2} />
        </Link>
      )}
    </section>
  );
}
