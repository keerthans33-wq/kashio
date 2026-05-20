"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { confirmWithDetails, rejectCandidate, resetCandidate, saveCategory } from "./actions";
import { Button } from "@/components/ui/button";

// ── Types ──────────────────────────────────────────────────────────────────────

type Status          = "NEEDS_REVIEW" | "CONFIRMED" | "REJECTED" | "MAYBE";
type Confidence      = "LOW" | "MEDIUM" | "HIGH";
type SuggestionLevel = "LIKELY_WORK_RELATED" | "POSSIBLE_WORK_RELATED" | "PROBABLY_PERSONAL";

export type TransactionCardProps = {
  id:              string;
  status:          Status;
  suggestionLevel: SuggestionLevel;
  confidence:      Confidence;
  category:        string;
  reason:          string;
  confidenceReason?: string;
  mixedUse?:       boolean;
  hasEvidence:     boolean;
  evidenceNote:    string | null;
  workPercent:     number | null;
  score:           number;
  transaction: {
    normalizedMerchant: string;
    amount:             number;
    date:               string;
    description:        string;
  };
  onStatusChange?: (id: string, next: Status) => void;
};

// ── Category options ───────────────────────────────────────────────────────────

const REVIEW_CATEGORIES = [
  { label: "Work Tools",       value: "Equipment",                  color: "#60A5FA" },
  { label: "Home Office",      value: "Office Supplies",            color: "#4ADE80" },
  { label: "Travel",           value: "Work Travel",                color: "#F59E0B" },
  { label: "Education",        value: "Professional Development",   color: "#FBBF24" },
  { label: "Phone & Internet", value: "Phone & Internet",           color: "#06B6D4" },
  { label: "Other Claims",     value: "Software & Subscriptions",   color: "#A78BFA" },
] as const;

// Map any canonical category string to one of the 6 display options.
// Anything not explicitly listed falls through to "Other Claims".
const CANONICAL_TO_DISPLAY: Record<string, typeof REVIEW_CATEGORIES[number]> = {
  "Equipment":                    REVIEW_CATEGORIES[0],
  "Office Supplies":              REVIEW_CATEGORIES[1],
  "Work Travel":                  REVIEW_CATEGORIES[2],
  "Professional Development":     REVIEW_CATEGORIES[3],
  "Phone & Internet":             REVIEW_CATEGORIES[4],
  "Software & Subscriptions":     REVIEW_CATEGORIES[5],
  // Less-common categories fold into "Other Claims"
  "Meals":                        REVIEW_CATEGORIES[5],
  "Work Clothing":                REVIEW_CATEGORIES[5],
  "Marketing & Advertising":      REVIEW_CATEGORIES[5],
  "Accounting & Business":        REVIEW_CATEGORIES[5],
  "Website & Domains":            REVIEW_CATEGORIES[5],
  "Payment Processing":           REVIEW_CATEGORIES[5],
  "Uncategorised Possible Deduction": REVIEW_CATEGORIES[5],
};

function catInfo(canonical: string) {
  return CANONICAL_TO_DISPLAY[canonical] ?? REVIEW_CATEGORIES[5];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

// ── Visual constants ───────────────────────────────────────────────────────────

const CARD_BG: Record<Status, string> = {
  CONFIRMED:    "rgba(17, 33, 24, 0.78)",
  REJECTED:     "rgba(17, 24, 39, 0.30)",
  MAYBE:        "rgba(30, 25, 15, 0.72)",
  NEEDS_REVIEW: "rgba(17, 24, 39, 0.72)",
};

const CARD_BORDER: Record<Status, string> = {
  CONFIRMED:    "rgba(34, 197, 94, 0.18)",
  REJECTED:     "rgba(255, 255, 255, 0.03)",
  MAYBE:        "rgba(245, 158, 11, 0.18)",
  NEEDS_REVIEW: "rgba(255, 255, 255, 0.06)",
};

const ACCENT_BAR: Record<SuggestionLevel, string> = {
  LIKELY_WORK_RELATED:   "#22C55E",
  POSSIBLE_WORK_RELATED: "#14B8A6",
  PROBABLY_PERSONAL:     "transparent",
};

// ── Component ──────────────────────────────────────────────────────────────────

export function TransactionCard({
  id, status: initialStatus, suggestionLevel,
  category: initialCategory, reason,
  transaction, onStatusChange,
}: TransactionCardProps) {
  const [status, setStatus]             = useState<Status>(initialStatus);
  const [category, setCategory]         = useState(initialCategory);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categorySaving, setCategorySaving] = useState(false);
  const [expanded, setExpanded]         = useState(false);
  const [isSaving, setIsSaving]         = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const settled = status !== "NEEDS_REVIEW";
  const info    = catInfo(category);

  async function handleCategoryChange(canonical: string) {
    if (canonical === category) { setCategoryOpen(false); return; }
    const prev = category;
    setCategory(canonical);
    setCategoryOpen(false);
    setCategorySaving(true);
    try {
      await saveCategory(id, canonical);
    } catch {
      setCategory(prev);
      setError("Could not save category. Try again.");
    } finally {
      setCategorySaving(false);
    }
  }

  async function save(action: () => Promise<void>, next: Status) {
    const prev = status;
    setStatus(next);
    onStatusChange?.(id, next);
    setIsSaving(true);
    setError(null);
    try {
      await action();
    } catch {
      setStatus(prev);
      onStatusChange?.(id, prev);
      setError("Could not save. Try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const handleClaim  = () => save(() => confirmWithDetails(id, null), "CONFIRMED");
  const handleIgnore = () => save(() => rejectCandidate(id),          "REJECTED");
  const handleReset  = () => save(() => resetCandidate(id),           "NEEDS_REVIEW");

  const accentBar = settled
    ? (status === "CONFIRMED" ? "#22C55E" : "transparent")
    : ACCENT_BAR[suggestionLevel];

  return (
    <motion.div
      className="relative rounded-2xl overflow-hidden"
      style={{
        backgroundColor: CARD_BG[status],
        border:          `1px solid ${CARD_BORDER[status]}`,
        boxShadow:       "0 1px 3px rgba(0,0,0,0.4), 0 2px 12px rgba(0,0,0,0.2)",
      }}
      whileHover={!settled ? { y: -1, boxShadow: "0 4px 20px rgba(0,0,0,0.4)" } : {}}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      {/* Left accent bar */}
      <div className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: accentBar }} />

      {/* Main content */}
      <div className="px-4 pt-3.5 pb-3" style={{ opacity: status === "REJECTED" ? 0.55 : 1 }}>

        {/* Row 1: merchant + amount */}
        <div className="flex items-start justify-between gap-3">
          <p
            className="truncate text-[15px] font-semibold leading-snug"
            style={{ color: "var(--text-primary)" }}
          >
            {transaction.normalizedMerchant}
          </p>
          <p
            className="shrink-0 text-[18px] font-bold tabular-nums tracking-tight leading-snug"
            style={{ color: status === "CONFIRMED" ? "#22C55E" : "var(--text-primary)" }}
          >
            ${Math.abs(transaction.amount).toFixed(2)}
          </p>
        </div>

        {/* Row 2: category pill + date */}
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {/* Category pill — tappable when NEEDS_REVIEW */}
          {!settled ? (
            <button
              onClick={() => setCategoryOpen((v) => !v)}
              disabled={categorySaving}
              className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-opacity disabled:opacity-50"
              style={{
                backgroundColor: `${info.color}18`,
                border:          `1px solid ${info.color}40`,
                color:           info.color,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: info.color }}
              />
              {info.label}
              <span style={{ opacity: 0.6, fontSize: 9 }}>▾</span>
            </button>
          ) : (
            <span
              className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              style={{
                backgroundColor: `${info.color}12`,
                border:          `1px solid ${info.color}28`,
                color:           info.color,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: info.color }}
              />
              {info.label}
            </span>
          )}
          <span className="shrink-0 text-[12px]" style={{ color: "rgba(255,255,255,0.12)" }}>·</span>
          <span className="shrink-0 text-[12px]" style={{ color: "var(--text-muted)" }}>
            {fmtDate(transaction.date)}
          </span>
          {categorySaving && (
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>saving…</span>
          )}
        </div>

        {/* Category picker (inline, animated) */}
        <AnimatePresence>
          {categoryOpen && !settled && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              style={{ overflow: "hidden" }}
            >
              <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                {REVIEW_CATEGORIES.map((opt) => {
                  const isSelected = catInfo(category).value === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleCategoryChange(opt.value)}
                      className="rounded-xl px-2 py-2 text-[11px] font-medium text-center transition-all duration-100"
                      style={{
                        backgroundColor: isSelected ? `${opt.color}22` : "rgba(255,255,255,0.04)",
                        border:          `1px solid ${isSelected ? `${opt.color}50` : "rgba(255,255,255,0.07)"}`,
                        color:           isSelected ? opt.color : "var(--text-muted)",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="mt-3">
          {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

          {settled ? (
            <div className="flex items-center justify-between gap-2">
              <span
                className="text-[13px] font-medium"
                style={{ color: status === "CONFIRMED" ? "#22C55E" : "var(--text-muted)" }}
              >
                {status === "CONFIRMED" ? "✓ Claimed" : "Hidden"}
              </span>
              <Button variant="ghost" size="xs" onClick={handleReset} disabled={isSaving}>
                {isSaving ? "…" : "Undo"}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button size="sm" className="flex-1" onClick={handleClaim} disabled={isSaving}>
                {isSaving ? "Saving…" : "Claim"}
              </Button>
              <Button variant="secondary" size="sm" className="flex-1" onClick={handleIgnore} disabled={isSaving}>
                Ignore
              </Button>
            </div>
          )}
        </div>

        {/* Why suggested toggle */}
        <div className="mt-2.5">
          <button
            className="text-[12px] transition-colors duration-150"
            style={{ color: "var(--text-muted)" }}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Close ↑" : settled ? "Details" : "Why suggested?"}
          </button>
        </div>

      </div>

      {/* ── Expandable: reason + bank description ───────────────────────────── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div
              className="px-4 py-4 space-y-4"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div>
                <p
                  className="text-[11px] font-semibold uppercase tracking-widest mb-1.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  Why suggested?
                </p>
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {reason}
                </p>
              </div>
              <div>
                <p
                  className="text-[11px] font-semibold uppercase tracking-widest mb-1.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  Bank description
                </p>
                <p
                  className="text-[12px] leading-relaxed break-words font-mono"
                  style={{ color: "var(--text-muted)" }}
                >
                  {transaction.description}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
