import { db } from "../../../lib/db";
import { requireUserWithType } from "../../../lib/auth";
import { ACTIVE_CATEGORIES, CATEGORIES_BY_USER_TYPE, CATEGORY_PRIORITY_BY_USER_TYPE } from "../../../lib/rules/categories";
import { ReviewFilters } from "./ReviewFilters";
import { ReviewList } from "./ReviewList";
import type { CandidateCardProps } from "./CandidateCard";

const HEADING: Record<string, string> = {
  employee:    "Work-related deductions",
  contractor:  "Business expenses",
  sole_trader: "Business deductions",
};

const EMPTY_STATE: Record<string, string> = {
  employee:    "Import your bank transactions and Kashio will flag expenses that look work-related.",
  contractor:  "Import your bank transactions and Kashio will flag your possible business expenses.",
  sole_trader: "Import your bank transactions and Kashio will flag your possible business deductions.",
};

const DISCLAIMER: Record<string, string> = {
  employee:    "Kashio helps you spot possible work-related deductions. It's not a tax adviser. Check with your accountant before lodging.",
  contractor:  "Kashio helps you spot possible business expenses. It's not a tax adviser. Check with your accountant before lodging.",
  sole_trader: "Kashio helps you spot possible business deductions. It's not a tax adviser. Check with your accountant before lodging.",
};

// One contextual tip shown while reviewing — surfaced once per user type, not a repeat of other copy.
const TIP: Record<string, string> = {
  employee:    "Your regular commute isn't deductible. Only trips to a client, second workplace, or work event qualify.",
  contractor:  "Keep receipts for everything you confirm. The ATO can ask for evidence at any time.",
  sole_trader: "If an expense mixes personal and business use, you can only claim the business portion.",
};

export const dynamic = "force-dynamic";

const CONFIDENCE_RANK: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

type Candidate = Awaited<ReturnType<typeof db.deductionCandidate.findMany>>[number] & {
  transaction:      { normalizedMerchant: string; amount: number; date: string; description: string };
  confidenceReason?: string | null;
  mixedUse?:         boolean;
};

function toCardProps(c: Candidate, userType: string | null): CandidateCardProps {
  return {
    id:               c.id,
    status:           c.status,
    confidence:       c.confidence,
    category:         c.category,
    reason:           c.reason,
    confidenceReason: c.confidenceReason ?? undefined,
    mixedUse:         c.mixedUse,
    hasEvidence:      c.hasEvidence,
    evidenceNote:     c.evidenceNote ?? null,
    transaction:      c.transaction,
    userType,
  };
}

type SearchParams = { category?: string; confidence?: string; sort?: string };

export default async function Review({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [{ id: userId, userType }, { category, confidence, sort }] = await Promise.all([
    requireUserWithType(),
    searchParams,
  ]);

  const allowedCategories = (userType && CATEGORIES_BY_USER_TYPE[userType]) ?? ACTIVE_CATEGORIES;

  const all = (await db.deductionCandidate.findMany({
    where:   { userId },
    include: { transaction: true },
    orderBy: { transaction: { date: "desc" } },
  })).filter((c) => allowedCategories.includes(c.category));

  const filtered = all.filter((c) => {
    if (category   && c.category   !== category)   return false;
    if (confidence && c.confidence !== confidence) return false;
    return true;
  });

  const categoryOrder = (userType && CATEGORY_PRIORITY_BY_USER_TYPE[userType]) ?? [];
  const categoryRank  = (cat: string) => { const i = categoryOrder.indexOf(cat); return i === -1 ? 999 : i; };

  const candidates = [...filtered].sort((a, b) => {
    if (sort === "amount") return Math.abs(b.transaction.amount) - Math.abs(a.transaction.amount);
    // Default: confidence → category priority → date desc
    const rankDiff = CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence];
    if (rankDiff !== 0) return rankDiff;
    const catDiff = categoryRank(a.category) - categoryRank(b.category);
    if (catDiff !== 0) return catDiff;
    return new Date(b.transaction.date).getTime() - new Date(a.transaction.date).getTime();
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
  const unreviewedValue = all.filter((c) => c.status === "NEEDS_REVIEW").reduce((s, c) => s + amt(c), 0);
  const potentialValue  = all.filter((c) => c.status !== "REJECTED").reduce((s, c) => s + amt(c), 0);
  const fmt = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

  const isFiltered = category || confidence;

  // Single top-priority nudge: 1) items to review, 2) missing evidence
  const nudge =
    all.length === 0         ? ((userType && EMPTY_STATE[userType]) ?? "Import your bank transactions and Kashio will flag what looks deductible.") :
    totalNeedsReview > 0     ? `${totalNeedsReview} item${totalNeedsReview !== 1 ? "s" : ""} left to review${unreviewedValue > 0 ? `. ${fmt(unreviewedValue)} to consider` : ""}.` :
    missingEvidence > 0      ? `${missingEvidence} confirmed item${missingEvidence !== 1 ? "s" : ""} still need${missingEvidence === 1 ? "s" : ""} a receipt.` :
    totalConfirmed > 0       ? "All reviewed. Ready to export." :
                                "Nothing confirmed yet.";


  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {userType ? HEADING[userType] ?? "Possible deductions" : "Possible deductions"}
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">{nudge}</p>
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
              : <span className="text-green-600 dark:text-green-400">All done. {all.length} reviewed.</span>
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



      {all.length > 0 && userType && TIP[userType] && (
        <p className="mt-5 text-xs text-gray-400 dark:text-gray-500">
          <span className="font-medium text-gray-500 dark:text-gray-400">Tip</span>{" "}{TIP[userType]}
        </p>
      )}

      <div className="mt-6 border-t border-gray-100 dark:border-gray-800" />
      <ReviewFilters categories={allowedCategories} />

      {all.length === 0 ? (
        <div className="mt-10 text-center space-y-1">
          <p className="text-gray-500 dark:text-gray-400">Nothing to review yet.</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            <a href="/import" className="underline hover:text-gray-600 dark:hover:text-gray-300">Import your transactions</a>
            {" "}and Kashio will find your possible {userType === "contractor" ? "business expenses" : "deductions"}.
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
            needsReview={needsReview.map((c) => toCardProps(c, userType))}
            confirmed={confirmed.map((c) => toCardProps(c, userType))}
            rejected={rejected.map((c) => toCardProps(c, userType))}
            missingEvidence={missingEvidence}
          />
        </div>
      )}

      {all.length > 0 && (
        <p className="mt-10 text-xs text-gray-400 dark:text-gray-500">
          {(userType && DISCLAIMER[userType]) ?? "Kashio helps you spot possible deductions. It's not a tax adviser. Check with your accountant before lodging."}
        </p>
      )}
    </main>
  );
}
