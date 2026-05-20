"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  confirmWithDetails, rejectCandidate, resetCandidate,
  saveEvidence, saveWorkPercent,
} from "./actions";
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
  id, status: initialStatus, suggestionLevel, confidence,
  category, reason, confidenceReason, mixedUse,
  hasEvidence, evidenceNote, workPercent: initialWorkPercent,
  transaction, onStatusChange,
}: TransactionCardProps) {
  const [status, setStatus]           = useState<Status>(initialStatus);
  const [expanded, setExpanded]       = useState(false);
  const [isSaving, setIsSaving]       = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [evidence, setEvidence]       = useState(hasEvidence);
  const [note, setNote]               = useState(evidenceNote ?? "");
  const [evidenceSaving, setEvidenceSaving] = useState(false);
  const [evidenceSaved, setEvidenceSaved]   = useState<string | null>(null);
  const [workPct, setWorkPct]         = useState<string>(
    initialWorkPercent != null ? String(initialWorkPercent) : ""
  );
  const [pctSaving, setPctSaving]     = useState(false);
  const [pctSaved, setPctSaved]       = useState(false);

  function flashSaved(msg: string) {
    setEvidenceSaved(msg);
    setTimeout(() => setEvidenceSaved(null), 2500);
  }

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
            style={{
              color: status === "CONFIRMED"
                ? "#22C55E"
                : "var(--text-primary)",
            }}
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
            // ── Settled state ───────────────────────────────────────────────
            <div className="flex items-center justify-between gap-2">
              <span
                className="text-[13px] font-medium"
                style={{
                  color: status === "CONFIRMED" ? "#22C55E" : "var(--text-muted)",
                }}
              >
                {status === "CONFIRMED"
                  ? workPct !== "" ? `✓ Claimed · ${workPct}% work` : "✓ Claimed"
                  : "Hidden"}
              </span>
              <Button variant="ghost" size="xs" onClick={handleReset} disabled={isSaving}>
                {isSaving ? "…" : "Undo"}
              </Button>
            </div>
          ) : (
            // ── Idle state — Claim / Ignore ─────────────────────────────────
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={handleClaim}
                disabled={isSaving}
              >
                {isSaving ? "Saving…" : "Claim"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={handleIgnore}
                disabled={isSaving}
              >
                Ignore
              </Button>
            </div>
          )}
        </div>

        {/* Row 4: secondary links */}
        <div className="mt-2.5 flex items-center justify-between">
          {!settled ? (
            <button
              className="text-[12px] transition-colors duration-150"
              style={{ color: "var(--text-muted)" }}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? "Close ↑" : "Why suggested?"}
            </button>
          ) : (
            <button
              className="text-[12px] transition-colors duration-150"
              style={{ color: "var(--text-muted)" }}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? "Close ↑" : "Details"}
            </button>
          )}
          <button
            className="text-[12px] transition-colors duration-150"
            style={{ color: "var(--text-muted)" }}
            onClick={() => setExpanded(true)}
          >
            + Receipt
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
                {mixedUse && (
                  <p className="mt-1.5 text-[12px]" style={{ color: "#F59E0B" }}>
                    May include personal use — review before claiming.
                  </p>
                )}
              </div>

              {/* Confidence note */}
              {confidenceReason && (
                <div>
                  <p
                    className="text-[11px] font-semibold uppercase tracking-widest mb-1.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Confidence note
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

              {/* Work-use split — claimed only */}
              {status === "CONFIRMED" && (
                <div>
                  <p
                    className="text-[11px] font-semibold uppercase tracking-widest mb-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Work-use split
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-[140px]">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={workPct}
                        placeholder="100"
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "" || (Number(v) >= 0 && Number(v) <= 100)) setWorkPct(v);
                        }}
                        onBlur={async () => {
                          const parsed =
                            workPct === ""
                              ? null
                              : Math.min(100, Math.max(0, Number(workPct)));
                          setPctSaving(true);
                          setPctSaved(false);
                          try {
                            await saveWorkPercent(id, parsed);
                            setPctSaved(true);
                            setTimeout(() => setPctSaved(false), 2000);
                          } finally {
                            setPctSaving(false);
                          }
                        }}
                        className="w-full rounded-xl px-4 py-2.5 pr-8 text-[13px] focus:outline-none focus:ring-1 focus:ring-[#22C55E] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        style={{
                          backgroundColor: "rgba(255,255,255,0.05)",
                          border:          "1px solid rgba(255,255,255,0.08)",
                          color:           "var(--text-primary)",
                        }}
                      />
                      <span
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px]"
                        style={{ color: "var(--text-muted)" }}
                      >
                        %
                      </span>
                    </div>
                    <div className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                      {workPct !== "" && Number(workPct) > 0 ? (
                        <>
                          <span style={{ color: "#22C55E", fontWeight: 600 }}>
                            ${(Math.abs(transaction.amount) * Number(workPct) / 100).toFixed(2)}
                          </span>
                          <span style={{ color: "var(--text-muted)" }}> claimable</span>
                        </>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>Leave blank for full amount</span>
                      )}
                    </div>
                  </div>
                  {pctSaving && (
                    <p className="mt-1.5 text-[12px]" style={{ color: "var(--text-muted)" }}>Saving…</p>
                  )}
                  {pctSaved && !pctSaving && (
                    <p className="mt-1.5 text-[12px]" style={{ color: "#22C55E" }}>Saved</p>
                  )}
                </div>
              )}

              {/* Receipt / invoice */}
              <div>
                <p
                  className="text-[11px] font-semibold uppercase tracking-widest mb-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  Receipt / invoice
                </p>
                {status !== "CONFIRMED" ? (
                  <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
                    Claim this transaction first to log a receipt.
                  </p>
                ) : (
                  <>
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
                  </>
                )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
