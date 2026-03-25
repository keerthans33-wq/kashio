"use client";

import { useState } from "react";
import { confirmCandidate, rejectCandidate, resetCandidate } from "./actions";

type Status     = "NEEDS_REVIEW" | "CONFIRMED" | "REJECTED";
type Confidence = "LOW" | "MEDIUM" | "HIGH";

export type CandidateCardProps = {
  id:         string;
  status:     Status;
  confidence: Confidence;
  category:   string;
  reason:     string;
  transaction: { normalizedMerchant: string; amount: number; date: string; description: string };
};

const CONFIDENCE_BADGE: Record<Confidence, string> = {
  HIGH:   "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  LOW:    "bg-gray-100 text-gray-500",
};

const CONFIDENCE_HINT: Record<Confidence, string> = {
  HIGH:   "Strong signal",
  MEDIUM: "Reasonable match — worth confirming",
  LOW:    "Weak signal — could easily be personal",
};

const STATUS_BORDER: Record<Status, string> = {
  NEEDS_REVIEW: "border-gray-200",
  CONFIRMED:    "border-green-400",
  REJECTED:     "border-red-300",
};

const STATUS_BG: Record<Status, string> = {
  NEEDS_REVIEW: "bg-white",
  CONFIRMED:    "bg-green-50",
  REJECTED:     "bg-red-50",
};

const STATUS_BADGE: Record<Status, { label: string; className: string } | null> = {
  NEEDS_REVIEW: null,
  CONFIRMED:    { label: "✓ Confirmed", className: "bg-green-100 text-green-700" },
  REJECTED:     { label: "✗ Rejected",  className: "bg-red-100 text-red-600" },
};

const STATUS_FOOTER: Record<Status, string> = {
  NEEDS_REVIEW: "text-gray-400",
  CONFIRMED:    "text-green-600 font-medium",
  REJECTED:     "text-red-500 font-medium",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

export function CandidateCard({
  id, status: initialStatus, confidence, category, reason, transaction,
}: CandidateCardProps) {
  const [status, setStatus] = useState<Status>(initialStatus);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

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
        <div className="mb-3">
          <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
            {badge.label}
          </span>
        </div>
      )}

      {/* Row 1: merchant + amount */}
      <div className="flex items-start justify-between gap-6">
        <Field label="Merchant">
          <p className="text-base font-semibold text-gray-900">{transaction.normalizedMerchant}</p>
        </Field>
        <Field label="Amount">
          <p className={`text-base font-semibold tabular-nums ${amount < 0 ? "text-red-600" : "text-green-600"}`}>
            {amount < 0 ? "-" : "+"}${Math.abs(amount).toFixed(2)}
          </p>
        </Field>
      </div>

      {/* Row 2: date + category + confidence */}
      <div className="mt-4 flex flex-wrap gap-6">
        <Field label="Date">
          <p className="text-sm text-gray-700">{transaction.date}</p>
        </Field>
        <Field label="Category">
          <p className="text-sm text-gray-700">{category}</p>
        </Field>
        <Field label="Confidence">
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CONFIDENCE_BADGE[confidence]}`}>
            {confidence}
          </span>
          <p className="mt-1 text-xs text-gray-400">{CONFIDENCE_HINT[confidence]}</p>
        </Field>
      </div>

      {/* Row 3: raw description */}
      <div className="mt-4">
        <Field label="Bank description">
          <p className="text-sm text-gray-600 break-words">{transaction.description}</p>
        </Field>
      </div>

      {/* Row 4: reason */}
      <div className="mt-4">
        <Field label="Why flagged">
          <p className="text-sm text-gray-500">{reason}</p>
        </Field>
      </div>

      {/* Footer: status + actions */}
      <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
        <p className={`text-xs ${STATUS_FOOTER[status]}`}>
          {error        ? <span className="text-red-500 font-medium">{error}</span>
            : isSaving  ? "Saving…"
            : status === "CONFIRMED" ? "✓ Confirmed"
            : status === "REJECTED"  ? "✗ Rejected"
            : "Awaiting review"}
        </p>
        <div className="flex gap-2">
          {settled ? (
            <button
              onClick={handleReset}
              disabled={isSaving}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 transition-opacity hover:bg-white disabled:opacity-40"
            >
              {isSaving ? "Saving…" : "Undo"}
            </button>
          ) : (
            <>
              <button
                onClick={handleConfirm}
                disabled={isSaving}
                className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:bg-green-700 disabled:opacity-40"
              >
                {isSaving ? "Saving…" : "Confirm"}
              </button>
              <button
                onClick={handleReject}
                disabled={isSaving}
                className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-opacity hover:bg-gray-50 disabled:opacity-40"
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
