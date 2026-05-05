import Link from "next/link";
import { db } from "../../../lib/db";
import { requireUserWithType } from "../../../lib/auth";
import { fetchUserPlan, isProUser, getReviewLimit } from "../../../lib/plan";
import { ACTIVE_CATEGORIES, CATEGORIES_BY_USER_TYPE, CATEGORY_PRIORITY_BY_USER_TYPE } from "../../../lib/rules/categories";
import { getCategoryMeta, categoryToSlug } from "../../../lib/categorySlug";
import { ReviewFilters } from "./ReviewFilters";
import { ReviewList } from "./ReviewList";
import { ReviewPaywallCard } from "./ReviewPaywallCard";
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
    workPercent:      c.workPercent ?? null,
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

  const [plan, rawAll] = await Promise.all([
    fetchUserPlan(userId),
    db.deductionCandidate.findMany({
      where:   { userId },
      include: { transaction: true },
      orderBy: { transaction: { date: "desc" } },
    }),
  ]);

  const isPro = isProUser(plan);
  const reviewLimit = getReviewLimit(plan);
  const all = rawAll.filter((c) => allowedCategories.includes(c.category));

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

  const allNeedsReview = candidates.filter((c) => c.status === "NEEDS_REVIEW");
  const confirmed      = candidates.filter((c) => c.status === "CONFIRMED");
  const rejected       = candidates.filter((c) => c.status === "REJECTED");

  // Free users see up to reviewLimit NEEDS_REVIEW items; the rest are hidden behind a paywall card.
  const needsReview  = isPro ? allNeedsReview : allNeedsReview.slice(0, reviewLimit);
  const hiddenCount  = isPro ? 0 : Math.max(0, allNeedsReview.length - reviewLimit);
  const hiddenValue  = isPro ? 0 : allNeedsReview
    .slice(reviewLimit)
    .reduce((s, c) => s + Math.abs(c.transaction.amount), 0);

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
          {all.length === 0 && (
            <p className="mt-2 text-[14px]" style={{ color: "var(--text-muted)" }}>
              {(userType && EMPTY_STATE[userType]) ?? "Import your bank CSV to get started."}
            </p>
          )}
        </div>
        {totalConfirmed > 0 && (
          <Button asChild variant="secondary" size="xs">
            <Link href="/export">Export →</Link>
          </Button>
        )}
      </FadeIn>

      {/* Progress card — hidden when filtered */}
      {all.length > 0 && !isFiltered && (() => {
        const total    = all.length;
        const reviewed = all.filter((c) => c.status !== "NEEDS_REVIEW").length;
        const pct      = total > 0 ? Math.round((reviewed / total) * 100) : 0;

        const pendingValue  = all
          .filter((c) => c.status === "NEEDS_REVIEW")
          .reduce((s, c) => s + Math.abs(c.transaction.amount), 0);
        const approxValue = Math.round(pendingValue / 10) * 10;

        if (totalNeedsReview > 0) return (
          <FadeIn delay={0.08}>
            <div
              className="mt-5 rounded-2xl overflow-hidden"
              style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-border)", boxShadow: "var(--shadow-card)" }}
            >
              {/* thin progress bar */}
              <div className="h-[3px] w-full" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                <div
                  className="h-full"
                  style={{ width: `${pct}%`, backgroundColor: "#22C55E", transition: "width 0.4s ease" }}
                />
              </div>
              <div className="px-5 py-3.5 flex items-center justify-between gap-4">
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {reviewed} of {total} reviewed
                  {approxValue > 0 && (
                    <span style={{ color: "var(--text-muted)" }}> · ~${approxValue} still to check</span>
                  )}
                </p>
                <a href="#needs-review" className="shrink-0 text-sm font-semibold" style={{ color: "#22C55E" }}>
                  {reviewed > 0 ? "Continue →" : "Start →"}
                </a>
              </div>
            </div>
          </FadeIn>
        );

        if (totalConfirmed > 0) return (
          <FadeIn delay={0.08}>
            <div
              className="mt-5 rounded-2xl overflow-hidden"
              style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-border)", boxShadow: "var(--shadow-card)" }}
            >
              <div className="h-[3px] w-full" style={{ backgroundColor: "#22C55E", opacity: 0.35 }} />
              <div className="px-5 py-3.5 flex items-center justify-between gap-4">
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  All {total} reviewed
                </p>
                <Link href="/export" className="shrink-0 text-sm font-semibold" style={{ color: "#22C55E" }}>
                  Export →
                </Link>
              </div>
            </div>
          </FadeIn>
        );

        return null;
      })()}

      {/* Category chips — only when there are candidates */}
      {all.length > 0 && (() => {
        const catCounts = new Map<string, { total: number; pending: number }>();
        for (const c of all) {
          const prev = catCounts.get(c.category) ?? { total: 0, pending: 0 };
          catCounts.set(c.category, {
            total:   prev.total + 1,
            pending: prev.pending + (c.status === "NEEDS_REVIEW" ? 1 : 0),
          });
        }
        const cats = allowedCategories.filter((cat) => catCounts.has(cat));
        if (cats.length === 0) return null;
        return (
          <FadeIn delay={0.12} className="mt-5">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {cats.map((cat) => {
                const meta    = getCategoryMeta(cat);
                const counts  = catCounts.get(cat)!;
                const slug    = meta?.slug ?? categoryToSlug(cat);
                const Icon    = meta?.Icon;
                const color   = meta?.color ?? "#22C55E";
                const bg      = meta?.bg ?? "rgba(255,255,255,0.06)";
                const isActive = category === cat;
                return (
                  <Link
                    key={cat}
                    href={`/review/${slug}`}
                    className="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all duration-150"
                    style={{
                      backgroundColor: isActive ? bg : "rgba(255,255,255,0.04)",
                      border:          `1px solid ${isActive ? color + "40" : "rgba(255,255,255,0.06)"}`,
                      color:           isActive ? color : "var(--text-secondary)",
                    }}
                  >
                    {Icon && <Icon size={13} style={{ color: isActive ? color : "var(--text-muted)" }} />}
                    <span>{meta?.label ?? cat}</span>
                    {counts.pending > 0 && (
                      <span
                        className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold"
                        style={{ backgroundColor: color + "25", color }}
                      >
                        {counts.pending}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </FadeIn>
        );
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
          {hiddenCount > 0 && (
            <ReviewPaywallCard hiddenCount={hiddenCount} hiddenValue={hiddenValue} />
          )}
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
