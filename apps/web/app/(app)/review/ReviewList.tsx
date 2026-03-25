"use client";

import { useState } from "react";
import { CandidateCard, type CandidateCardProps } from "./CandidateCard";
import { bulkConfirmCandidates, bulkRejectCandidates, bulkResetCandidates } from "./actions";

type Props = {
  needsReview: CandidateCardProps[];
  confirmed:   CandidateCardProps[];
  rejected:    CandidateCardProps[];
};

function Section({
  title,
  candidates,
  selectable,
  selected,
  onToggle,
}: {
  title:      string;
  candidates: CandidateCardProps[];
  selectable: boolean;
  selected:   Set<string>;
  onToggle:   (id: string) => void;
}) {
  if (candidates.length === 0) return null;
  return (
    <div>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">
        {title} ({candidates.length})
      </h2>
      <div className="space-y-3">
        {candidates.map((c) => (
          <div key={c.id} className="flex items-start gap-3">
            {selectable ? (
              <input
                type="checkbox"
                checked={selected.has(c.id)}
                onChange={() => onToggle(c.id)}
                className="mt-6 h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 accent-green-600"
              />
            ) : (
              // Spacer keeps card alignment consistent across sections
              <div className="mt-6 h-4 w-4 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <CandidateCard {...c} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReviewList({ needsReview, confirmed, rejected }: Props) {
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving]     = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [lastIds, setLastIds]       = useState<string[]>([]);

  // Bulk actions only apply to NEEDS_REVIEW — confirmed and rejected cards
  // are intentionally excluded to keep the workflow conceptually clean.
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
      selected.size === needsReviewIds.length
        ? new Set()
        : new Set(needsReviewIds),
    );
  }

  async function bulkAction(action: (ids: string[]) => Promise<void>, label: string) {
    const ids   = [...selected];
    const count = ids.length;
    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await action(ids);
      setSelected(new Set());
      setLastIds(ids);
      setSuccessMsg(`${count} candidate${count !== 1 ? "s" : ""} ${label}.`);
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleBulkUndo() {
    const ids   = lastIds;
    const count = ids.length;
    setIsSaving(true);
    setError(null);
    try {
      await bulkResetCandidates(ids);
      setLastIds([]);
      setSuccessMsg(`${count} candidate${count !== 1 ? "s" : ""} moved back to needs review.`);
    } catch {
      setError("Could not undo. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      {/* Success message */}
      {successMsg && !isSaving && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm text-green-700">{successMsg}</p>
          <div className="flex items-center gap-3">
            {lastIds.length > 0 && (
              <button
                onClick={handleBulkUndo}
                className="text-xs font-medium text-green-700 underline hover:text-green-900"
              >
                Undo
              </button>
            )}
            <button onClick={() => { setSuccessMsg(null); setLastIds([]); }} className="text-xs text-green-500 hover:text-green-700">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Bulk action bar — only visible when needs-review candidates are selected */}
      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <span className="text-sm text-gray-600">{selected.size} selected</span>
          <button
            onClick={() => bulkAction(bulkConfirmCandidates, "confirmed")}
            disabled={isSaving}
            className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-40"
          >
            {isSaving ? "Saving…" : "Confirm all"}
          </button>
          <button
            onClick={() => bulkAction(bulkRejectCandidates, "rejected")}
            disabled={isSaving}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            {isSaving ? "Saving…" : "Reject all"}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            disabled={isSaving}
            className="text-xs text-gray-400 hover:text-gray-600 underline disabled:opacity-40"
          >
            Clear
          </button>
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
      )}

      {/* Select all — scoped to needs-review only */}
      {needsReviewIds.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <input
            type="checkbox"
            checked={needsReviewIds.length > 0 && selected.size === needsReviewIds.length}
            onChange={toggleAll}
            className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-green-600"
          />
          <span className="text-xs text-gray-400">
            {selected.size === needsReviewIds.length ? "Deselect all" : "Select all pending"}
          </span>
        </div>
      )}

      <div className="space-y-8">
        <Section title="Needs Review" candidates={needsReview} selectable={true}  selected={selected} onToggle={toggle} />
        <Section title="Confirmed"    candidates={confirmed}   selectable={false} selected={selected} onToggle={toggle} />
        <Section title="Rejected"     candidates={rejected}    selectable={false} selected={selected} onToggle={toggle} />
      </div>
    </div>
  );
}
