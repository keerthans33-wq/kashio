import { db } from "../../../lib/db";
import { ReviewFilters } from "./ReviewFilters";
import { ReviewList } from "./ReviewList";
import type { CandidateCardProps } from "./CandidateCard";

export const dynamic = "force-dynamic";

const CONFIDENCE_RANK: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

type Candidate = Awaited<ReturnType<typeof db.deductionCandidate.findMany>>[number] & {
  transaction: { normalizedMerchant: string; amount: number; date: string; description: string };
  confidenceReason?: string | null;
};

function toCardProps(c: Candidate): CandidateCardProps {
  return {
    id:               c.id,
    status:           c.status,
    confidence:       c.confidence,
    category:         c.category,
    reason:           c.reason,
    confidenceReason: c.confidenceReason ?? undefined,
    hasEvidence:      c.hasEvidence,
    evidenceNote:     c.evidenceNote ?? null,
    transaction:      c.transaction,
  };
}

type SearchParams = { category?: string; confidence?: string; sort?: string };

export default async function Review({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { category, confidence, sort } = await searchParams;

  const all = await db.deductionCandidate.findMany({
    include: { transaction: true },
    orderBy: { transaction: { date: "desc" } },
  });

  const filtered = all.filter((c) => {
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

  // Dollar values — always from unfiltered set
  const amt = (c: Candidate) => Math.abs(c.transaction.amount);
  const potentialValue = all.filter((c) => c.status !== "REJECTED").reduce((s, c) => s + amt(c), 0);
  const confirmedValue = all.filter((c) => c.status === "CONFIRMED").reduce((s, c) => s + amt(c), 0);
  const fmt = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

  const isFiltered = category || confidence;


  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Review</h1>
          <span className="text-sm text-gray-400 dark:text-gray-500">Step 2 of 3</span>
        </div>
        {totalConfirmed > 0 && (
          <a
            href="/export"
            className="shrink-0 rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            Go to Export →
          </a>
        )}
      </div>
      <p className="mt-2 text-gray-500 dark:text-gray-400">
        Check each item and confirm what was genuinely work-related. Reject anything personal.
      </p>

      {all.length > 0 && (
        <div className="mt-6 rounded-xl bg-gradient-to-br from-violet-600 to-violet-700 px-5 py-5 text-white shadow-sm">
          <div className="grid grid-cols-2 divide-x divide-violet-500">
            {/* Potential */}
            <div className="pr-4">
              <p className="text-[10px] font-medium uppercase tracking-wide text-violet-200 leading-tight">Potential<br/>deductions</p>
              <p className="mt-1.5 text-3xl font-bold tabular-nums">{fmt(potentialValue)}</p>
              <p className="mt-1 text-xs text-violet-300">
                {totalNeedsReview > 0
                  ? `${totalNeedsReview} item${totalNeedsReview !== 1 ? "s" : ""} still to review`
                  : "All items reviewed"}
              </p>
            </div>
            {/* Confirmed */}
            <div className="pl-4">
              <p className="text-[10px] font-medium uppercase tracking-wide text-violet-200 leading-tight">Confirmed<br/>so far</p>
              <p className="mt-1.5 text-3xl font-bold tabular-nums">{fmt(confirmedValue)}</p>
              <p className="mt-1 text-xs text-violet-300">
                {totalConfirmed > 0
                  ? `${totalConfirmed} item${totalConfirmed !== 1 ? "s" : ""} confirmed`
                  : "None yet"}
              </p>
            </div>
          </div>
        </div>
      )}
      {all.length > 0 && (
        <p className="mt-1.5 text-xs text-center text-gray-400 dark:text-gray-500">
          These are amounts you may be able to claim — not the tax refund you&apos;ll receive.
        </p>
      )}






      <div className="mt-6 border-t border-gray-100 dark:border-gray-800" />
      <ReviewFilters />

      {all.length === 0 ? (
        <div className="mt-10 text-center space-y-1">
          <p className="text-gray-500 dark:text-gray-400">Nothing to review yet.</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            <a href="/import" className="underline hover:text-gray-600 dark:hover:text-gray-300">Import a bank CSV</a> and Kashio will scan it for possible deductions.
          </p>
        </div>
      ) : candidates.length === 0 ? (
        <div className="mt-10 text-center space-y-1">
          <p className="text-gray-500 dark:text-gray-400">No candidates match your current filters.</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Try adjusting the filters above, or{" "}
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
