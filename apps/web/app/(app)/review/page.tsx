import { db } from "../../../lib/db";
import { requireUserWithType } from "../../../lib/auth";
import { ReviewCenter } from "./ReviewCenter";
import { MobileScreen } from "@/components/layout/mobile-screen";
import { FadeIn } from "@/components/motion/FadeIn";

export const dynamic = "force-dynamic";

export default async function Review() {
  const { id: userId } = await requireUserWithType();

  const rawAll = await db.deductionCandidate.findMany({
    where:   { userId },
    include: { transaction: true },
    orderBy: { transaction: { date: "desc" } },
  });

  const candidates = rawAll.map((c) => ({
    id:              c.id,
    status:          c.status as "NEEDS_REVIEW" | "CONFIRMED" | "REJECTED" | "MAYBE",
    suggestionLevel: c.suggestionLevel as "LIKELY_WORK_RELATED" | "POSSIBLE_WORK_RELATED" | "PROBABLY_PERSONAL",
    confidence:      c.confidence as "LOW" | "MEDIUM" | "HIGH",
    category:        c.category,
    reason:          c.reason,
    confidenceReason: c.confidenceReason ?? undefined,
    mixedUse:        c.mixedUse,
    hasEvidence:     c.hasEvidence,
    evidenceNote:    c.evidenceNote ?? null,
    workPercent:     c.workPercent ?? null,
    score:           c.score,
    transaction: {
      normalizedMerchant: c.transaction.normalizedMerchant,
      amount:             c.transaction.amount,
      date:               c.transaction.date,
      description:        c.transaction.description,
    },
  }));

  return (
    <MobileScreen maxWidth="xl" as="main" padY={false} className="py-3 sm:py-10">
      <FadeIn>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight mb-1" style={{ color: "var(--text-primary)" }}>
          Review Transactions
        </h1>
        <p className="text-[13px] mb-6" style={{ color: "var(--text-muted)" }}>
          Kashio suggests potentially claimable transactions. You decide what to claim.
        </p>
      </FadeIn>
      <ReviewCenter candidates={candidates} />
    </MobileScreen>
  );
}
