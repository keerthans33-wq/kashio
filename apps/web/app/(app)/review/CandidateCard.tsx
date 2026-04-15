"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { confirmCandidate, rejectCandidate, resetCandidate, saveEvidence } from "./actions";
import { Button } from "@/components/ui/button";

// ── Types ──────────────────────────────────────────────────────────────────────

type Status     = "NEEDS_REVIEW" | "CONFIRMED" | "REJECTED";
type Confidence = "LOW" | "MEDIUM" | "HIGH";

export type CandidateCardProps = {
  id:                string;
  status:            Status;
  confidence:        Confidence;
  category:          string;
  reason:            string;
  confidenceReason?: string;
  mixedUse?:         boolean;
  hasEvidence:       boolean;
  evidenceNote:      string | null;
  transaction:       { normalizedMerchant: string; amount: number; date: string; description: string };
  userType?:         string | null;
};

// ── Visual constants ───────────────────────────────────────────────────────────

const ACCENT_BY_CONFIDENCE: Record<Confidence, string> = {
  HIGH:   "#22C55E",
  MEDIUM: "#14B8A6",
  LOW:    "rgba(255,255,255,0.08)",
};

const CARD_BG: Record<Status, string> = {
  CONFIRMED:    "rgba(17, 33, 24, 0.78)",
  REJECTED:     "rgba(17, 24, 39, 0.38)",
  NEEDS_REVIEW: "rgba(17, 24, 39, 0.72)",
};

const CARD_BORDER: Record<Status, string> = {
  CONFIRMED:    "rgba(34, 197, 94, 0.18)",
  REJECTED:     "rgba(255, 255, 255, 0.03)",
  NEEDS_REVIEW: "rgba(255, 255, 255, 0.06)",
};

/** Short single-word labels — fast to scan */
const CONFIDENCE_LABEL: Record<Confidence, string> = {
  HIGH:   "Likely",
  MEDIUM: "Possible",
  LOW:    "Uncertain",
};

const CONFIDENCE_COLOR: Record<Confidence, string> = {
  HIGH:   "#22C55E",
  MEDIUM: "#14B8A6",
  LOW:    "#6B7280",
};

// ── Component ──────────────────────────────────────────────────────────────────

export function CandidateCard({
  id, status: initialStatus, confidence, category, reason, confidenceReason,
  mixedUse, hasEvidence, evidenceNote, transaction,
}: CandidateCardProps) {
  const [status, setStatus]                 = useState<Status>(initialStatus);
  const [expanded, setExpanded]             = useState(false);
  const [isSaving, setIsSaving]             = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [evidence, setEvidence]             = useState(hasEvidence);
  const [note, setNote]                     = useState(evidenceNote ?? "");
  const [evidenceSaving, setEvidenceSaving] = useState(false);
  const [evidenceSaved, setEvidenceSaved]   = useState<string | null>(null);

  function flashSaved(msg: string) {
    setEvidenceSaved(msg);
    setTimeout(() => setEvidenceSaved(null), 2500);
  }

  const settled = status !== "NEEDS_REVIEW";

  async function save(action: () => Promise<void>, next: Status) {
    const prev = status;
    setStatus(next);
    setIsSaving(true);
    setError(null);
    try {
      await action();
    } catch {
      setStatus(prev);
      setError("Could not save. Try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const handleConfirm = () => save(() => confirmCandidate(id), "CONFIRMED");
  const handleReject  = () => save(() => rejectCandidate(id),  "REJECTED");
  const handleReset   = () => save(() => resetCandidate(id),   "NEEDS_REVIEW");

  const accentColor = settled
    ? (status === "CONFIRMED" ? "#22C55E" : "transparent")
    : ACCENT_BY_CONFIDENCE[confidence];

  return (
    <motion.div
      className="relative rounded-2xl overflow-hidden"
      style={{
        backgroundColor: CARD_BG[status],
        border:          `1px solid ${CARD_BORDER[status]}`,
        boxShadow:       "0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.2)",
      }}
      whileHover={!settled ? { y: -1, boxShadow: "0 4px 20px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.5)" } : {}}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      {/* Left accent bar */}
      <div
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ backgroundColor: accentColor }}
      />

      {/* Main content */}
      <div
        className="px-5 py-4"
        style={{ opacity: status === "REJECTED" ? 0.5 : 1 }}
      >

        {/* Row 1: merchant + amount */}
        <div className="flex items-center justify-between gap-3">
          <p
            className="truncate text-[14px] font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            {transaction.normalizedMerchant}
          </p>
          <p
            className="shrink-0 text-[24px] font-bold tabular-nums tracking-tight leading-none"
            style={{ color: status === "CONFIRMED" ? "#22C55E" : "var(--text-primary)" }}
          >
            ${Math.abs(transaction.amount).toFixed(2)}
          </p>
        </div>

        {/* Row 2: date · confidence */}
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            {transaction.date}
          </span>
          {!settled && (
            <>
              <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.12)" }}>·</span>
              <span
                className="flex items-center gap-1 text-[12px] font-medium"
                style={{ color: CONFIDENCE_COLOR[confidence] }}
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: CONFIDENCE_COLOR[confidence] }}
                />
                {CONFIDENCE_LABEL[confidence]}
              </span>
            </>
          )}
        </div>

        {/* Row 3: short reason — single line */}
        {!settled && (
          <p
            className="mt-2 text-[12px] leading-snug line-clamp-1"
            style={{ color: "var(--text-muted)" }}
          >
            {reason}
          </p>
        )}

        {/* Actions */}
        <div className="mt-3.5">
          {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

          {settled ? (
            <div className="flex items-center justify-between gap-2">
              <span
                className="text-[12px] font-medium"
                style={{ color: status === "CONFIRMED" ? "#22C55E" : "var(--text-muted)" }}
              >
                {status === "CONFIRMED" ? "✓ Confirmed" : "Skipped"}
              </span>
              <div className="flex items-center gap-3 shrink-0">
                <Button variant="ghost" size="xs" onClick={() => setExpanded((v) => !v)}>
                  {expanded ? "Less" : "Details"}
                </Button>
                <Button variant="ghost" size="xs" onClick={handleReset} disabled={isSaving}>
                  {isSaving ? "…" : "Undo"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button size="sm" className="flex-1" onClick={handleConfirm} disabled={isSaving}>
                {isSaving ? "Saving…" : "Confirm"}
              </Button>
              <Button variant="secondary" size="sm" className="flex-1" onClick={handleReject} disabled={isSaving}>
                Skip
              </Button>
              <button
                className="shrink-0 text-[12px] transition-colors duration-150 px-1"
                style={{ color: "var(--text-muted)" }}
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? "Less" : "More"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expandable details */}
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
              className="px-5 py-4 space-y-4"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >

              {/* Category */}
              <div className="flex items-center gap-2">
                <span
                  className="text-[11px] font-semibold uppercase tracking-widest"
                  style={{ color: "var(--text-muted)" }}
                >
                  Category
                </span>
                <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                  {category}
                </span>
              </div>

              {/* Full reason */}
              <div>
                <p
                  className="text-[11px] font-semibold uppercase tracking-widest mb-1.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  Why this was flagged
                </p>
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {reason}
                </p>
                {mixedUse && (
                  <p className="mt-1.5 text-[12px]" style={{ color: "#F59E0B" }}>
                    May include personal use — review before claiming.
                  </p>
                )}
              </div>

              {/* Confidence reasoning */}
              {confidenceReason && (
                <div>
                  <p
                    className="text-[11px] font-semibold uppercase tracking-widest mb-1.5"
                    style={{ color: CONFIDENCE_COLOR[confidence] }}
                  >
                    {CONFIDENCE_LABEL[confidence]}
                  </p>
                  <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {confidenceReason}
                  </p>
                </div>
              )}

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

              {/* Evidence — only when confirmed */}
              {status === "CONFIRMED" && (
                <div>
                  <p
                    className="text-[11px] font-semibold uppercase tracking-widest mb-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Receipt / invoice
                  </p>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={evidence}
                      disabled={evidenceSaving}
                      onChange={async (e) => {
                        const next = e.target.checked;
                        setEvidence(next);
                        setEvidenceSaving(true);
                        try {
                          await saveEvidence(id, next, note);
                          flashSaved(next ? "Saved" : "Removed");
                        } finally {
                          setEvidenceSaving(false);
                        }
                      }}
                      className="h-4 w-4 rounded"
                      style={{ accentColor: "#22C55E" }}
                    />
                    <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                      I have a receipt or invoice
                    </span>
                  </label>

                  {evidence && (
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      onBlur={async () => {
                        setEvidenceSaving(true);
                        try {
                          await saveEvidence(id, evidence, note);
                          flashSaved("Note saved");
                        } finally {
                          setEvidenceSaving(false);
                        }
                      }}
                      placeholder="e.g. Bunnings receipt Feb 2025"
                      className="mt-2.5 w-full rounded-xl px-4 py-2.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-[#22C55E]"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.05)",
                        border:          "1px solid rgba(255,255,255,0.08)",
                        color:           "var(--text-primary)",
                      }}
                    />
                  )}

                  {evidenceSaving && (
                    <p className="mt-1.5 text-[12px]" style={{ color: "var(--text-muted)" }}>Saving…</p>
                  )}
                  {evidenceSaved && !evidenceSaving && (
                    <p className="mt-1.5 text-[12px]" style={{ color: "#22C55E" }}>{evidenceSaved}</p>
                  )}
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
