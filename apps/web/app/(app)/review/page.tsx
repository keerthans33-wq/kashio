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
  const totalRejected    = all.filter((c) => c.status === "REJECTED").length;
  const totalExportReady = all.filter((c) => c.status === "CONFIRMED" && c.hasEvidence).length;

  // Dollar values — always from unfiltered set
  const amt = (c: Candidate) => Math.abs(c.transaction.amount);
  const potentialValue       = all.filter((c) => c.status !== "REJECTED").reduce((s, c) => s + amt(c), 0);
  const confirmedValue       = all.filter((c) => c.status === "CONFIRMED").reduce((s, c) => s + amt(c), 0);
  const needsReviewValue     = all.filter((c) => c.status === "NEEDS_REVIEW").reduce((s, c) => s + amt(c), 0);
  const missingEvidenceValue = all.filter((c) => c.status === "CONFIRMED" && !c.hasEvidence).reduce((s, c) => s + amt(c), 0);
  const fmt = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

  // Tax readiness score (0–100)
  // Two equal components: review completion + evidence completion
  const reviewPct   = all.length > 0 ? (totalConfirmed + totalRejected) / all.length : 0;
  const evidencePct = totalConfirmed > 0
    ? totalExportReady / totalConfirmed
    : totalNeedsReview === 0 && all.length > 0 ? 1 : 0;
  const readinessScore = Math.round((reviewPct * 0.5 + evidencePct * 0.5) * 100);
  const readinessLabel =
    readinessScore === 100 ? "Ready to export"  :
    readinessScore >= 75  ? "Almost ready"      :
    readinessScore >= 40  ? "In progress"       :
    readinessScore >  0   ? "Getting started"   : "Not started";
  const readinessColor =
    readinessScore === 100 ? { bar: "bg-green-500",  badge: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" } :
    readinessScore >= 75  ? { bar: "bg-violet-500", badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" } :
    readinessScore >= 40  ? { bar: "bg-amber-400",  badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" } :
                            { bar: "bg-gray-300",   badge: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400" };

  // Category breakdown — potential (non-rejected) and confirmed per category
  const categoryMap = new Map<string, { potential: number; confirmed: number }>();
  for (const c of all) {
    if (c.status === "REJECTED") continue;
    const entry = categoryMap.get(c.category) ?? { potential: 0, confirmed: 0 };
    entry.potential += amt(c);
    if (c.status === "CONFIRMED") entry.confirmed += amt(c);
    categoryMap.set(c.category, entry);
  }
  const categoryBreakdown = [...categoryMap.entries()]
    .sort((a, b) => b[1].potential - a[1].potential)
    .map(([category, totals]) => ({ category, ...totals }));

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
        These are the transactions Kashio flagged as possible deductions. Confirm the ones that were genuinely work-related and reject the rest.
      </p>
      <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
        Once you've reviewed everything, go to Export to download your confirmed deductions.
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

      {all.length > 0 && (
        <div className="mt-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Tax readiness</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${readinessColor.badge}`}>
              {readinessLabel}
            </span>
          </div>
          <div className="mt-2.5 h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700">
            <div
              className={`h-2 rounded-full transition-all ${readinessColor.bar}`}
              style={{ width: `${readinessScore}%` }}
            />
          </div>
          <div className="mt-2 flex gap-4 text-xs text-gray-400 dark:text-gray-500">
            <span>Review <span className="font-medium text-gray-600 dark:text-gray-300">{Math.round(reviewPct * 100)}%</span></span>
            <span>Evidence <span className="font-medium text-gray-600 dark:text-gray-300">{Math.round(evidencePct * 100)}%</span></span>
          </div>
        </div>
      )}

      {categoryBreakdown.length > 0 && (
        <div className="mt-3 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
          {categoryBreakdown.map(({ category, potential, confirmed: conf }) => (
            <div key={category} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="flex-1 truncate text-sm text-gray-700 dark:text-gray-300">{category}</span>
              <div className="flex items-center gap-2 shrink-0 tabular-nums">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{fmt(potential)}</span>
                {conf > 0 && (
                  <span className="text-xs text-green-600 dark:text-green-400">({fmt(conf)} confirmed)</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Needs Review</p>
          <p className="mt-1 text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100">{totalNeedsReview}</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 sm:px-4 sm:py-3 dark:border-green-800 dark:bg-green-900/20">
          <p className="text-xs font-medium uppercase tracking-wide text-green-600 dark:text-green-400">Confirmed</p>
          <p className="mt-1 text-xl sm:text-2xl font-semibold text-green-700 dark:text-green-400">{totalConfirmed}</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 sm:px-4 sm:py-3 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-xs font-medium uppercase tracking-wide text-red-500 dark:text-red-400">Rejected</p>
          <p className="mt-1 text-xl sm:text-2xl font-semibold text-red-600 dark:text-red-400">{totalRejected}</p>
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
        return (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
            {/* Row 1: needs review */}
            <div className="flex items-center gap-3 px-4 py-3">
              {totalNeedsReview === 0
                ? <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600 text-xs dark:bg-green-900/40 dark:text-green-400">✓</span>
                : <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 text-xs font-bold dark:bg-amber-900/40 dark:text-amber-400">!</span>
              }
              <span className={`flex-1 text-sm ${totalNeedsReview === 0 ? "text-gray-400 dark:text-gray-500" : "text-gray-700 dark:text-gray-300"}`}>
                {totalNeedsReview === 0
                  ? "All items reviewed"
                  : <>{totalNeedsReview} item{totalNeedsReview !== 1 ? "s" : ""} still to review</>
                }
              </span>
              {totalNeedsReview > 0 && (
                <span className="shrink-0 text-xs font-medium tabular-nums text-violet-600 dark:text-violet-400">
                  {fmt(needsReviewValue)}
                </span>
              )}
            </div>

            {/* Row 2: missing evidence */}
            <div className="flex items-center gap-3 px-4 py-3">
              {missingEvidence === 0
                ? <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600 text-xs dark:bg-green-900/40 dark:text-green-400">✓</span>
                : <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 text-xs font-bold dark:bg-amber-900/40 dark:text-amber-400">!</span>
              }
              <span className={`flex-1 text-sm ${missingEvidence === 0 ? "text-gray-400 dark:text-gray-500" : "text-gray-700 dark:text-gray-300"}`}>
                {totalConfirmed === 0
                  ? "No confirmed items yet"
                  : missingEvidence === 0
                  ? "Evidence collected for all confirmed items"
                  : <>{missingEvidence} confirmed item{missingEvidence !== 1 ? "s" : ""} missing evidence</>
                }
              </span>
              {missingEvidence > 0 && (
                <span className="shrink-0 text-xs font-medium tabular-nums text-amber-600 dark:text-amber-400">
                  {fmt(missingEvidenceValue)}
                </span>
              )}
            </div>

            {/* Row 3: ready for export */}
            <div className="flex items-center gap-3 px-4 py-3">
              {totalExportReady > 0
                ? <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600 text-xs dark:bg-green-900/40 dark:text-green-400">✓</span>
                : <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400 text-xs dark:bg-gray-700 dark:text-gray-500">–</span>
              }
              <span className={`flex-1 text-sm ${totalExportReady === 0 ? "text-gray-400 dark:text-gray-500" : "text-gray-700 dark:text-gray-300"}`}>
                {totalExportReady === 0
                  ? "No items ready to export yet"
                  : <>{totalExportReady} item{totalExportReady !== 1 ? "s" : ""} ready for export</>
                }
              </span>
              {totalExportReady > 0 && (
                <a href="/export" className="shrink-0 text-xs font-medium text-violet-600 hover:underline dark:text-violet-400">
                  Export →
                </a>
              )}
            </div>
          </div>
        );
      })()}

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
