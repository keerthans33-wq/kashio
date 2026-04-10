"use client";

import { useState } from "react";
import { confirmCandidate, rejectCandidate, resetCandidate, saveEvidence } from "./actions";

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
  HIGH:   "Strong match",
  MEDIUM: "Possible match",
  LOW:    "Weak match. Check before claiming.",
};

const CONFIDENCE_STYLE: Record<Confidence, string> = {
  HIGH:   "text-green-600 dark:text-green-400",
  MEDIUM: "text-amber-500 dark:text-amber-400",
  LOW:    "text-gray-400 dark:text-gray-500",
};


const STATUS_BORDER: Record<Status, string> = {
  NEEDS_REVIEW: "border-gray-200 dark:border-gray-700",
  CONFIRMED:    "border-green-400 dark:border-green-700",
  REJECTED:     "border-gray-200 dark:border-gray-700 opacity-60",
};

const STATUS_BG: Record<Status, string> = {
  NEEDS_REVIEW: "bg-white dark:bg-gray-800",
  CONFIRMED:    "bg-green-50 dark:bg-green-900/10",
  REJECTED:     "bg-white dark:bg-gray-800",
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
    setIsSaving(true);
    setError(null);
    try {
      await action();
      setStatus(next);
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const handleConfirm = () => save(() => confirmCandidate(id), "CONFIRMED");
  const handleReject  = () => save(() => rejectCandidate(id),  "REJECTED");
  const handleReset   = () => save(() => resetCandidate(id),   "NEEDS_REVIEW");

  return (
    <div className={`rounded-lg border transition-all ${STATUS_BORDER[status]} ${STATUS_BG[status]}`}>
      <div className="px-4 py-4">

        {/* Merchant + amount */}
        <div className="flex items-baseline justify-between gap-4">
          <p className="truncate font-semibold text-gray-900 dark:text-gray-100">
            {transaction.normalizedMerchant}
          </p>
          <p className="shrink-0 text-sm font-semibold tabular-nums text-gray-700 dark:text-gray-300">
            −${Math.abs(amount).toFixed(2)}
          </p>
        </div>

        {/* Date */}
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{transaction.date}</p>

        {/* Confidence label */}
        {!settled && (
          <p className={`mt-2 text-xs font-medium ${CONFIDENCE_STYLE[confidence]}`}>
            {CONFIDENCE_LABEL[confidence]}
          </p>
        )}

        {/* Reason — key context before the decision */}
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{reason}</p>

        {/* Actions */}
        <div className="mt-3">
          {error && <p className="mb-2 text-xs text-red-500">{error}</p>}

          {settled ? (
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${
                status === "CONFIRMED" ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-500"
              }`}>
                {status === "CONFIRMED" ? "✓ Marked deductible" : "✗ Marked not deductible"}
              </span>
              <button
                onClick={handleReset}
                disabled={isSaving}
                className="text-xs text-gray-400 hover:underline disabled:opacity-40 dark:text-gray-500"
              >
                {isSaving ? "Saving…" : "Undo"}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                disabled={isSaving}
                className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-40"
              >
                {isSaving ? "Saving…" : "Looks deductible"}
              </button>
              <button
                onClick={handleReject}
                disabled={isSaving}
                className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                Not deductible
              </button>
            </div>
          )}
        </div>

        {/* Details toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        >
          {expanded ? "Hide details" : "More details"}
        </button>
      </div>

      {/* ── Expanded details ─────────────────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-3 dark:border-gray-700">

          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500">Transaction</p>
            <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400 break-words">{transaction.description}</p>
          </div>

          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500">Why Kashio flagged this</p>
            <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{reason}</p>
            {mixedUse && (
              <p className="mt-1 text-xs text-amber-500 dark:text-amber-400">
                May include personal use. Review before claiming.
              </p>
            )}
          </div>

          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500">Category</p>
            <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{category}</p>
          </div>

          {confidenceReason && (
            <div>
              <p className={`text-xs font-medium ${CONFIDENCE_STYLE[confidence]}`}>
                {CONFIDENCE_LABEL[confidence]}
              </p>
              <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{confidenceReason}</p>
            </div>
          )}

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
                  className="h-4 w-4 rounded border-gray-300 accent-violet-600 dark:border-gray-600"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">I have a receipt or invoice</span>
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
                  className="mt-2 w-full rounded border border-gray-200 px-3 py-1.5 text-sm text-gray-700 placeholder-gray-300 focus:border-gray-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-600 dark:focus:border-gray-500"
                />
              )}
              {evidenceSaving && <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Saving…</p>}
              {evidenceSaved && !evidenceSaving && <p className="mt-1 text-xs text-green-600 dark:text-green-400">{evidenceSaved}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
