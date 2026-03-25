import { db } from "../../../lib/db";
import { ReviewFilters } from "./ReviewFilters";
import { ReviewList } from "./ReviewList";
import type { CandidateCardProps } from "./CandidateCard";

export const dynamic = "force-dynamic";

const CONFIDENCE_RANK: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

type Candidate = Awaited<ReturnType<typeof db.deductionCandidate.findMany>>[number] & {
  transaction: { normalizedMerchant: string; amount: number; date: string; description: string };
};

function toCardProps(c: Candidate): CandidateCardProps {
  return {
    id:           c.id,
    status:       c.status,
    confidence:   c.confidence,
    category:     c.category,
    reason:       c.reason,
    hasEvidence:  c.hasEvidence,
    evidenceNote: c.evidenceNote ?? null,
    transaction:  c.transaction,
  };
}

type SearchParams = { status?: string; category?: string; confidence?: string; sort?: string };

export default async function Review({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { status, category, confidence, sort } = await searchParams;

  const all = await db.deductionCandidate.findMany({
    include: { transaction: true },
    orderBy: { transaction: { date: "desc" } },
  });

  const filtered = all.filter((c) => {
    if (status     && c.status     !== status)     return false;
    if (category   && c.category   !== category)   return false;
    if (confidence && c.confidence !== confidence) return false;
    return true;
  });

  const candidates = [...filtered].sort((a, b) => {
    if (sort === "amount")     return Math.abs(b.transaction.amount) - Math.abs(a.transaction.amount);
    if (sort === "confidence") return CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence];
    return 0; // default: keep date desc from DB
  });

  const needsReview   = candidates.filter((c) => c.status === "NEEDS_REVIEW");
  const confirmed     = candidates.filter((c) => c.status === "CONFIRMED");
  const rejected      = candidates.filter((c) => c.status === "REJECTED");

  // Summary counts always reflect the full unfiltered set
  const totalNeedsReview = all.filter((c) => c.status === "NEEDS_REVIEW").length;
  const totalConfirmed   = all.filter((c) => c.status === "CONFIRMED").length;
  const totalRejected    = all.filter((c) => c.status === "REJECTED").length;
  const totalExportReady = all.filter((c) => c.status === "CONFIRMED" && c.hasEvidence).length;

  const isFiltered = status || category || confidence;


  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Review</h1>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Needs Review</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{totalNeedsReview}</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-900/20">
          <p className="text-xs font-medium uppercase tracking-wide text-green-600 dark:text-green-400">Confirmed</p>
          <p className="mt-1 text-2xl font-semibold text-green-700 dark:text-green-400">{totalConfirmed}</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-xs font-medium uppercase tracking-wide text-red-500 dark:text-red-400">Rejected</p>
          <p className="mt-1 text-2xl font-semibold text-red-600 dark:text-red-400">{totalRejected}</p>
        </div>
      </div>

      {all.length > 0 && (() => {
        const reviewed = totalConfirmed + totalRejected;
        const pct      = Math.round((reviewed / all.length) * 100);
        return (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mb-1">
              <span>{reviewed} of {all.length} reviewed</span>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-700">
              <div
                className="h-1.5 rounded-full bg-green-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })()}

      {all.length > 0 && (() => {
        const missingEvidence = totalConfirmed - totalExportReady;
        if (totalNeedsReview > 0) return (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {totalNeedsReview} item{totalNeedsReview !== 1 ? "s" : ""} still need review.
            {missingEvidence > 0 && <> Once reviewed, {missingEvidence} confirmed item{missingEvidence !== 1 ? "s" : ""} will still need evidence.</>}
            {isFiltered && ` Showing ${candidates.length} of ${all.length}.`}
          </p>
        );
        if (missingEvidence > 0) return (
          <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">
            Review is complete. {missingEvidence} confirmed item{missingEvidence !== 1 ? "s" : ""} still {missingEvidence !== 1 ? "need" : "needs"} evidence before export.
            {isFiltered && <span className="text-gray-500 dark:text-gray-400"> Showing {candidates.length} of {all.length}.</span>}
          </p>
        );
        if (totalExportReady > 0) return (
          <p className="mt-3 text-sm text-green-700 dark:text-green-400">
            All done. <a href="/export" className="underline hover:text-green-900 dark:hover:text-green-200">Go to Export</a> to download your deductions.
            {isFiltered && <span className="text-gray-500 dark:text-gray-400"> Showing {candidates.length} of {all.length}.</span>}
          </p>
        );
        return (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            All candidates have been reviewed.
            {isFiltered && ` Showing ${candidates.length} of ${all.length}.`}
          </p>
        );
      })()}

      <ReviewFilters />

      {all.length === 0 ? (
        <p className="mt-10 text-center text-gray-400 dark:text-gray-500">
          No candidates yet. Import a CSV to detect deductions.
        </p>
      ) : candidates.length === 0 ? (
        <div className="mt-10 text-center text-gray-400 dark:text-gray-500 space-y-2">
          <p>No candidates match these filters.</p>
          <p className="text-sm">
            Try changing the status or category filter, or{" "}
            <a href="/review" className="underline hover:text-gray-600 dark:hover:text-gray-300">clear all filters</a>{" "}
            to see everything.
          </p>
        </div>
      ) : (
        <div className="mt-6">
          <ReviewList
            needsReview={needsReview.map(toCardProps)}
            confirmed={confirmed.map(toCardProps)}
            rejected={rejected.map(toCardProps)}
          />
        </div>
      )}
    </main>
  );
}
