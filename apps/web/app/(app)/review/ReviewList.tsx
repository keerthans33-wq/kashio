"use client";

import { useState } from "react";
import { CandidateCard, type CandidateCardProps } from "./CandidateCard";
import { bulkConfirmCandidates, bulkRejectCandidates, bulkResetCandidates } from "./actions";

type Props = {
  needsReview:     CandidateCardProps[];
  confirmed:       CandidateCardProps[];
  rejected:        CandidateCardProps[];
  missingEvidence: number;
};

export function ReviewList({ needsReview, confirmed, rejected, missingEvidence }: Props) {
  const [selected, setSelected]             = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving]             = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [successMsg, setSuccessMsg]         = useState<string | null>(null);
  const [lastIds, setLastIds]               = useState<string[]>([]);
  // Auto-expand confirmed when there are items missing receipts
  const [showConfirmed, setShowConfirmed]   = useState(missingEvidence > 0);
  const [showRejected, setShowRejected]     = useState(false);

  const needsReviewIds = needsReview.map((c) => c.id);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(
      selected.size === needsReviewIds.length ? new Set() : new Set(needsReviewIds),
    );
  }

  async function bulkAction(action: (ids: string[]) => Promise<void>, label: string) {
    const ids = [...selected];
    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await action(ids);
      setSelected(new Set());
      setLastIds(ids);
      setSuccessMsg(`${ids.length} item${ids.length !== 1 ? "s" : ""} ${label}.`);
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleBulkUndo() {
    setIsSaving(true);
    setError(null);
    try {
      await bulkResetCandidates(lastIds);
      setSuccessMsg(null);
      setLastIds([]);
    } catch {
      setError("Could not undo. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>

      {/* Success banner */}
      {successMsg && !isSaving && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-900/20">
          <p className="text-sm text-green-700 dark:text-green-400">{successMsg}</p>
          <div className="flex items-center gap-3">
            {lastIds.length > 0 && (
              <button
                onClick={handleBulkUndo}
                className="text-xs font-medium text-green-700 underline hover:text-green-900 dark:text-green-400"
              >
                Undo
              </button>
            )}
            <button
              onClick={() => { setSuccessMsg(null); setLastIds([]); }}
              className="text-xs text-green-500 hover:text-green-700"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
          <span className="text-sm text-gray-600 dark:text-gray-400">{selected.size} selected</span>
          <button
            onClick={() => bulkAction(bulkConfirmCandidates, "marked deductible")}
            disabled={isSaving}
            className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-40"
          >
            {isSaving ? "Saving…" : "Looks deductible"}
          </button>
          <button
            onClick={() => bulkAction(bulkRejectCandidates, "marked not deductible")}
            disabled={isSaving}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:text-gray-400"
          >
            {isSaving ? "Saving…" : "Not deductible"}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-gray-400 underline hover:text-gray-600"
          >
            Clear
          </button>
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
      )}

      {/* ── Needs review — primary ─────────────────────────────────────────── */}
      <div id="needs-review" />
      {needsReview.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
          {confirmed.length + rejected.length > 0 ? "All items reviewed." : "Nothing to review yet."}
        </p>
      ) : (
        <>
          {needsReviewIds.length > 1 && (
            <div className="mb-3 flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected.size === needsReviewIds.length}
                onChange={toggleAll}
                className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-violet-600 dark:border-gray-600"
              />
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {selected.size === needsReviewIds.length ? "Deselect all" : "Select all"}
              </span>
            </div>
          )}
          <div className="space-y-2">
            {needsReview.map((c) => (
              <div key={c.id} className="flex items-start gap-3">
                {needsReviewIds.length > 1 ? (
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggle(c.id)}
                    className="mt-4 h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 accent-violet-600 dark:border-gray-600"
                  />
                ) : (
                  <div className="mt-4 h-4 w-4 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <CandidateCard {...c} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Confirmed — secondary, collapsible ────────────────────────────── */}
      {confirmed.length > 0 && (
        <div id="confirmed" className="mt-8 border-t border-gray-100 pt-6 dark:border-gray-800">
          <button
            onClick={() => setShowConfirmed((v) => !v)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-100 text-xs text-green-600 dark:bg-green-900/30 dark:text-green-400">✓</span>
            {showConfirmed ? "Hide" : "Show"} confirmed ({confirmed.length})
          </button>
          {showConfirmed && (
            <div className="mt-4 space-y-2">
              {confirmed.map((c) => <CandidateCard key={c.id} {...c} />)}
            </div>
          )}
        </div>
      )}

      {/* ── Rejected — secondary, collapsible ─────────────────────────────── */}
      {rejected.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-6 dark:border-gray-800">
          <button
            onClick={() => setShowRejected((v) => !v)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">✗</span>
            {showRejected ? "Hide" : "Show"} not deductible ({rejected.length})
          </button>
          {showRejected && (
            <div className="mt-4 space-y-2">
              {rejected.map((c) => <CandidateCard key={c.id} {...c} />)}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
