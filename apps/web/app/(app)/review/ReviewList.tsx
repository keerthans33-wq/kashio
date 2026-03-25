"use client";

import { useState } from "react";
import { CandidateCard, type CandidateCardProps } from "./CandidateCard";
import { bulkConfirmCandidates, bulkRejectCandidates } from "./actions";

type Props = {
  needsReview: CandidateCardProps[];
  confirmed:   CandidateCardProps[];
  rejected:    CandidateCardProps[];
};

function Section({
  title,
  candidates,
  selected,
  onToggle,
}: {
  title:      string;
  candidates: CandidateCardProps[];
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
            <input
              type="checkbox"
              checked={selected.has(c.id)}
              onChange={() => onToggle(c.id)}
              className="mt-6 h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 accent-green-600"
            />
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
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving]   = useState(false);
  const [error, setError]         = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const allIds = [...needsReview, ...confirmed, ...rejected].map((c) => c.id);

  function toggleAll() {
    setSelected(selected.size === allIds.length ? new Set() : new Set(allIds));
  }

  async function bulkAction(action: (ids: string[]) => Promise<void>) {
    setIsSaving(true);
    setError(null);
    try {
      await action([...selected]);
      setSelected(new Set());
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <span className="text-sm text-gray-600">
            {selected.size} selected
          </span>
          <button
            onClick={() => bulkAction(bulkConfirmCandidates)}
            disabled={isSaving}
            className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-40"
          >
            Confirm all
          </button>
          <button
            onClick={() => bulkAction(bulkRejectCandidates)}
            disabled={isSaving}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            Reject all
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

      {/* Select all toggle */}
      <div className="mb-4 flex items-center gap-2">
        <input
          type="checkbox"
          checked={allIds.length > 0 && selected.size === allIds.length}
          onChange={toggleAll}
          className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-green-600"
        />
        <span className="text-xs text-gray-400">
          {selected.size === allIds.length && allIds.length > 0 ? "Deselect all" : "Select all"}
        </span>
      </div>

      <div className="space-y-8">
        <Section title="Needs Review" candidates={needsReview} selected={selected} onToggle={toggle} />
        <Section title="Confirmed"    candidates={confirmed}   selected={selected} onToggle={toggle} />
        <Section title="Rejected"     candidates={rejected}    selected={selected} onToggle={toggle} />
      </div>
    </div>
  );
}
