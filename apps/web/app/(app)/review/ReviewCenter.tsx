"use client";

import { useMemo, useRef, useState } from "react";
import { bulkConfirmCandidates, bulkRejectCandidates } from "./actions";
import { TransactionCard } from "./TransactionCard";

// ── Types ──────────────────────────────────────────────────────────────────────

type Status          = "NEEDS_REVIEW" | "CONFIRMED" | "REJECTED" | "MAYBE";
type SuggestionLevel = "LIKELY_WORK_RELATED" | "POSSIBLE_WORK_RELATED" | "PROBABLY_PERSONAL";
type Confidence      = "LOW" | "MEDIUM" | "HIGH";
type Tab             = "suggested" | "personal";

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

const PAGE_SIZE = 50;

const DISCLAIMER =
  "Kashio does not provide tax advice. Suggestions are based on transaction descriptions only. " +
  "You decide what to claim and should verify with a registered tax agent.";

// ── Tab matching ───────────────────────────────────────────────────────────────

function matchesTab(item: ReviewCandidate & { status: Status }, tab: Tab): boolean {
  if (tab === "suggested") {
    return (
      (item.suggestionLevel === "LIKELY_WORK_RELATED" ||
        item.suggestionLevel === "POSSIBLE_WORK_RELATED") &&
      item.status === "NEEDS_REVIEW"
    );
  }
  return item.suggestionLevel === "PROBABLY_PERSONAL" && item.status === "NEEDS_REVIEW";
}

// ── Search ─────────────────────────────────────────────────────────────────────

function matchesSearch(item: ReviewCandidate, q: string): boolean {
  if (!q) return true;
  const query = q.toLowerCase().trim();

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

// ── Component ──────────────────────────────────────────────────────────────────

export function ReviewCenter({ candidates }: { candidates: ReviewCandidate[] }) {
  const [activeTab, setActiveTab]           = useState<Tab>("suggested");
  const [searchInput, setSearchInput]       = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage]                     = useState(1);
  const [statusOverrides, setStatusOverrides] = useState<Map<string, Status>>(new Map());
  const [isBulkSaving, setIsBulkSaving]     = useState(false);
  const [toast, setToast]                   = useState<string | null>(null);
  const [error, setError]                   = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

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
    setSearchInput("");
    setDebouncedQuery("");
  }

  function handleStatusChange(id: string, next: Status) {
    setStatusOverrides((prev) => new Map(prev).set(id, next));
    if (next === "CONFIRMED")    showToast("Transaction claimed");
    else if (next === "REJECTED") showToast("Transaction hidden");
    else if (next === "NEEDS_REVIEW") showToast("Decision reset");
  }

  // Effective items with optimistic overrides
  const effectiveItems = useMemo(
    () => candidates.map((c) => ({ ...c, status: statusOverrides.get(c.id) ?? c.status })),
    [candidates, statusOverrides],
  );

  // Tab counts
  const tabCounts = useMemo(() => {
    let suggested = 0, personal = 0, claimed = 0;
    for (const item of effectiveItems) {
      if (
        (item.suggestionLevel === "LIKELY_WORK_RELATED" ||
          item.suggestionLevel === "POSSIBLE_WORK_RELATED") &&
        item.status === "NEEDS_REVIEW"
      ) suggested++;
      if (item.suggestionLevel === "PROBABLY_PERSONAL" && item.status === "NEEDS_REVIEW")
        personal++;
      if (item.status === "CONFIRMED") claimed++;
    }
    return { suggested, personal, claimed };
  }, [effectiveItems]);

  const tabFiltered = useMemo(
    () => effectiveItems.filter((item) => matchesTab(item, activeTab)),
    [effectiveItems, activeTab],
  );
  const filtered = useMemo(
    () => tabFiltered.filter((item) => matchesSearch(item, debouncedQuery)),
    [tabFiltered, debouncedQuery],
  );

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated   = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  const claimedTotal = useMemo(
    () =>
      effectiveItems
        .filter((c) => c.status === "CONFIRMED")
        .reduce((s, c) => s + Math.abs(c.transaction.amount), 0),
    [effectiveItems],
  );

  // ── Bulk actions ─────────────────────────────────────────────────────────────

  async function handleClaimAllSuggested() {
    const ids = effectiveItems
      .filter(
        (c) =>
          (c.suggestionLevel === "LIKELY_WORK_RELATED" ||
            c.suggestionLevel === "POSSIBLE_WORK_RELATED") &&
          c.status === "NEEDS_REVIEW",
      )
      .map((c) => c.id);
    if (!ids.length) return;
    setIsBulkSaving(true);
    setError(null);
    ids.forEach((id) =>
      setStatusOverrides((prev) => new Map(prev).set(id, "CONFIRMED")),
    );
    try {
      await bulkConfirmCandidates(ids);
      showToast(
        `${ids.length} suggested transaction${ids.length !== 1 ? "s" : ""} claimed`,
      );
    } catch {
      ids.forEach((id) =>
        setStatusOverrides((prev) => {
          const next = new Map(prev);
          next.delete(id);
          return next;
        }),
      );
      setError("Could not save. Please try again.");
    } finally {
      setIsBulkSaving(false);
    }
  }

  async function handleHidePersonal() {
    const ids = effectiveItems
      .filter(
        (c) => c.suggestionLevel === "PROBABLY_PERSONAL" && c.status === "NEEDS_REVIEW",
      )
      .map((c) => c.id);
    if (!ids.length) return;
    setIsBulkSaving(true);
    setError(null);
    ids.forEach((id) =>
      setStatusOverrides((prev) => new Map(prev).set(id, "REJECTED")),
    );
    try {
      await bulkRejectCandidates(ids);
      showToast(
        `${ids.length} personal transaction${ids.length !== 1 ? "s" : ""} hidden`,
      );
    } catch {
      ids.forEach((id) =>
        setStatusOverrides((prev) => {
          const next = new Map(prev);
          next.delete(id);
          return next;
        }),
      );
      setError("Could not save. Please try again.");
    } finally {
      setIsBulkSaving(false);
    }
  }

  const noData = candidates.length === 0;

  return (
    <div className="pb-28">

      {/* ── Search bar ──────────────────────────────────────────────────────── */}
      <div className="mb-4">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search merchant, category, amount…"
          className="w-full rounded-xl px-4 py-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-[#22C55E]"
          style={{
            backgroundColor: "var(--bg-card)",
            border:          "1px solid var(--bg-border)",
            color:           "var(--text-primary)",
          }}
        />
      </div>

      {/* ── Segmented control ───────────────────────────────────────────────── */}
      {!noData && (
        <div
          className="mb-5 grid grid-cols-2 gap-1 rounded-xl p-1"
          style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-border)" }}
        >
          {(["suggested", "personal"] as Tab[]).map((tab) => {
            const isActive = activeTab === tab;
            const count    = tabCounts[tab];
            const isGreen  = tab === "suggested";
            return (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className="flex items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] font-medium transition-all duration-150"
                style={{
                  backgroundColor: isActive ? "rgba(255,255,255,0.07)" : "transparent",
                  color:           isActive ? "var(--text-primary)" : "var(--text-muted)",
                  boxShadow:       isActive ? "0 1px 3px rgba(0,0,0,0.3)" : "none",
                }}
              >
                {tab === "suggested" ? "Suggested" : "Personal"}
                <span
                  className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums"
                  style={{
                    backgroundColor: isActive
                      ? isGreen ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.08)"
                      : "rgba(255,255,255,0.05)",
                    color: isActive
                      ? isGreen ? "#22C55E" : "var(--text-secondary)"
                      : "var(--text-muted)",
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Claimed summary bar ─────────────────────────────────────────────── */}
      {tabCounts.claimed > 0 && (
        <div
          className="mb-5 flex items-center justify-between rounded-2xl px-5 py-3.5"
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
            <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
              {tabCounts.claimed} transaction{tabCounts.claimed !== 1 ? "s" : ""}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
              ~{fmtAUD(Math.round(claimedTotal * 0.325))} est. saving
            </p>
          </div>
        </div>
      )}

      {/* ── Subtle bulk action row ──────────────────────────────────────────── */}
      {!noData && !debouncedQuery && (
        <div className="mb-4 min-h-[20px]">
          {activeTab === "suggested" && tabCounts.suggested > 0 && (
            <button
              disabled={isBulkSaving}
              onClick={handleClaimAllSuggested}
              className="text-[12px] font-medium transition-opacity disabled:opacity-40"
              style={{ color: "#22C55E" }}
            >
              Claim all suggested →
            </button>
          )}
          {activeTab === "personal" && tabCounts.personal > 0 && (
            <button
              disabled={isBulkSaving}
              onClick={handleHidePersonal}
              className="text-[12px] font-medium transition-opacity disabled:opacity-40"
              style={{ color: "var(--text-muted)" }}
            >
              Hide personal transactions →
            </button>
          )}
        </div>
      )}

      {/* ── Toast ───────────────────────────────────────────────────────────── */}
      {toast && (
        <div
          className="mb-3 flex items-center justify-between rounded-xl px-4 py-2.5"
          style={{ backgroundColor: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.15)" }}
        >
          <p className="text-[13px] font-medium" style={{ color: "#22C55E" }}>{toast}</p>
          <button
            onClick={() => setToast(null)}
            className="ml-3 text-[11px]"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            ✕
          </button>
        </div>
      )}
      {error && (
        <div
          className="mb-3 rounded-xl px-4 py-2.5"
          style={{ backgroundColor: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)" }}
        >
          <p className="text-[13px]" style={{ color: "#f87171" }}>{error}</p>
        </div>
      )}

      {/* ── Empty states ─────────────────────────────────────────────────────── */}
      {noData ? (
        <div className="py-16 text-center">
          <p className="text-[15px] font-medium mb-1" style={{ color: "var(--text-primary)" }}>
            Nothing imported yet
          </p>
          <p className="text-[13px] mb-5" style={{ color: "var(--text-muted)" }}>
            Import your bank statement CSV and Kashio will classify each transaction.
          </p>
          <a
            href="/import"
            className="inline-block rounded-xl px-5 py-2.5 text-[13px] font-semibold"
            style={{ backgroundColor: "#22C55E", color: "#000" }}
          >
            Import CSV →
          </a>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-[14px]" style={{ color: "var(--text-muted)" }}>
            {debouncedQuery
              ? `No results for "${debouncedQuery}"`
              : activeTab === "suggested"
              ? "All done — no suggested transactions to review."
              : "No personal transactions found."
            }
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
          {/* Result count */}
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
                style={{
                  backgroundColor: "var(--bg-card)",
                  border:          "1px solid var(--bg-border)",
                  color:           "var(--text-secondary)",
                }}
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
                style={{
                  backgroundColor: "var(--bg-card)",
                  border:          "1px solid var(--bg-border)",
                  color:           "var(--text-secondary)",
                }}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Disclaimer ──────────────────────────────────────────────────────── */}
      <p className="mt-10 text-[11px] leading-relaxed" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
        {DISCLAIMER}
      </p>
    </div>
  );
}
