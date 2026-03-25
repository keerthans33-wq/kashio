"use client";

import { useState, useTransition } from "react";
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
  const [status, setStatus]          = useState<Status>(initialStatus);
  const [error, setError]            = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const amount  = transaction.amount;
  const settled = status !== "NEEDS_REVIEW";

  function handleConfirm() {
    const prev = status;
    setStatus("CONFIRMED");
    setError(null);
    startTransition(async () => {
      try { await confirmCandidate(id); }
      catch { setStatus(prev); setError("Failed to save. Try again."); }
    });
  }

  function handleReject() {
    const prev = status;
    setStatus("REJECTED");
    setError(null);
    startTransition(async () => {
      try { await rejectCandidate(id); }
      catch { setStatus(prev); setError("Failed to save. Try again."); }
    });
  }

  function handleReset() {
    const prev = status;
    setStatus("NEEDS_REVIEW");
    setError(null);
    startTransition(async () => {
      try { await resetCandidate(id); }
      catch { setStatus(prev); setError("Failed to save. Try again."); }
    });
  }

  return (
    <div className={`rounded-lg border p-5 transition-colors ${STATUS_BORDER[status]} ${STATUS_BG[status]}`}>

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
        <p className="text-xs text-gray-400">
          {error                               && <span className="text-red-500">{error}</span>}
          {!error && status === "CONFIRMED"    && "✓ Confirmed"}
          {!error && status === "REJECTED"     && "✗ Rejected"}
          {!error && status === "NEEDS_REVIEW" && (isPending ? "Saving…" : "Awaiting review")}
        </p>
        <div className="flex gap-2">
          {settled ? (
            <button
              onClick={handleReset}
              disabled={isPending}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 transition-opacity hover:bg-white disabled:opacity-40"
            >
              Undo
            </button>
          ) : (
            <>
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:bg-green-700 disabled:opacity-40"
              >
                Confirm
              </button>
              <button
                onClick={handleReject}
                disabled={isPending}
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
