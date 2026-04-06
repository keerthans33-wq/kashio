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
  const totalNeedsReview  = all.filter((c) => c.status === "NEEDS_REVIEW").length;
  const totalConfirmed    = all.filter((c) => c.status === "CONFIRMED").length;
  const totalReviewed     = all.filter((c) => c.status !== "NEEDS_REVIEW").length;
  const missingEvidence   = all.filter((c) => c.status === "CONFIRMED" && !c.hasEvidence).length;

  // Dollar values — always from unfiltered set
  const amt = (c: Candidate) => Math.abs(c.transaction.amount);
  const potentialValue = all.filter((c) => c.status !== "REJECTED").reduce((s, c) => s + amt(c), 0);
  const fmt = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

  const isFiltered = category || confidence;

  // Single priority-based nudge
  const nudge =
    all.length === 0        ? null :
    totalNeedsReview > 0   ? "Go through each one. Keep what was for work, skip the rest." :
    missingEvidence > 0    ? `Add receipts for ${missingEvidence} confirmed deduction${missingEvidence !== 1 ? "s" : ""} before exporting.` :
    totalConfirmed > 0     ? "All reviewed — ready to export." :
                              null;


  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Your possible deductions</h1>
          {nudge && (
            <p className="mt-1 text-gray-500 dark:text-gray-400">{nudge}</p>
          )}
        </div>
        {totalConfirmed > 0 && (
          <a
            href="/export"
            className="shrink-0 rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            Export →
          </a>
        )}
      </div>


      {all.length > 0 && (
        <div className="mt-5">
          <div className="flex justify-between text-sm text-gray-400 dark:text-gray-500 mb-1.5">
            {totalNeedsReview > 0
              ? <span>{totalReviewed} of {all.length} reviewed</span>
              : <span className="text-green-600 dark:text-green-400">All done — {all.length} reviewed</span>
            }
            {totalNeedsReview > 0 && potentialValue > 0 && (
              <span>{fmt(potentialValue)} potential</span>
            )}
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-700">
            <div
              className={`h-1.5 rounded-full transition-all ${totalNeedsReview === 0 ? "bg-green-500" : "bg-violet-400"}`}
              style={{ width: all.length > 0 ? `${Math.round((totalReviewed / all.length) * 100)}%` : "0%" }}
            />
          </div>
        </div>
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
          <p className="text-gray-500 dark:text-gray-400">No possible deductions match your filters.</p>
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

      {all.length > 0 && (
        <p className="mt-10 text-xs text-gray-400 dark:text-gray-500">
          Kashio helps you spot possible deductions — it's not a tax adviser. When in doubt, check with your accountant.
        </p>
      )}
    </main>
  );
}
