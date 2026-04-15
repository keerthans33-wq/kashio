"use client";

import { useState } from "react";
import { confirmCandidate, rejectCandidate, resetCandidate, saveEvidence } from "./actions";
import { Button } from "@/components/ui/button";

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

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  HIGH:   "Likely deductible",
  MEDIUM: "Possible match",
  LOW:    "Review carefully",
};

const CONFIDENCE_LABEL_LONG: Record<Confidence, string> = {
  HIGH:   "Likely deductible",
  MEDIUM: "Possible match",
  LOW:    "Review carefully — check before claiming",
};

const CONFIDENCE_COLOR: Record<Confidence, string> = {
  HIGH:   "#22C55E",
  MEDIUM: "#F59E0B",
  LOW:    "#6B7280",
};

export function CandidateCard({
  id, status: initialStatus, confidence, category, reason, confidenceReason, mixedUse,
  hasEvidence, evidenceNote, transaction, userType,
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

  const amount  = transaction.amount;
  const settled = status !== "NEEDS_REVIEW";

  async function save(action: () => Promise<void>, next: Status) {
    const prev = status;
    setStatus(next);   // update UI instantly
    setIsSaving(true);
    setError(null);
    try {
      await action();
    } catch {
      setStatus(prev); // revert if server fails
      setError("Could not save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const handleConfirm = () => save(() => confirmCandidate(id), "CONFIRMED");
  const handleReject  = () => save(() => rejectCandidate(id),  "REJECTED");
  const handleReset   = () => save(() => resetCandidate(id),   "NEEDS_REVIEW");

  const borderColor = status === "CONFIRMED" ? "#22C55E33" : "var(--bg-border)";
  const bgColor     = status === "CONFIRMED" ? "rgba(34,197,94,0.06)" : "var(--bg-card)";
  const dimmed      = { opacity: status === "REJECTED" ? 0.5 : 1 };

  return (
    <div
      className="rounded-2xl transition-all duration-200"
      style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, boxShadow: "var(--shadow-card)" }}
    >
      <div className="px-4 py-4">

        {/* Merchant + amount */}
        <div className="flex items-baseline justify-between gap-4">
          <p className="truncate text-[15px] font-semibold" style={{ color: "var(--text-primary)", ...dimmed }}>
            {transaction.normalizedMerchant}
          </p>
          <p className="shrink-0 text-[18px] font-bold tabular-nums" style={{ color: "var(--text-primary)", ...dimmed }}>
            −${Math.abs(amount).toFixed(2)}
          </p>
        </div>

        {/* Date + confidence badge */}
        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {transaction.date}
          </span>
          {!settled && (
            <span
              className="text-xs font-semibold rounded-full px-2 py-0.5"
              style={{
                color: CONFIDENCE_COLOR[confidence],
                backgroundColor: CONFIDENCE_COLOR[confidence] + "1A",
              }}
            >
              {CONFIDENCE_LABEL[confidence]}
            </span>
          )}
        </div>

        {/* Short reason — clamped to 2 lines, only when unreviewed */}
        {!settled && (
          <p
            className="mt-2 text-sm line-clamp-2"
            style={{ color: "var(--text-secondary)" }}
          >
            {reason}
          </p>
        )}

        {/* Actions */}
        <div className="mt-3">
          {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

          {settled ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium" style={{ color: status === "CONFIRMED" ? "#22C55E" : "var(--text-muted)" }}>
                {status === "CONFIRMED" ? "✓ Deductible" : "✗ Not deductible"}
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
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={handleConfirm} disabled={isSaving}>
                {isSaving ? "Saving…" : "Deductible"}
              </Button>
              <Button variant="secondary" size="sm" onClick={handleReject} disabled={isSaving}>
                Not deductible
              </Button>
              <Button variant="ghost" size="xs" className="ml-auto" onClick={() => setExpanded((v) => !v)}>
                {expanded ? "Less" : "Details"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t px-4 py-4 space-y-3" style={{ borderColor: "var(--bg-border)" }}>

          <div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Category</p>
            <p className="mt-0.5 text-sm" style={{ color: "var(--text-secondary)" }}>{category}</p>
          </div>

          <div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Why Kashio flagged this</p>
            <p className="mt-0.5 text-sm" style={{ color: "var(--text-secondary)" }}>{reason}</p>
            {mixedUse && (
              <p className="mt-1 text-xs" style={{ color: "#F59E0B" }}>
                May include personal use. Review before claiming.
              </p>
            )}
          </div>

          {confidenceReason && (
            <div>
              <p className="text-xs font-medium" style={{ color: CONFIDENCE_COLOR[confidence] }}>
                {CONFIDENCE_LABEL_LONG[confidence]}
              </p>
              <p className="mt-0.5 text-sm" style={{ color: "var(--text-secondary)" }}>{confidenceReason}</p>
            </div>
          )}

          <div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Transaction</p>
            <p className="mt-0.5 text-sm break-words" style={{ color: "var(--text-secondary)" }}>{transaction.description}</p>
          </div>

          {status === "CONFIRMED" && (
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={evidence}
                  disabled={evidenceSaving}
                  onChange={async (e) => {
                    const next = e.target.checked;
                    setEvidence(next);
                    setEvidenceSaving(true);
                    try { await saveEvidence(id, next, note); flashSaved(next ? "Saved" : "Removed"); } finally { setEvidenceSaving(false); }
                  }}
                  className="h-4 w-4 rounded accent-violet-600"
                />
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>I have a receipt or invoice</span>
              </label>
              {evidence && (
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onBlur={async () => {
                    setEvidenceSaving(true);
                    try { await saveEvidence(id, evidence, note); flashSaved("Note saved"); } finally { setEvidenceSaving(false); }
                  }}
                  placeholder="e.g. Bunnings receipt Feb 2025"
                  className="mt-2 w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    border: "1px solid var(--bg-border)",
                    color: "var(--text-primary)",
                  }}
                />
              )}
              {evidenceSaving && <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>Saving…</p>}
              {evidenceSaved && !evidenceSaving && <p className="mt-1 text-xs" style={{ color: "#22C55E" }}>{evidenceSaved}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
