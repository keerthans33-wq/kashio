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
    id:          c.id,
    status:      c.status,
    confidence:  c.confidence,
    category:    c.category,
    reason:      c.reason,
    transaction: c.transaction,
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

  const isFiltered = status || category || confidence;


  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">Review</h1>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Needs Review</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{totalNeedsReview}</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-green-600">Confirmed</p>
          <p className="mt-1 text-2xl font-semibold text-green-700">{totalConfirmed}</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-red-500">Rejected</p>
          <p className="mt-1 text-2xl font-semibold text-red-600">{totalRejected}</p>
        </div>
      </div>

      <p className="mt-3 text-sm text-gray-500">
        {all.length === 0
          ? null
          : totalNeedsReview > 0
          ? `You still have ${totalNeedsReview} item${totalNeedsReview !== 1 ? "s" : ""} to review.`
          : "All candidates have been reviewed."}
        {isFiltered && ` Showing ${candidates.length} of ${all.length}.`}
      </p>

      <ReviewFilters />

      {all.length === 0 ? (
        <p className="mt-10 text-center text-gray-400">
          No candidates yet. Import a CSV to detect deductions.
        </p>
      ) : candidates.length === 0 ? (
        <div className="mt-10 text-center text-gray-400 space-y-2">
          <p>No candidates match these filters.</p>
          <p className="text-sm">
            Try changing the status or category filter, or{" "}
            <a href="/review" className="underline hover:text-gray-600">clear all filters</a>{" "}
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
