"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  confirmWithDetails, rejectCandidate, resetCandidate,
  saveEvidence, saveWorkPercent, confirmSimilarByMerchant,
} from "./actions";
import { Button } from "@/components/ui/button";

// ── Types ──────────────────────────────────────────────────────────────────────

type Status     = "NEEDS_REVIEW" | "CONFIRMED" | "REJECTED";
type Confidence = "LOW" | "MEDIUM" | "HIGH";

export type CandidateCardProps = {
  id:                     string;
  status:                 Status;
  confidence:             Confidence;
  category:               string;
  reason:                 string;
  confidenceReason?:      string;
  mixedUse?:              boolean;
  hasEvidence:            boolean;
  evidenceNote:           string | null;
  workPercent?:           number | null;
  score:                  number;
  reviewRequired:         boolean;
  excludeFromEstimate:    boolean;
  similarCount?:          number;
  transaction:            { normalizedMerchant: string; amount: number; date: string; description: string };
  userType?:              string | null;
  onStatusChange?:        (id: string, next: Status) => void;
};

// ── Unsafe merchants — never offer "apply to similar" ─────────────────────────
// These merchants are high-risk for bulk-confirming because the same merchant
// can represent very different personal/work transactions.
const UNSAFE_APPLY_MERCHANTS = new Set([
  "Wise", "Western Union", "MoneyGram", "Remitly",
  "Afterpay", "Zip", "ZipPay", "Laybuy", "Humm", "OpenPay", "Latitude",
  "Coles", "Woolworths", "ALDI", "IGA", "Harris Farm",
  "Netflix", "Disney+", "Spotify", "Stan", "Paramount+",
  "TAB", "Sportsbet", "Bet365", "Ladbrokes", "Neds",
  "ATM",
]);

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

type ConfirmStep = "idle" | "choosing" | "partial";

// ── Component ──────────────────────────────────────────────────────────────────

export function CandidateCard({
  id, status: initialStatus, confidence, category, reason, confidenceReason,
  mixedUse, hasEvidence, evidenceNote, workPercent: initialWorkPercent,
  transaction, reviewRequired, excludeFromEstimate, similarCount,
  onStatusChange,
}: CandidateCardProps) {
  const [status, setStatus]                 = useState<Status>(initialStatus);
  const [expanded, setExpanded]             = useState(false);
  const [isSaving, setIsSaving]             = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [evidence, setEvidence]             = useState(hasEvidence);
  const [note, setNote]                     = useState(evidenceNote ?? "");
  const [evidenceSaving, setEvidenceSaving] = useState(false);
  const [evidenceSaved, setEvidenceSaved]   = useState<string | null>(null);
  const [workPct, setWorkPct]               = useState<string>(initialWorkPercent != null ? String(initialWorkPercent) : "");
  const [pctSaving, setPctSaving]           = useState(false);
  const [pctSaved, setPctSaved]             = useState(false);

  // ── Classification step state ──────────────────────────────────────────────
  const [confirmStep, setConfirmStep]   = useState<ConfirmStep>("idle");
  const [pendingPct, setPendingPct]     = useState<string>("50");
  const [showSimilar, setShowSimilar]   = useState(false);
  const [similarSaving, setSimilarSaving] = useState(false);
  const [appliedCount, setAppliedCount] = useState<number | null>(null);

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

  async function handleConfirmWithPct(pct: number | null) {
    setConfirmStep("idle");
    if (pct !== null) setWorkPct(String(pct));
    await save(() => confirmWithDetails(id, pct), "CONFIRMED");
    // Offer to apply to similar if appropriate
    const isSafe = !UNSAFE_APPLY_MERCHANTS.has(transaction.normalizedMerchant);
    if (isSafe && similarCount && similarCount > 0 && confidence !== "LOW") {
      setShowSimilar(true);
    }
  }

  async function handleConfirmPartial() {
    const parsed = parseInt(pendingPct, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 100) return;
    await handleConfirmWithPct(parsed);
  }

  async function handleConfirmSimilar() {
    const pct = workPct !== "" ? Number(workPct) : null;
    setSimilarSaving(true);
    try {
      const count = await confirmSimilarByMerchant(transaction.normalizedMerchant, pct);
      setAppliedCount(count);
      setShowSimilar(false);
    } catch {
      setError("Could not apply to similar. Try again.");
    } finally {
      setSimilarSaving(false);
    }
  }

  const handleReject  = () => { setConfirmStep("idle"); save(() => rejectCandidate(id),  "REJECTED"); };
  const handleReset   = () => save(() => resetCandidate(id),   "NEEDS_REVIEW");

  const accentColor = settled
    ? (status === "CONFIRMED" ? "#22C55E" : "transparent")
    : ACCENT_BY_CONFIDENCE[confidence];

  // Preset % buttons for the partial step
  const presets = [25, 50, 75];
  const pendingPctNum = parseInt(pendingPct, 10);
  const isPreset = presets.includes(pendingPctNum);

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

        {/* Row 2: date · confidence · badges */}
        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
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
              {reviewRequired && (
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#F59E0B" }}
                >
                  Needs review
                </span>
              )}
              {excludeFromEstimate && (
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}
                >
                  Not in estimate
                </span>
              )}
            </>
          )}
        </div>

        {/* Row 3: short reason — single line */}
        {!settled && confirmStep === "idle" && (
          <p
            className="mt-2 text-[12px] leading-snug line-clamp-1"
            style={{ color: "var(--text-muted)" }}
          >
            {reason}
          </p>
        )}

        {/* Actions */}
        <div className="mt-3">
          {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

          {settled ? (
            // ── Settled state ──────────────────────────────────────────────────
            <>
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-[12px] font-medium"
                  style={{ color: status === "CONFIRMED" ? "#22C55E" : "var(--text-muted)" }}
                >
                  {status === "CONFIRMED"
                    ? workPct !== "" ? `✓ Confirmed · ${workPct}% work` : "✓ Confirmed"
                    : "Skipped"}
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

              {/* Apply-to-similar offer */}
              {status === "CONFIRMED" && showSimilar && (
                <div
                  className="mt-3 rounded-xl px-3.5 py-3"
                  style={{ backgroundColor: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.12)" }}
                >
                  <p className="text-[12px] font-medium" style={{ color: "var(--text-secondary)" }}>
                    Apply to {similarCount} other {transaction.normalizedMerchant} transaction{similarCount !== 1 ? "s" : ""}?
                  </p>
                  <div className="flex gap-2 mt-2.5">
                    <Button size="xs" disabled={similarSaving} onClick={handleConfirmSimilar}>
                      {similarSaving ? "Saving…" : "Yes, confirm all"}
                    </Button>
                    <Button variant="ghost" size="xs" onClick={() => setShowSimilar(false)}>
                      No thanks
                    </Button>
                  </div>
                </div>
              )}

              {/* Applied confirmation */}
              {status === "CONFIRMED" && appliedCount !== null && appliedCount > 0 && (
                <p className="mt-2 text-[12px]" style={{ color: "#22C55E" }}>
                  ✓ Applied to {appliedCount} more transaction{appliedCount !== 1 ? "s" : ""}
                </p>
              )}
            </>

          ) : confirmStep === "choosing" ? (
            // ── Classification choice ─────────────────────────────────────────
            <div>
              <p className="mb-2.5 text-[12px] font-medium" style={{ color: "var(--text-muted)" }}>
                How work-related is this?
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  className="rounded-xl py-2.5 text-[13px] font-medium transition-all duration-150 hover:opacity-90"
                  style={{ backgroundColor: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.22)", color: "#22C55E" }}
                  onClick={() => handleConfirmWithPct(null)}
                  disabled={isSaving}
                >
                  Work-related
                </button>
                <button
                  className="rounded-xl py-2.5 text-[13px] font-medium transition-all duration-150 hover:opacity-90"
                  style={{ backgroundColor: "rgba(20,184,166,0.10)", border: "1px solid rgba(20,184,166,0.22)", color: "#14B8A6" }}
                  onClick={() => setConfirmStep("partial")}
                  disabled={isSaving}
                >
                  Partially
                </button>
                <button
                  className="rounded-xl py-2.5 text-[13px] font-medium transition-all duration-150 hover:opacity-90"
                  style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-secondary)" }}
                  onClick={handleReject}
                  disabled={isSaving}
                >
                  Personal
                </button>
                <button
                  className="rounded-xl py-2.5 text-[13px] font-medium transition-all duration-150 hover:opacity-90"
                  style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-secondary)" }}
                  onClick={() => handleConfirmWithPct(null)}
                  disabled={isSaving}
                >
                  Unsure
                </button>
              </div>
              <button
                className="mt-2.5 text-[12px] transition-colors duration-150"
                style={{ color: "var(--text-muted)" }}
                onClick={() => setConfirmStep("idle")}
              >
                ← Back
              </button>
            </div>

          ) : confirmStep === "partial" ? (
            // ── Partial % picker ──────────────────────────────────────────────
            <div>
              <p className="mb-2.5 text-[12px] font-medium" style={{ color: "var(--text-muted)" }}>
                What % is work-related?
              </p>
              <div className="flex gap-1.5 mb-3">
                {presets.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPendingPct(String(p))}
                    className="flex-1 rounded-xl py-2 text-[13px] font-medium transition-all duration-150"
                    style={{
                      backgroundColor: pendingPctNum === p ? "rgba(20,184,166,0.15)" : "rgba(255,255,255,0.05)",
                      border:          `1px solid ${pendingPctNum === p ? "rgba(20,184,166,0.35)" : "rgba(255,255,255,0.08)"}`,
                      color:           pendingPctNum === p ? "#14B8A6" : "var(--text-secondary)",
                    }}
                  >
                    {p}%
                  </button>
                ))}
                <div className="relative flex-1">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={isPreset ? "" : pendingPct}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || (Number(v) >= 1 && Number(v) <= 100)) setPendingPct(v || "0");
                    }}
                    placeholder="Other"
                    className="w-full rounded-xl py-2 px-3 text-[13px] text-center focus:outline-none focus:ring-1 focus:ring-[#14B8A6] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.05)",
                      border:          `1px solid ${!isPreset && pendingPct !== "0" ? "rgba(20,184,166,0.35)" : "rgba(255,255,255,0.08)"}`,
                      color:           "var(--text-primary)",
                    }}
                  />
                </div>
              </div>

              {pendingPctNum > 0 && pendingPctNum <= 100 && (
                <p className="mb-3 text-[12px]" style={{ color: "var(--text-muted)" }}>
                  <span style={{ color: "#14B8A6", fontWeight: 600 }}>
                    ${(Math.abs(transaction.amount) * pendingPctNum / 100).toFixed(2)}
                  </span>{" "}
                  claimable
                </p>
              )}

              <div className="flex items-center gap-2">
                <button
                  className="shrink-0 text-[12px] px-1 transition-colors duration-150"
                  style={{ color: "var(--text-muted)" }}
                  onClick={() => setConfirmStep("choosing")}
                >
                  ← Back
                </button>
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={isSaving || pendingPctNum < 1 || pendingPctNum > 100}
                  onClick={handleConfirmPartial}
                >
                  {isSaving ? "Saving…" : `Confirm ${pendingPct}%`}
                </Button>
              </div>
            </div>

          ) : (
            // ── Idle state — Confirm / Skip ───────────────────────────────────
            <div className="flex items-center gap-2">
              <Button size="sm" className="flex-1" onClick={() => setConfirmStep("choosing")} disabled={isSaving}>
                Confirm
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

              {/* Work-use split */}
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
                          const parsed = workPct === "" ? null : Math.min(100, Math.max(0, Number(workPct)));
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
                        <span style={{ color: "var(--text-muted)" }}>
                          Leave blank for full amount
                        </span>
                      )}
                    </div>
                  </div>
                  {pctSaving && <p className="mt-1.5 text-[12px]" style={{ color: "var(--text-muted)" }}>Saving…</p>}
                  {pctSaved && !pctSaving && <p className="mt-1.5 text-[12px]" style={{ color: "#22C55E" }}>Saved</p>}
                </div>
              )}

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
