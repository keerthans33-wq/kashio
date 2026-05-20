"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  bulkConfirmCandidates, bulkRejectCandidates, bulkMaybeCandidates,
  bulkResetCandidates, claimAllHighConfidence, ignoreAllPersonal,
} from "./actions";
import { TransactionCard } from "./TransactionCard";
import { Button } from "@/components/ui/button";

// ── Types ──────────────────────────────────────────────────────────────────────

type Status         = "NEEDS_REVIEW" | "CONFIRMED" | "REJECTED" | "MAYBE";
type SuggestionLevel = "LIKELY_WORK_RELATED" | "POSSIBLE_WORK_RELATED" | "PROBABLY_PERSONAL";
type Confidence      = "LOW" | "MEDIUM" | "HIGH";

export type ReviewCandidate = {
  id:              string;
  status:          Status;
  suggestionLevel: SuggestionLevel;
  confidence:      Confidence;
  category:        string;
  reason:          string;
  confidenceReason?: string;
  mixedUse?:       boolean;
  hasEvidence:     boolean;
  evidenceNote:    string | null;
  workPercent:     number | null;
  score:           number;
  transaction: {
    normalizedMerchant: string;
    amount:             number;
    date:               string;
    description:        string;
  };
};

type Tab = "suggested" | "possible" | "personal" | "claimed" | "ignored" | "maybe" | "all";

const PAGE_SIZE = 50;

const DISCLAIMER =
  "Kashio does not provide tax advice. Suggestions are based on transaction descriptions only. " +
  "You decide what to claim and should verify with a registered tax agent.";

// ── Tab matching ───────────────────────────────────────────────────────────────

function matchesTab(item: ReviewCandidate & { status: Status }, tab: Tab): boolean {
  switch (tab) {
    case "suggested": return item.suggestionLevel === "LIKELY_WORK_RELATED"   && item.status === "NEEDS_REVIEW";
    case "possible":  return item.suggestionLevel === "POSSIBLE_WORK_RELATED" && item.status === "NEEDS_REVIEW";
    case "personal":  return item.suggestionLevel === "PROBABLY_PERSONAL"      && item.status === "NEEDS_REVIEW";
    case "claimed":   return item.status === "CONFIRMED";
    case "ignored":   return item.status === "REJECTED";
    case "maybe":     return item.status === "MAYBE";
    case "all":       return true;
  }
}

// ── Search ─────────────────────────────────────────────────────────────────────

function matchesSearch(item: ReviewCandidate, q: string): boolean {
  if (!q) return true;
  const query = q.toLowerCase().trim();

  // Amount comparison: >100 or <50
  const amtMatch = query.match(/^([><])(\d+(?:\.\d+)?)$/);
  if (amtMatch) {
    const op  = amtMatch[1];
    const val = parseFloat(amtMatch[2]);
    const abs = Math.abs(item.transaction.amount);
    return op === ">" ? abs > val : abs < val;
  }

  return (
    item.transaction.normalizedMerchant.toLowerCase().includes(query) ||
    item.transaction.description.toLowerCase().includes(query) ||
    item.category.toLowerCase().includes(query) ||
    String(Math.abs(item.transaction.amount)).includes(query) ||
    item.reason.toLowerCase().includes(query)
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmtAUD = (n: number) =>
  n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

const TAB_LABELS: Record<Tab, string> = {
  suggested: "Suggested",
  possible:  "Possible",
  personal:  "Personal",
  claimed:   "Claimed",
  ignored:   "Ignored",
  maybe:     "Maybe",
  all:       "All",
};

// ── Component ──────────────────────────────────────────────────────────────────

export function ReviewCenter({ candidates }: { candidates: ReviewCandidate[] }) {
  const [activeTab, setActiveTab]           = useState<Tab>("suggested");
  const [searchInput, setSearchInput]       = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage]                     = useState(1);
  const [statusOverrides, setStatusOverrides] = useState<Map<string, Status>>(new Map());
  const [isBulkSaving, setIsBulkSaving]     = useState(false);
  const [bulkMsg, setBulkMsg]               = useState<string | null>(null);
  const [error, setError]                   = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearch(value: string) {
    setSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedQuery(value);
      setPage(1);
    }, 300);
  }

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    setPage(1);
  }

  function handleStatusChange(id: string, next: Status) {
    setStatusOverrides((prev) => new Map(prev).set(id, next));
  }

  // Effective items with optimistic overrides
  const effectiveItems = useMemo(
    () => candidates.map((c) => ({ ...c, status: statusOverrides.get(c.id) ?? c.status })),
    [candidates, statusOverrides],
  );

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts: Record<Tab, number> = {
      suggested: 0, possible: 0, personal: 0,
      claimed: 0, ignored: 0, maybe: 0, all: effectiveItems.length,
    };
    for (const item of effectiveItems) {
      if (item.suggestionLevel === "LIKELY_WORK_RELATED"   && item.status === "NEEDS_REVIEW") counts.suggested++;
      if (item.suggestionLevel === "POSSIBLE_WORK_RELATED" && item.status === "NEEDS_REVIEW") counts.possible++;
      if (item.suggestionLevel === "PROBABLY_PERSONAL"      && item.status === "NEEDS_REVIEW") counts.personal++;
      if (item.status === "CONFIRMED") counts.claimed++;
      if (item.status === "REJECTED")  counts.ignored++;
      if (item.status === "MAYBE")     counts.maybe++;
    }
    return counts;
  }, [effectiveItems]);

  // Tab + search filtered
  const tabFiltered = useMemo(
    () => effectiveItems.filter((item) => matchesTab(item, activeTab)),
    [effectiveItems, activeTab],
  );
  const filtered = useMemo(
    () => tabFiltered.filter((item) => matchesSearch(item, debouncedQuery)),
    [tabFiltered, debouncedQuery],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated   = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  const visibleIds = filtered.map((c) => c.id);

  // Claimed total (only CONFIRMED)
  const claimedTotal = useMemo(
    () => effectiveItems
      .filter((c) => c.status === "CONFIRMED")
      .reduce((s, c) => s + Math.abs(c.transaction.amount), 0),
    [effectiveItems],
  );

  // ── Bulk helpers ─────────────────────────────────────────────────────────────

  async function doBulk(
    action: (ids: string[]) => Promise<void>,
    ids: string[],
    nextStatus: Status,
    msg: string,
  ) {
    setIsBulkSaving(true);
    setError(null);
    setBulkMsg(null);
    ids.forEach((id) => handleStatusChange(id, nextStatus));
    try {
      await action(ids);
      setBulkMsg(msg);
    } catch {
      ids.forEach((id) => setStatusOverrides((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      }));
      setError("Could not save. Please try again.");
    } finally {
      setIsBulkSaving(false);
    }
  }

  async function handleClaimAllHighConfidence() {
    setIsBulkSaving(true);
    setError(null);
    setBulkMsg(null);
    const highIds = effectiveItems
      .filter((c) => c.suggestionLevel === "LIKELY_WORK_RELATED" && c.status === "NEEDS_REVIEW")
      .map((c) => c.id);
    highIds.forEach((id) => handleStatusChange(id, "CONFIRMED"));
    try {
      const count = await claimAllHighConfidence();
      setBulkMsg(`${count} high-confidence suggestion${count !== 1 ? "s" : ""} claimed`);
    } catch {
      highIds.forEach((id) => setStatusOverrides((prev) => { const next = new Map(prev); next.delete(id); return next; }));
      setError("Could not save. Please try again.");
    } finally {
      setIsBulkSaving(false);
    }
  }

  async function handleIgnoreAllPersonal() {
    setIsBulkSaving(true);
    setError(null);
    setBulkMsg(null);
    const personalIds = effectiveItems
      .filter((c) => c.suggestionLevel === "PROBABLY_PERSONAL" && c.status === "NEEDS_REVIEW")
      .map((c) => c.id);
    personalIds.forEach((id) => handleStatusChange(id, "REJECTED"));
    try {
      const count = await ignoreAllPersonal();
      setBulkMsg(`${count} personal transaction${count !== 1 ? "s" : ""} ignored`);
    } catch {
      personalIds.forEach((id) => setStatusOverrides((prev) => { const next = new Map(prev); next.delete(id); return next; }));
      setError("Could not save. Please try again.");
    } finally {
      setIsBulkSaving(false);
    }
  }

  const noData = candidates.length === 0;

  return (
    <div>
      {/* ── Search bar ──────────────────────────────────────────────────────── */}
      <div className="mb-4">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by merchant, category, amount (e.g. >100), or reason…"
          className="w-full rounded-xl px-4 py-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-[#22C55E]"
          style={{
            backgroundColor: "var(--bg-card)",
            border:          "1px solid var(--bg-border)",
            color:           "var(--text-primary)",
          }}
        />
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5 scrollbar-hide">
        {(["suggested", "possible", "personal", "claimed", "ignored", "maybe", "all"] as Tab[]).map((tab) => {
          const isActive = activeTab === tab;
          const count    = tabCounts[tab];
          const accent   = tab === "suggested" ? "#22C55E"
                         : tab === "possible"  ? "#14B8A6"
                         : tab === "personal"  ? "#6B7280"
                         : tab === "claimed"   ? "#22C55E"
                         : tab === "ignored"   ? "#6B7280"
                         : tab === "maybe"     ? "#F59E0B"
                         : "var(--text-secondary)";
          return (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all duration-150"
              style={{
                backgroundColor: isActive ? `${accent}18` : "rgba(255,255,255,0.04)",
                border:          `1px solid ${isActive ? `${accent}40` : "rgba(255,255,255,0.06)"}`,
                color:           isActive ? accent : "var(--text-secondary)",
              }}
            >
              {TAB_LABELS[tab]}
              {count > 0 && (
                <span
                  className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold"
                  style={{ backgroundColor: `${accent}25`, color: accent }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Bulk action bar (when there are results) ────────────────────────── */}
      {!noData && (
        <div
          className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl px-4 py-3"
          style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-border)" }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-widest mr-1" style={{ color: "var(--text-muted)" }}>
            Bulk
          </span>
          <Button
            size="xs"
            variant="secondary"
            disabled={isBulkSaving || visibleIds.length === 0}
            onClick={() => doBulk(bulkConfirmCandidates, visibleIds, "CONFIRMED",
              `${visibleIds.length} transaction${visibleIds.length !== 1 ? "s" : ""} claimed`)}
          >
            Claim visible
          </Button>
          <Button
            size="xs"
            variant="secondary"
            disabled={isBulkSaving || visibleIds.length === 0}
            onClick={() => doBulk(bulkRejectCandidates, visibleIds, "REJECTED",
              `${visibleIds.length} transaction${visibleIds.length !== 1 ? "s" : ""} ignored`)}
          >
            Ignore visible
          </Button>
          <Button
            size="xs"
            variant="secondary"
            disabled={isBulkSaving || visibleIds.length === 0}
            onClick={() => doBulk(bulkMaybeCandidates, visibleIds, "MAYBE",
              `${visibleIds.length} marked as maybe`)}
          >
            Maybe visible
          </Button>
          <Button
            size="xs"
            variant="secondary"
            disabled={isBulkSaving || visibleIds.length === 0}
            onClick={() => doBulk(bulkResetCandidates, visibleIds, "NEEDS_REVIEW",
              `${visibleIds.length} decision${visibleIds.length !== 1 ? "s" : ""} reset`)}
          >
            Reset visible
          </Button>
          <span className="hidden sm:inline text-[rgba(255,255,255,0.08)]">|</span>
          <Button
            size="xs"
            variant="secondary"
            disabled={isBulkSaving || tabCounts.suggested === 0}
            onClick={handleClaimAllHighConfidence}
          >
            Claim all suggested
          </Button>
          <Button
            size="xs"
            variant="secondary"
            disabled={isBulkSaving || tabCounts.personal === 0}
            onClick={handleIgnoreAllPersonal}
          >
            Ignore all personal
          </Button>
        </div>
      )}

      {/* ── Feedback messages ────────────────────────────────────────────────── */}
      {bulkMsg && (
        <div className="mb-3 flex items-center justify-between rounded-xl px-4 py-2.5" style={{ backgroundColor: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.15)" }}>
          <p className="text-[13px] font-medium" style={{ color: "#22C55E" }}>{bulkMsg}</p>
          <button onClick={() => setBulkMsg(null)} className="text-[11px] ml-3" style={{ color: "rgba(255,255,255,0.3)" }}>✕</button>
        </div>
      )}
      {error && (
        <div className="mb-3 rounded-xl px-4 py-2.5" style={{ backgroundColor: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)" }}>
          <p className="text-[13px]" style={{ color: "#f87171" }}>{error}</p>
        </div>
      )}

      {/* ── Claimed summary bar ──────────────────────────────────────────────── */}
      {tabCounts.claimed > 0 && (
        <div
          className="mb-4 flex items-center justify-between rounded-2xl px-5 py-3"
          style={{ backgroundColor: "rgba(17,33,24,0.78)", border: "1px solid rgba(34,197,94,0.18)" }}
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              Claimed so far
            </p>
            <p className="text-[22px] font-bold tabular-nums leading-none mt-0.5" style={{ color: "#22C55E" }}>
              {fmtAUD(claimedTotal)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {tabCounts.claimed} transaction{tabCounts.claimed !== 1 ? "s" : ""}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
              ~{fmtAUD(Math.round(claimedTotal * 0.325))} est. saving
            </p>
          </div>
        </div>
      )}

      {/* ── Empty states ─────────────────────────────────────────────────────── */}
      {noData ? (
        <div className="py-16 text-center">
          <p className="text-[15px] font-medium mb-1" style={{ color: "var(--text-primary)" }}>Nothing imported yet</p>
          <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
            Import your bank statement CSV and Kashio will classify each transaction.
          </p>
          <a
            href="/import"
            className="mt-4 inline-block rounded-xl px-5 py-2.5 text-[13px] font-semibold"
            style={{ backgroundColor: "#22C55E", color: "#000" }}
          >
            Import CSV →
          </a>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-[14px]" style={{ color: "var(--text-muted)" }}>
            {debouncedQuery ? `No results for "${debouncedQuery}"` : `No ${TAB_LABELS[activeTab].toLowerCase()} transactions`}
          </p>
          {debouncedQuery && (
            <button
              onClick={() => { setSearchInput(""); setDebouncedQuery(""); }}
              className="mt-3 text-[12px] underline"
              style={{ color: "var(--text-muted)" }}
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Result count + page info */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
              {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
              {debouncedQuery && ` matching "${debouncedQuery}"`}
            </p>
            {totalPages > 1 && (
              <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
                Page {currentPage} of {totalPages}
              </p>
            )}
          </div>

          {/* Cards */}
          <div className="space-y-3">
            {paginated.map((c) => (
              <TransactionCard
                key={c.id}
                {...c}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                disabled={currentPage === 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg px-4 py-2 text-[13px] font-medium transition-opacity disabled:opacity-30"
                style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-border)", color: "var(--text-secondary)" }}
              >
                ← Prev
              </button>
              <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg px-4 py-2 text-[13px] font-medium transition-opacity disabled:opacity-30"
                style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-border)", color: "var(--text-secondary)" }}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Disclaimer ──────────────────────────────────────────────────────── */}
      <p className="mt-10 text-[11px] leading-relaxed" style={{ color: "var(--text-muted)", opacity: 0.55 }}>
        {DISCLAIMER}
      </p>
    </div>
  );
}
