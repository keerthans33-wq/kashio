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

const CONFIDENCE_HINT: Record<Confidence, string> = {
  HIGH:   "Strong signal",
  MEDIUM: "Reasonable match — worth confirming",
  LOW:    "Weak signal — could easily be personal",
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

const STATUS_BADGE: Record<Status, { label: string; className: string } | null> = {
  NEEDS_REVIEW: null,
  CONFIRMED:    { label: "✓ Confirmed", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  REJECTED:     { label: "✗ Rejected",  className: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" },
};

const STATUS_FOOTER: Record<Status, string> = {
  NEEDS_REVIEW: "text-gray-400 dark:text-gray-500",
  CONFIRMED:    "text-green-600 font-medium dark:text-green-400",
  REJECTED:     "text-red-500 font-medium dark:text-red-400",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

export function CandidateCard({
  id, status: initialStatus, confidence, category, reason, hasEvidence, evidenceNote, transaction,
}: CandidateCardProps) {
  const [status, setStatus]           = useState<Status>(initialStatus);
  const [isSaving, setIsSaving]       = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [evidence, setEvidence]       = useState(hasEvidence);
  const [note, setNote]               = useState(evidenceNote ?? "");
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
      setError("Could not save this review decision. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const handleConfirm = () => save(() => confirmCandidate(id), "CONFIRMED");
  const handleReject  = () => save(() => rejectCandidate(id),  "REJECTED");
  const handleReset   = () => save(() => resetCandidate(id),   "NEEDS_REVIEW");

  const badge = STATUS_BADGE[status];

  return (
    <div className={`rounded-lg border p-5 transition-colors ${STATUS_BORDER[status]} ${STATUS_BG[status]}`}>

      {/* Status badge — only shown when settled */}
      {badge && (
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
            {badge.label}
          </span>
          {status === "CONFIRMED" && (
            evidence ? (
              <span className="inline-block rounded-full px-3 py-1 text-xs font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                Evidence ready
              </span>
            ) : (
              <span className="inline-block rounded-full px-3 py-1 text-xs font-medium bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                Needs evidence
              </span>
            )
          )}
        </div>
      )}

      {/* Row 1: merchant + amount */}
      <div className="flex items-start justify-between gap-6">
        <Field label="Merchant">
          <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{transaction.normalizedMerchant}</p>
        </Field>
        <Field label="Amount">
          <p className={`text-base font-semibold tabular-nums ${amount < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
            {amount < 0 ? "-" : "+"}${Math.abs(amount).toFixed(2)}
          </p>
        </Field>
      </div>

      {/* Row 2: date + category + confidence */}
      <div className="mt-4 flex flex-wrap gap-6">
        <Field label="Date">
          <p className="text-sm text-gray-700 dark:text-gray-300">{transaction.date}</p>
        </Field>
        <Field label="Category">
          <p className="text-sm text-gray-700 dark:text-gray-300">{category}</p>
        </Field>
        <Field label="Confidence">
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CONFIDENCE_BADGE[confidence]}`}>
            {confidence}
          </span>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{CONFIDENCE_HINT[confidence]}</p>
        </Field>
      </div>

      {/* Row 3: raw description */}
      <div className="mt-4">
        <Field label="Bank description">
          <p className="text-sm text-gray-600 dark:text-gray-400 break-words">{transaction.description}</p>
        </Field>
      </div>

      {/* Row 4: reason */}
      <div className="mt-4">
        <Field label="Why flagged">
          <p className="text-sm text-gray-500 dark:text-gray-400">{reason}</p>
        </Field>
      </div>

      {/* Evidence — only shown for confirmed cards */}
      {status === "CONFIRMED" && (
        <div className={`mt-4 rounded-md border px-4 py-3 space-y-2 transition-colors ${
          evidence
            ? "border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-900"
            : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
        }`}>
          {!evidence && (
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Do you have a receipt or invoice for this item? Tick below to note it.
            </p>
          )}
          <div className="flex items-center justify-between">
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
                className="h-4 w-4 rounded border-gray-300 text-blue-600 dark:border-gray-600"
              />
              <span className={`text-sm ${evidence ? "text-gray-700 dark:text-gray-300" : "text-amber-800 dark:text-amber-300"}`}>
                {evidence ? "Receipt or invoice on hand" : "I have a receipt or invoice"}
              </span>
            </label>
            {evidenceSaving && evidenceSaved == null
              ? <span className="text-xs text-gray-400 dark:text-gray-500">Saving…</span>
              : evidenceSaved && evidenceSaved !== "Note saved"
              ? <span className="text-xs text-green-600 dark:text-green-400">{evidenceSaved}</span>
              : null
            }
          </div>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={async () => {
              setEvidenceSaving(true);
              try { await saveEvidence(id, evidence, note); flashSaved("Note saved"); } finally { setEvidenceSaving(false); }
            }}
            placeholder={evidence ? "Add a note — e.g. Bunnings receipt Feb 2025" : "Tick above first, then add a note"}
            disabled={!evidence}
            className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm text-gray-700 placeholder-gray-300 focus:border-gray-400 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-600 dark:focus:border-gray-500 dark:disabled:bg-gray-700 dark:disabled:text-gray-500"
          />
          <div className="h-4">
            {evidenceSaving && evidence
              ? <span className="text-xs text-gray-400 dark:text-gray-500">Saving…</span>
              : evidenceSaved === "Note saved"
              ? <span className="text-xs text-green-600 dark:text-green-400">Note saved</span>
              : null
            }
          </div>
        </div>
      )}

      {/* Footer: status + actions */}
      <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-700">
        <p className={`text-xs ${STATUS_FOOTER[status]}`}>
          {error        ? <span className="text-red-500 font-medium">{error}</span>
            : isSaving  ? "Saving…"
            : status === "CONFIRMED" ? "✓ Confirmed"
            : status === "REJECTED"  ? "✗ Rejected"
            : "Needs review"}
        </p>
        <div className="flex gap-2">
          {settled ? (
            <>
              {status === "CONFIRMED" && (
                <a
                  href="/export"
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-white dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  Go to Export →
                </a>
              )}
              <button
                onClick={handleReset}
                disabled={isSaving}
                className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 transition-opacity hover:bg-white disabled:opacity-40 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                {isSaving ? "Saving…" : "Undo"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleConfirm}
                disabled={isSaving}
                className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:bg-green-700 disabled:opacity-40"
              >
                {isSaving ? "Saving…" : "Confirm deduction"}
              </button>
              <button
                onClick={handleReject}
                disabled={isSaving}
                className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-opacity hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                Reject
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
