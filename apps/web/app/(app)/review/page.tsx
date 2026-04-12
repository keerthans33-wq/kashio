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

export const dynamic = "force-dynamic";

function term(userType: string | null): string {
  if (userType === "contractor")  return "business expense";
  if (userType === "sole_trader") return "business deduction";
  return "deduction";
}
function termPlural(userType: string | null): string {
  return `${term(userType)}s`;
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
    const rankDiff = CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence];
    if (rankDiff !== 0) return rankDiff;
    const catDiff = categoryRank(a.category) - categoryRank(b.category);
    if (catDiff !== 0) return catDiff;
    return new Date(b.transaction.date).getTime() - new Date(a.transaction.date).getTime();
  });

  const needsReview = candidates.filter((c) => c.status === "NEEDS_REVIEW");
  const confirmed   = candidates.filter((c) => c.status === "CONFIRMED");
  const rejected    = candidates.filter((c) => c.status === "REJECTED");

  const totalNeedsReview = all.filter((c) => c.status === "NEEDS_REVIEW").length;
  const totalConfirmed   = all.filter((c) => c.status === "CONFIRMED").length;
  const missingEvidence  = all.filter((c) => c.status === "CONFIRMED" && !c.hasEvidence).length;

  const confirmedValue = all
    .filter((c) => c.status === "CONFIRMED")
    .reduce((s, c) => s + Math.abs(c.transaction.amount), 0);

  const pendingValue = all
    .filter((c) => c.status === "NEEDS_REVIEW")
    .reduce((s, c) => s + Math.abs(c.transaction.amount), 0);

  const fmt = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

  const isFiltered = category || confidence;

  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:py-10">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
            {userType ? HEADING[userType] ?? "Possible deductions" : "Possible deductions"}
          </h1>
          {all.length === 0 && (
            <p className="mt-2 text-[15px]" style={{ color: "var(--text-secondary)" }}>
              {(userType && EMPTY_STATE[userType]) ?? "Import your bank transactions and Kashio will flag what looks deductible."}
            </p>
          )}
        </div>
        {totalConfirmed > 0 && (
          <a
            href="/export"
            className="shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
            style={{ background: "linear-gradient(to right, var(--violet-from), var(--violet-to))" }}
          >
            Export →
          </a>
        )}
      </div>

      {/* Progress summary — hidden when filtered */}
      {all.length > 0 && !isFiltered && (() => {
        const parts: React.ReactNode[] = [
          totalNeedsReview > 0 && <span key="review">{totalNeedsReview} to review</span>,
          totalConfirmed > 0 && <span key="confirmed">{totalConfirmed} confirmed</span>,
          confirmedValue > 0 && <span key="value" className="font-semibold" style={{ color: "var(--text-secondary)" }}>{fmt(confirmedValue)}</span>,
        ].filter(Boolean);
        return parts.length > 0 ? (
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            {parts.map((part, i) => (
              <span key={i}>{i > 0 && " · "}{part}</span>
            ))}
          </p>
        ) : null;
      })()}

      {/* Next action — hidden when filtered */}
      {all.length > 0 && !isFiltered && (() => {
        if (totalNeedsReview > 0) return (
          <div className="mt-4 rounded-xl px-4 py-3 flex items-center justify-between gap-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-elevated)" }}>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {totalNeedsReview} item{totalNeedsReview !== 1 ? "s" : ""} left
              {pendingValue > 0 && <> · <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{fmt(pendingValue)}</span></>}
            </p>
            <a href="#needs-review" className="shrink-0 text-sm font-semibold" style={{ color: "var(--violet-from)" }}>
              Continue →
            </a>
          </div>
        );
        if (totalConfirmed > 0) return (
          <div className="mt-4 rounded-xl px-4 py-3 flex items-center justify-between gap-4" style={{ backgroundColor: "rgba(124,58,237,0.08)", border: "1px solid var(--violet-from)" }}>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              All reviewed — ready to export.
            </p>
            <a href="/export" className="shrink-0 text-sm font-semibold" style={{ color: "var(--violet-from)" }}>
              Export →
            </a>
          </div>
        );
        return null;
      })()}

      {/* Divider + filters */}
      <div className="mt-6 border-t" style={{ borderColor: "var(--bg-elevated)" }} />
      <ReviewFilters categories={allowedCategories} />

      {/* List */}
      {all.length === 0 ? (
        <div className="mt-10 text-center space-y-2">
          <p style={{ color: "var(--text-secondary)" }}>Nothing to review yet.</p>
          <p className="text-sm">
            <a href="/import" className="underline" style={{ color: "var(--text-muted)" }}>Import your transactions</a>
            {" "}and Kashio will find your possible {termPlural(userType)}.
          </p>
        </div>
      ) : candidates.length === 0 ? (
        <div className="mt-10 text-center space-y-2">
          <p style={{ color: "var(--text-secondary)" }}>No possible {termPlural(userType)} match your filters.</p>
          <p className="text-sm">
            <a href="/review" className="underline" style={{ color: "var(--text-muted)" }}>Clear all filters</a>{" "}
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
        <p className="mt-10 text-xs" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
          {(userType && DISCLAIMER[userType]) ?? "Kashio helps you spot possible deductions. It's not a tax adviser."}
        </p>
      )}
    </main>
  );
}
