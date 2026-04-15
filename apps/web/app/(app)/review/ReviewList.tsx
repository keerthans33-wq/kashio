"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
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
        <div className="mb-4 rounded-2xl overflow-hidden" style={{ backgroundColor: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.14)" }}>
          <div className="h-[2px] w-full" style={{ backgroundColor: "rgba(34,197,94,0.35)" }} />
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[16px] font-bold leading-tight" style={{ color: "#22C55E" }}>{successMsg}</p>
              {successSub && <p className="mt-0.5 text-[12px]" style={{ color: "var(--text-muted)" }}>{successSub}</p>}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {lastIds.length > 0 && (
                <button onClick={handleBulkUndo} className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                  Undo
                </button>
              )}
              <button onClick={() => { setSuccessMsg(null); setSuccessSub(null); setLastIds([]); }} className="text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3.5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-border)", boxShadow: "var(--shadow-card)" }}>
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{selected.size} selected</span>
          <Button
            size="sm"
            onClick={() => bulkAction(bulkConfirmCandidates, (ids) => {
              const value = needsReview
                .filter((c) => ids.includes(c.id))
                .reduce((s, c) => s + Math.abs(c.transaction.amount), 0);
              const count = ids.length;
              return {
                primary: value > 0 ? `${fmt(value)} confirmed` : `${count} item${count !== 1 ? "s" : ""} confirmed`,
                sub:     value > 0 ? `${count} item${count !== 1 ? "s" : ""}` : undefined,
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
              primary: `${ids.length} item${ids.length !== 1 ? "s" : ""} skipped`,
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
                className="h-4 w-4 cursor-pointer rounded"
                style={{ accentColor: "#22C55E" }}
              />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {selected.size === needsReviewIds.length ? "Deselect all" : "Select all"}
              </span>
            </div>
          )}
          <div className="space-y-3">
            {needsReview.map((c, i) => (
              <motion.div
                key={c.id}
                className="flex items-start gap-3"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1], delay: Math.min(i * 0.05, 0.3) }}
              >
                {needsReviewIds.length > 1 ? (
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggle(c.id)}
                    className="mt-4 h-4 w-4 shrink-0 cursor-pointer rounded"
                    style={{ accentColor: "#22C55E" }}
                  />
                ) : (
                  <div className="mt-4 h-4 w-4 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <CandidateCard {...c} />
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* Confirmed — collapsible */}
      {confirmed.length > 0 && (
        <div id="confirmed" className="mt-6 border-t pt-5" style={{ borderColor: "var(--bg-border)" }}>
          <button
            onClick={() => setShowConfirmed((v) => !v)}
            className="flex items-center gap-2 text-sm transition-colors duration-150"
            style={{ color: "var(--text-muted)" }}
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full text-xs" style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "#22C55E" }}>✓</span>
            Confirmed ({confirmed.length})
          </button>
          <AnimatePresence>
            {showConfirmed && (
              <motion.div
                className="mt-4 space-y-3"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                style={{ overflow: "hidden" }}
              >
                {confirmed.map((c) => <CandidateCard key={c.id} {...c} />)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Rejected — collapsible */}
      {rejected.length > 0 && (
        <div className="mt-6 border-t pt-5" style={{ borderColor: "var(--bg-border)" }}>
          <button
            onClick={() => setShowRejected((v) => !v)}
            className="flex w-full items-center justify-between gap-2 transition-colors duration-150"
            style={{ color: "var(--text-muted)" }}
          >
            <span className="flex items-center gap-2 text-sm">
              <span className="flex h-4 w-4 items-center justify-center rounded-full text-xs" style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}>✕</span>
              Not deductible ({rejected.length})
            </span>
          </button>
          <AnimatePresence>
            {showRejected && (
              <motion.div
                className="mt-4 space-y-3"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                style={{ overflow: "hidden" }}
              >
                {rejected.map((c) => <CandidateCard key={c.id} {...c} />)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

    </div>
  );
}
