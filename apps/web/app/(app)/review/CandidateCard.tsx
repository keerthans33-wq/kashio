"use client";

import { useState } from "react";
import { confirmCandidate, rejectCandidate, resetCandidate, saveEvidence } from "./actions";

type Status     = "NEEDS_REVIEW" | "CONFIRMED" | "REJECTED";
type Confidence = "LOW" | "MEDIUM" | "HIGH";

export type CandidateCardProps = {
  id:           string;
  status:       Status;
  confidence:   Confidence;
  category:     string;
  reason:       string;
  hasEvidence:  boolean;
  evidenceNote: string | null;
  transaction:  { normalizedMerchant: string; amount: number; date: string; description: string };
};

const CONFIDENCE_BADGE: Record<Confidence, string> = {
  HIGH:   "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  MEDIUM: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  LOW:    "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
};

const STATUS_BORDER: Record<Status, string> = {
  NEEDS_REVIEW: "border-gray-200 dark:border-gray-700",
  CONFIRMED:    "border-green-400 dark:border-green-700",
  REJECTED:     "border-red-300 dark:border-red-700",
};

const STATUS_BG: Record<Status, string> = {
  NEEDS_REVIEW: "bg-white dark:bg-gray-800",
  CONFIRMED:    "bg-green-50 dark:bg-green-900/10",
  REJECTED:     "bg-red-50 dark:bg-red-900/10",
};

export function CandidateCard({
  id, status: initialStatus, confidence, category, reason,
  hasEvidence, evidenceNote, transaction,
}: CandidateCardProps) {
  const [status, setStatus]                   = useState<Status>(initialStatus);
  const [expanded, setExpanded]               = useState(false);
  const [isSaving, setIsSaving]               = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [evidence, setEvidence]               = useState(hasEvidence);
  const [note, setNote]                       = useState(evidenceNote ?? "");
  const [evidenceSaving, setEvidenceSaving]   = useState(false);
  const [evidenceSaved, setEvidenceSaved]     = useState<string | null>(null);

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
    <div className={`rounded-lg border transition-colors ${STATUS_BORDER[status]} ${STATUS_BG[status]}`}>

      {/* ── Compact header — always visible ───────────────────────────────── */}
      <div className="px-4 py-3">

        {/* Row 1: merchant + amount */}
        <div className="flex items-baseline justify-between gap-4">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
            {transaction.normalizedMerchant}
          </p>
          <p className={`shrink-0 text-sm font-semibold tabular-nums ${
            amount < 0 ? "text-gray-700 dark:text-gray-300" : "text-green-600 dark:text-green-400"
          }`}>
            {amount < 0 ? "−" : "+"}${Math.abs(amount).toFixed(2)}
          </p>
        </div>

        {/* Row 2: date · category · confidence · status badge */}
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
          <span>{transaction.date}</span>
          <span>·</span>
          <span>{category}</span>
          <span>·</span>
          <span className={`rounded-full px-2 py-0.5 font-medium ${CONFIDENCE_BADGE[confidence]}`}>
            {confidence}
          </span>
          {status === "CONFIRMED" && (
            <>
              <span>·</span>
              <span className="rounded-full px-2 py-0.5 font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                ✓ Confirmed
              </span>
              {evidence ? (
                <span className="rounded-full px-2 py-0.5 font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                  Evidence ready
                </span>
              ) : (
                <span className="rounded-full px-2 py-0.5 font-medium bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                  Needs evidence
                </span>
              )}
            </>
          )}
          {status === "REJECTED" && (
            <>
              <span>·</span>
              <span className="rounded-full px-2 py-0.5 font-medium bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                ✗ Rejected
              </span>
            </>
          )}
        </div>

        {/* Row 3: evidence checkbox — confirmed cards only */}
        {status === "CONFIRMED" && (
          <div className="mt-2 flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={evidence}
                disabled={evidenceSaving}
                onChange={async (e) => {
                  const next = e.target.checked;
                  setEvidence(next);
                  setEvidenceSaving(true);
                  try { await saveEvidence(id, next, note); flashSaved(next ? "Marked as ready for export" : "Removed"); } finally { setEvidenceSaving(false); }
                }}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 dark:border-gray-600 accent-blue-600"
              />
              <span className={`text-xs ${evidence ? "text-gray-600 dark:text-gray-400" : "text-amber-700 dark:text-amber-400"}`}>
                {evidence ? "Receipt / invoice on hand" : "I have a receipt or invoice"}
              </span>
            </label>
            {evidenceSaving
              ? <span className="text-xs text-gray-400 dark:text-gray-500">Saving…</span>
              : evidenceSaved && evidenceSaved !== "Note saved"
              ? <span className="text-xs text-green-600 dark:text-green-400">{evidenceSaved}</span>
              : null
            }
          </div>
        )}

        {/* Row 4: show more toggle + action buttons */}
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-gray-400 hover:text-gray-600 underline dark:text-gray-500 dark:hover:text-gray-300"
          >
            {expanded ? "Show less" : "Show more"}
          </button>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2">
            {settled ? (
              <button
                onClick={handleReset}
                disabled={isSaving}
                className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-white disabled:opacity-40 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                {isSaving ? "Saving…" : "Undo"}
              </button>
            ) : (
              <>
                <button
                  onClick={handleConfirm}
                  disabled={isSaving}
                  className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-40"
                >
                  {isSaving ? "Saving…" : "Confirm"}
                </button>
                <button
                  onClick={handleReject}
                  disabled={isSaving}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  Reject
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Expanded details ──────────────────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-4 dark:border-gray-700">

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Bank description</p>
            <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400 break-words">{transaction.description}</p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Why flagged</p>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{reason}</p>
          </div>

          {/* Evidence note — only shown for confirmed cards that have evidence ticked */}
          {status === "CONFIRMED" && evidence && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Evidence note</p>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onBlur={async () => {
                  setEvidenceSaving(true);
                  try { await saveEvidence(id, evidence, note); flashSaved("Note saved"); } finally { setEvidenceSaving(false); }
                }}
                placeholder="e.g. Bunnings receipt Feb 2025"
                className="mt-1 w-full rounded border border-gray-200 px-3 py-1.5 text-sm text-gray-700 placeholder-gray-300 focus:border-gray-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-600 dark:focus:border-gray-500"
              />
              <div className="h-4 mt-0.5">
                {evidenceSaving
                  ? <span className="text-xs text-gray-400 dark:text-gray-500">Saving…</span>
                  : evidenceSaved === "Note saved"
                  ? <span className="text-xs text-green-600 dark:text-green-400">Note saved</span>
                  : null
                }
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
