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
  CONFIRMED:    "border-green-300",
  REJECTED:     "border-red-200",
};

export function CandidateCard({ id, status: initialStatus, confidence, category, reason, transaction }: CandidateCardProps) {
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
      try {
        await confirmCandidate(id);
      } catch {
        setStatus(prev);
        setError("Failed to save. Try again.");
      }
    });
  }

  function handleReject() {
    const prev = status;
    setStatus("REJECTED");
    setError(null);
    startTransition(async () => {
      try {
        await rejectCandidate(id);
      } catch {
        setStatus(prev);
        setError("Failed to save. Try again.");
      }
    });
  }

  function handleReset() {
    const prev = status;
    setStatus("NEEDS_REVIEW");
    setError(null);
    startTransition(async () => {
      try {
        await resetCandidate(id);
      } catch {
        setStatus(prev);
        setError("Failed to save. Try again.");
      }
    });
  }

  return (
    <div className={`rounded-lg border bg-white p-4 transition-colors ${STATUS_BORDER[status]}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{transaction.normalizedMerchant}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CONFIDENCE_BADGE[confidence]}`}>
              {confidence}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-gray-500">{category}</p>
          <p className="mt-1 text-sm text-gray-400">{reason}</p>
          {transaction.description !== transaction.normalizedMerchant && (
            <p className="mt-1 truncate text-xs text-gray-300" title={transaction.description}>
              {transaction.description}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-base font-semibold ${amount < 0 ? "text-red-600" : "text-green-600"}`}>
            {amount < 0 ? "-" : "+"}${Math.abs(amount).toFixed(2)}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">{transaction.date}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
        <p className="text-xs text-gray-400">
          {error                                 && <span className="text-red-500">{error}</span>}
          {!error && status === "CONFIRMED"      && "✓ Confirmed"}
          {!error && status === "REJECTED"       && "✗ Rejected"}
          {!error && status === "NEEDS_REVIEW"   && (isPending ? "Saving…" : "Awaiting review")}
        </p>
        <div className="flex gap-2">
          {settled ? (
            <button
              onClick={handleReset}
              disabled={isPending}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 transition-opacity hover:bg-gray-50 disabled:opacity-40"
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
