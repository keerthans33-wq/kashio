"use client";

import { useState } from "react";
import { CandidateCard, type CandidateCardProps } from "./CandidateCard";
import { bulkConfirmCandidates, bulkRejectCandidates, bulkResetCandidates } from "./actions";
import { Button } from "@/components/ui/button";

type Props = {
  needsReview:     CandidateCardProps[];
  confirmed:       CandidateCardProps[];
  rejected:        CandidateCardProps[];
  missingEvidence: number;
};

export function ReviewList({ needsReview, confirmed, rejected, missingEvidence }: Props) {
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving]     = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [successSub, setSuccessSub] = useState<string | null>(null);
  const [lastIds, setLastIds]       = useState<string[]>([]);
  const [showConfirmed, setShowConfirmed] = useState(missingEvidence > 0);
  const [showRejected, setShowRejected]   = useState(false);

  const needsReviewIds = needsReview.map((c) => c.id);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(selected.size === needsReviewIds.length ? new Set() : new Set(needsReviewIds));
  }

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

  async function bulkAction(
    action: (ids: string[]) => Promise<void>,
    buildMsg: (ids: string[]) => { primary: string; sub?: string },
  ) {
    const ids = [...selected];
    setIsSaving(true); setError(null); setSuccessMsg(null); setSuccessSub(null);
    try {
      await action(ids);
      setSelected(new Set()); setLastIds(ids);
      const { primary, sub } = buildMsg(ids);
      setSuccessMsg(primary);
      setSuccessSub(sub ?? null);
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleBulkUndo() {
    setIsSaving(true); setError(null);
    try {
      await bulkResetCandidates(lastIds);
      setSuccessMsg(null); setSuccessSub(null); setLastIds([]);
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
        <div className="mb-4 flex items-start justify-between gap-3 rounded-xl px-4 py-3" style={{ borderColor: "#22C55E33", backgroundColor: "rgba(34,197,94,0.06)", border: "1px solid #22C55E33" }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: "#22C55E" }}>{successMsg}</p>
            {successSub && <p className="mt-0.5 text-xs" style={{ color: "#22C55E", opacity: 0.7 }}>{successSub}</p>}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {lastIds.length > 0 && (
              <button onClick={handleBulkUndo} className="text-xs font-medium underline" style={{ color: "#22C55E" }}>
                Undo
              </button>
            )}
            <button onClick={() => { setSuccessMsg(null); setSuccessSub(null); setLastIds([]); }} className="text-xs" style={{ color: "var(--text-muted)" }}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-border)", boxShadow: "var(--shadow-card)" }}>
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{selected.size} selected</span>
          <Button
            size="sm"
            onClick={() => bulkAction(bulkConfirmCandidates, (ids) => {
              const total = needsReview
                .filter((c) => ids.includes(c.id))
                .reduce((s, c) => s + Math.abs(c.transaction.amount), 0);
              const count = ids.length;
              return {
                primary: total > 0 ? `${fmt(total)} confirmed deductions` : `${count} item${count !== 1 ? "s" : ""} confirmed`,
                sub: total > 0 ? `${count} item${count !== 1 ? "s" : ""}` : undefined,
              };
            })}
            disabled={isSaving}
          >
            {isSaving ? "Saving…" : "Looks deductible"}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => bulkAction(bulkRejectCandidates, (ids) => ({
              primary: `${ids.length} item${ids.length !== 1 ? "s" : ""} marked not deductible`,
            }))}
            disabled={isSaving}
          >
            {isSaving ? "Saving…" : "Not deductible"}
          </Button>
          <Button variant="ghost" size="xs" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
          {error && <span className="text-xs text-red-400">{error}</span>}
        </div>
      )}

      {/* Needs review */}
      <div id="needs-review" />
      {needsReview.length === 0 ? (
        <p className="py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
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
                className="h-4 w-4 cursor-pointer rounded accent-violet-600"
              />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {selected.size === needsReviewIds.length ? "Deselect all" : "Select all"}
              </span>
            </div>
          )}
          <div className="space-y-3">
            {needsReview.map((c) => (
              <div key={c.id} className="flex items-start gap-3">
                {needsReviewIds.length > 1 ? (
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggle(c.id)}
                    className="mt-4 h-4 w-4 shrink-0 cursor-pointer rounded accent-violet-600"
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

      {/* Confirmed — collapsible */}
      {confirmed.length > 0 && (
        <div id="confirmed" className="mt-8 border-t pt-6" style={{ borderColor: "var(--bg-border)" }}>
          <button
            onClick={() => setShowConfirmed((v) => !v)}
            className="flex items-center gap-2 text-sm transition-colors duration-150"
            style={{ color: "var(--text-muted)" }}
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full text-xs" style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "#22C55E" }}>✓</span>
            {showConfirmed ? "Hide" : "Show"} confirmed ({confirmed.length})
          </button>
          {showConfirmed && (
            <div className="mt-4 space-y-3">
              {confirmed.map((c) => <CandidateCard key={c.id} {...c} />)}
            </div>
          )}
        </div>
      )}

      {/* Rejected — collapsible */}
      {rejected.length > 0 && (
        <div className="mt-4 border-t pt-6" style={{ borderColor: "var(--bg-border)" }}>
          <button
            onClick={() => setShowRejected((v) => !v)}
            className="flex items-center gap-2 text-sm transition-colors duration-150"
            style={{ color: "var(--text-muted)" }}
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full text-xs" style={{ backgroundColor: "var(--bg-border)", color: "var(--text-muted)" }}>✗</span>
            {showRejected ? "Hide" : "Show"} not deductible ({rejected.length})
          </button>
          {showRejected && (
            <div className="mt-4 space-y-3">
              {rejected.map((c) => <CandidateCard key={c.id} {...c} />)}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
