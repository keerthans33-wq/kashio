import { db } from "../../../lib/db";
import { requireUserWithType } from "../../../lib/auth";
import { ACTIVE_CATEGORIES, CATEGORIES_BY_USER_TYPE, CATEGORY_PRIORITY_BY_USER_TYPE } from "../../../lib/rules/categories";
import { calcWfhSummary } from "../../../lib/wfhSummary";
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

// Returns the singular noun for a deduction/expense depending on user type.
// Use termPlural() for the plural form.
function term(userType: string | null): string {
  if (userType === "contractor")  return "business expense";
  if (userType === "sole_trader") return "business deduction";
  return "deduction";
}
function termPlural(userType: string | null): string {
  return `${term(userType)}s`;
}

// Short label used in stats and insight lines, e.g. "WFH" or "home office".
function wfhLabel(userType: string | null): string {
  if (userType === "contractor" || userType === "sole_trader") return "home office";
  return "WFH";
}

// Copy for the next-best-action card when no hours are logged this month.
function wfhActionMsg(userType: string | null): string {
  if (userType === "contractor" || userType === "sole_trader") return "No home office hours logged this month — add them to claim the home office deduction.";
  return "No WFH hours logged this month — add them to claim the work-from-home deduction.";
}

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

  const allowedCategories = (userType ? CATEGORIES_BY_USER_TYPE[userType] : undefined) ?? ACTIVE_CATEGORIES;

  const [allRaw, wfhEntries] = await Promise.all([
    db.deductionCandidate.findMany({
      where:   { userId },
      include: { transaction: true },
      orderBy: { transaction: { date: "desc" } },
    }),
    db.wfhLog.findMany({ where: { userId }, select: { date: true, hours: true } }),
  ]);

  const all = allRaw.filter((c) => allowedCategories.includes(c.category));

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
  const missingEvidence   = all.filter((c) => c.status === "CONFIRMED" && !c.hasEvidence).length;

  const amt = (c: Candidate) => Math.abs(c.transaction.amount);
  const confirmedValue  = all.filter((c) => c.status === "CONFIRMED").reduce((s, c) => s + amt(c), 0);
  const pendingValue    = all.filter((c) => c.status === "NEEDS_REVIEW").reduce((s, c) => s + amt(c), 0);

  // Year-to-date — Australian financial year (1 Jul – 30 Jun)
  const now         = new Date();
  const fyStartYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const fyStart     = `${fyStartYear}-07-01`;
  const fyEnd       = `${fyStartYear + 1}-06-30`;
  const fyLabel     = `FY${String(fyStartYear).slice(2)}–${String(fyStartYear + 1).slice(2)}`;
  const ytd         = all.filter((c) => c.transaction.date >= fyStart && c.transaction.date <= fyEnd);
  const ytdPotential  = ytd.filter((c) => c.status !== "REJECTED").reduce((s, c) => s + amt(c), 0);
  const ytdConfirmed  = ytd.filter((c) => c.status === "CONFIRMED").reduce((s, c) => s + amt(c), 0);

  const { ytdHours, ytdEst, monthHours: wfhMonthHours } = calcWfhSummary(wfhEntries, now);

  const fmt = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

  const isFiltered = category || confidence;

  // Single top-priority nudge: 1) items to review, 2) missing evidence
  const nudge =
    all.length === 0         ? ((userType && EMPTY_STATE[userType]) ?? "Import your bank transactions and Kashio will flag what looks deductible.") :
    totalNeedsReview > 0     ? (pendingValue > 0 ? `${fmt(pendingValue)} in possible ${termPlural(userType)} still to review.` : `${totalNeedsReview} item${totalNeedsReview !== 1 ? "s" : ""} left to review.`) :
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
        <div className="mt-4 flex items-baseline gap-6 text-sm">
          <div>
            <span className={`font-semibold tabular-nums ${totalNeedsReview > 0 ? "text-gray-900 dark:text-gray-100" : "text-gray-400 dark:text-gray-500"}`}>
              {totalNeedsReview}
            </span>
            <span className="ml-1.5 text-gray-400 dark:text-gray-500">to review</span>
          </div>
          <div>
            <span className={`font-semibold tabular-nums ${totalConfirmed > 0 ? "text-gray-900 dark:text-gray-100" : "text-gray-400 dark:text-gray-500"}`}>
              {totalConfirmed}
            </span>
            <span className="ml-1.5 text-gray-400 dark:text-gray-500">
              confirmed{confirmedValue > 0 ? ` · ${fmt(confirmedValue)}` : ""}
            </span>
          </div>
          {ytdHours > 0 && (
            <div>
              <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                {ytdHours}
              </span>
              <span className="ml-1.5 text-gray-400 dark:text-gray-500">
                hrs {wfhLabel(userType)} · ~{fmt(ytdEst)}
              </span>
            </div>
          )}
        </div>
      )}



      {/* Next best action — hidden when filters are active to avoid disagreeing with the visible list */}
      {/* Priority: 1) review items  2) log WFH hours  3) export */}
      {all.length > 0 && !isFiltered && (() => {
        if (totalNeedsReview > 0) return (
          <div className="mt-5 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between gap-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {pendingValue > 0
                ? <>Review {totalNeedsReview} item{totalNeedsReview !== 1 ? "s" : ""} — {fmt(pendingValue)} in possible {termPlural(userType)}.</>
                : <>Review {totalNeedsReview} item{totalNeedsReview !== 1 ? "s" : ""} still waiting.</>
              }
            </p>
            <a href="#needs-review" className="shrink-0 text-sm font-semibold text-violet-600 dark:text-violet-400 hover:underline">
              Start reviewing →
            </a>
          </div>
        );
        if (wfhMonthHours === 0) return (
          <div className="mt-5 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between gap-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {wfhActionMsg(userType)}
            </p>
            <a href="/wfh" className="shrink-0 text-sm font-semibold text-violet-600 dark:text-violet-400 hover:underline">
              Log hours →
            </a>
          </div>
        );
        if (totalConfirmed > 0) return (
          <div className="mt-5 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 px-4 py-3 flex items-center justify-between gap-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {fmt(confirmedValue)} in confirmed {termPlural(userType)} ready to export.
            </p>
            <a href="/export" className="shrink-0 text-sm font-semibold text-violet-600 dark:text-violet-400 hover:underline">
              Export →
            </a>
          </div>
        );
        return null;
      })()}

      {(ytdPotential > 0 || ytdHours > 0) && (
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 tabular-nums">
          {fyLabel}:{ytdPotential > 0 ? ` ${fmt(ytdPotential)} potential` : ""}
          {ytdConfirmed > 0 ? ` · ${fmt(ytdConfirmed)} confirmed` : ""}
          {ytdHours > 0 ? ` · ~${fmt(ytdEst)} ${wfhLabel(userType)}` : ""}
        </p>
      )}

      <div className="mt-6 border-t border-gray-100 dark:border-gray-800" />
      <ReviewFilters categories={allowedCategories} />

      {all.length === 0 ? (
        <div className="mt-10 text-center space-y-1">
          <p className="text-gray-500 dark:text-gray-400">Nothing to review yet.</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            <a href="/import" className="underline hover:text-gray-600 dark:hover:text-gray-300">Import your transactions</a>
            {" "}and Kashio will find your possible {termPlural(userType)}.
          </p>
        </div>
      ) : candidates.length === 0 ? (
        <div className="mt-10 text-center space-y-1">
          <p className="text-gray-500 dark:text-gray-400">No possible {termPlural(userType)} match your filters.</p>
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
