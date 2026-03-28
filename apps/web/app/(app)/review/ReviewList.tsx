"use client";

import { useState } from "react";
import { CandidateCard, type CandidateCardProps } from "./CandidateCard";
import { bulkConfirmCandidates, bulkRejectCandidates, bulkResetCandidates } from "./actions";

type Tab = "needs_review" | "needs_evidence" | "evidence_ready" | "rejected";

type Props = {
  needsReview: CandidateCardProps[];
  confirmed:   CandidateCardProps[];
  rejected:    CandidateCardProps[];
};

export function ReviewList({ needsReview, confirmed, rejected }: Props) {
  const needsEvidence = confirmed.filter((c) => !c.hasEvidence);
  const evidenceReady = confirmed.filter((c) =>  c.hasEvidence);

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "needs_review",   label: "Needs Review",   count: needsReview.length },
    { id: "needs_evidence", label: "Needs Evidence", count: needsEvidence.length },
    { id: "evidence_ready", label: "Evidence Ready", count: evidenceReady.length },
    { id: "rejected",       label: "Rejected",       count: rejected.length },
  ];

  const [activeTab, setActiveTab] = useState<Tab>("needs_review");
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving]   = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [lastIds, setLastIds]     = useState<string[]>([]);

  const activeCandidates: CandidateCardProps[] = {
    needs_review:   needsReview,
    needs_evidence: needsEvidence,
    evidence_ready: evidenceReady,
    rejected:       rejected,
  }[activeTab];

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
      setError("Could not save bulk changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleBulkUndo() {
    setIsSaving(true);
    setError(null);
    try {
      await bulkResetCandidates(lastIds);
      setSuccessMsg(`${lastIds.length} item${lastIds.length !== 1 ? "s" : ""} moved back to Needs Review.`);
      setLastIds([]);
    } catch {
      setError("Could not undo bulk changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      {/* ── Tab bar ───────────────────────────────────────────────────────── */}
      <div className="sticky top-14 z-40 -mx-4 sm:-mx-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="mx-4 sm:mx-6 flex items-center justify-between gap-2">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSelected(new Set()); }}
                className={`flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-violet-500 text-violet-600 dark:text-violet-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {tab.label}
                <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                  activeTab === tab.id
                    ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                    : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Tab-level action */}
          {activeTab === "evidence_ready" && evidenceReady.length > 0 && (
            <a
              href="/export"
              className="shrink-0 rounded-md bg-violet-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
            >
              Go to Export →
            </a>
          )}
          {activeTab === "needs_evidence" && needsEvidence.length > 0 && (
            <span className="shrink-0 text-xs text-amber-600 dark:text-amber-400">
              {needsEvidence.length} item{needsEvidence.length !== 1 ? "s" : ""} need evidence
            </span>
          )}
        </div>
      </div>

      <div className="mt-4">
        {/* Success message */}
        {successMsg && !isSaving && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-900/20">
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
                className="text-xs text-green-500 hover:text-green-700 dark:text-green-500"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Bulk action bar — Needs Review tab only */}
        {activeTab === "needs_review" && selected.size > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <span className="text-sm text-gray-600 dark:text-gray-400">{selected.size} selected</span>
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
              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:text-gray:400"
            >
              {isSaving ? "Saving…" : "Reject all"}
            </button>
            <button
              onClick={() => setSelected(new Set())}
              disabled={isSaving}
              className="text-xs text-gray-400 underline hover:text-gray-600 disabled:opacity-40"
            >
              Clear selection
            </button>
            {error && <span className="text-xs text-red-500">{error}</span>}
          </div>
        )}

        {/* Select all — Needs Review tab only */}
        {activeTab === "needs_review" && needsReviewIds.length > 0 && (
          <div className="mb-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={selected.size === needsReviewIds.length}
              onChange={toggleAll}
              className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-green-600 dark:border-gray-600"
            />
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {selected.size === needsReviewIds.length ? "Deselect all" : "Select all"}
            </span>
          </div>
        )}

        {/* Card list */}
        {activeCandidates.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">
            Nothing here yet.
          </p>
        ) : (
          <div className="space-y-2">
            {activeCandidates.map((c) => (
              <div key={c.id} className="flex items-start gap-3">
                {activeTab === "needs_review" ? (
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggle(c.id)}
                    className="mt-4 h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 accent-green-600 dark:border-gray-600"
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
        )}
      </div>
    </div>
  );
}
