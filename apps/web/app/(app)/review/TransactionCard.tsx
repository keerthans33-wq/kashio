"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { confirmWithDetails, rejectCandidate, resetCandidate } from "./actions";
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
  category, reason,
  transaction, onStatusChange,
}: TransactionCardProps) {
  const [status, setStatus]     = useState<Status>(initialStatus);
  const [expanded, setExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const settled = status !== "NEEDS_REVIEW";

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

        {/* Row 2: category · date */}
        <div className="mt-1 flex items-center gap-2">
          <span className="truncate text-[12px]" style={{ color: "var(--text-muted)" }}>
            {category}
          </span>
          <span className="shrink-0 text-[12px]" style={{ color: "rgba(255,255,255,0.12)" }}>·</span>
          <span className="shrink-0 text-[12px]" style={{ color: "var(--text-muted)" }}>
            {fmtDate(transaction.date)}
          </span>
        </div>

        {/* Row 3: actions */}
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

        {/* Row 4: why suggested toggle */}
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

      {/* ── Expandable section ──────────────────────────────────────────────── */}
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

              {/* Why suggested */}
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

              {/* Bank description */}
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
