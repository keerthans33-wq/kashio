import Link from "next/link";
import { db } from "../../../lib/db";
import { requireUserWithType } from "../../../lib/auth";
import { ACTIVE_CATEGORIES, CATEGORIES_BY_USER_TYPE, CATEGORY_PRIORITY_BY_USER_TYPE } from "../../../lib/rules/categories";
import { ReviewFilters } from "./ReviewFilters";
import { ReviewList } from "./ReviewList";
import type { CandidateCardProps } from "./CandidateCard";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/FadeIn";
import { MobileScreen } from "@/components/layout/mobile-screen";

const HEADING: Record<string, string> = {
  employee:    "Work-related deductions",
  contractor:  "Business expenses",
  sole_trader: "Business deductions",
};

const EMPTY_STATE: Record<string, string> = {
  employee:    "Import your bank CSV to see possible deductions.",
  contractor:  "Import your bank CSV to see possible expenses.",
  sole_trader: "Import your bank CSV to see possible deductions.",
};

const DISCLAIMER = "Not tax advice — check with your accountant before lodging.";

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

  const isFiltered = category || confidence;

  return (
    <MobileScreen maxWidth="lg" as="main" padY={false} className="py-8 sm:py-10">

      {/* Header */}
      <FadeIn className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-bold leading-tight tracking-tight" style={{ color: "var(--text-primary)" }}>
            {userType ? HEADING[userType] ?? "Possible deductions" : "Possible deductions"}
          </h1>
          {all.length > 0 && !isFiltered && (() => {
            const parts: React.ReactNode[] = [
              totalNeedsReview > 0 && <span key="review">{totalNeedsReview} to review</span>,
              totalConfirmed   > 0 && <span key="confirmed">{totalConfirmed} confirmed</span>,
            ].filter(Boolean);
            return parts.length > 0 ? (
              <p className="mt-2 text-[14px]" style={{ color: "var(--text-muted)" }}>
                {parts.map((part, i) => (
                  <span key={i}>{i > 0 && " · "}{part}</span>
                ))}
              </p>
            ) : null;
          })()}
          {all.length === 0 && (
            <p className="mt-2 text-[15px]" style={{ color: "var(--text-secondary)" }}>
              {(userType && EMPTY_STATE[userType]) ?? "Import your bank transactions and Kashio will flag what looks deductible."}
            </p>
          )}
        </div>
        {totalConfirmed > 0 && (
          <Button asChild size="sm">
            <Link href="/export">Export →</Link>
          </Button>
        )}
      </FadeIn>

      {/* Progress prompt — hidden when filtered */}
      {all.length > 0 && !isFiltered && (() => {
        if (totalNeedsReview > 0) return (
          <FadeIn delay={0.08}>
            <div
              className="mt-5 rounded-2xl px-5 py-3.5 flex items-center justify-between gap-4"
              style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-border)", boxShadow: "var(--shadow-card)" }}
            >
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {totalNeedsReview} item{totalNeedsReview !== 1 ? "s" : ""} to review
              </p>
              <a href="#needs-review" className="shrink-0 text-sm font-semibold" style={{ color: "#22C55E" }}>
                {totalConfirmed > 0 ? "Continue →" : "Start →"}
              </a>
            </div>
          </FadeIn>
        );

        if (totalConfirmed > 0) return (
          <FadeIn delay={0.08}>
            <div
              className="mt-5 rounded-2xl px-5 py-3.5 flex items-center justify-between gap-4"
              style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-border)", boxShadow: "var(--shadow-card)" }}
            >
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                All {totalConfirmed} {totalConfirmed === 1 ? term(userType) : termPlural(userType)} reviewed.
              </p>
              <Link href="/export" className="shrink-0 text-sm font-semibold" style={{ color: "#22C55E" }}>
                Go to Export →
              </Link>
            </div>
          </FadeIn>
        );

        return null;
      })()}

      {/* Divider + filters */}
      <div className="mt-6 border-t" style={{ borderColor: "var(--bg-border)" }} />
      <ReviewFilters categories={allowedCategories} />

      {/* List */}
      {all.length === 0 ? (
        <div className="mt-10 rounded-2xl px-6 py-10 text-center space-y-3" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-border)" }}>
          <p className="text-[15px] font-medium" style={{ color: "var(--text-secondary)" }}>Nothing to review yet</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            <Link href="/import" className="underline underline-offset-2">Import your bank CSV</Link>
            {" "}to get started.
          </p>
        </div>
      ) : candidates.length === 0 ? (
        <div className="mt-10 rounded-2xl px-6 py-10 text-center space-y-3" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-border)" }}>
          <p className="text-[15px] font-medium" style={{ color: "var(--text-secondary)" }}>No {termPlural(userType)} match these filters</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            <Link href="/review" className="underline underline-offset-2">Clear filters</Link>
            {" "}to see everything.
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
          {DISCLAIMER}
        </p>
      )}
    </MobileScreen>
  );
}
