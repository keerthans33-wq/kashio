import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "../../../../lib/db";
import { requireUserWithType } from "../../../../lib/auth";
import { CATEGORIES_BY_USER_TYPE, ACTIVE_CATEGORIES } from "../../../../lib/rules/categories";
import { getMetaBySlug } from "../../../../lib/categorySlug";
import { ReviewList } from "../ReviewList";
import type { CandidateCardProps } from "../CandidateCard";
import { FadeIn } from "@/components/motion/FadeIn";
import { MobileScreen } from "@/components/layout/mobile-screen";

export const dynamic = "force-dynamic";

const DISCLAIMER = "Not tax advice — check with your accountant before lodging.";

function toCardProps(c: {
  id: string; status: "NEEDS_REVIEW" | "CONFIRMED" | "REJECTED";
  confidence: "LOW" | "MEDIUM" | "HIGH"; category: string;
  reason: string; confidenceReason: string | null; mixedUse: boolean;
  hasEvidence: boolean; evidenceNote: string | null; workPercent: number | null;
  transaction: { normalizedMerchant: string; amount: number; date: string; description: string };
}, userType: string | null): CandidateCardProps {
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

type Props = { params: Promise<{ category: string }> };

export default async function CategoryReview({ params }: Props) {
  const [{ id: userId, userType }, { category: slug }] = await Promise.all([
    requireUserWithType(),
    params,
  ]);

  const meta = getMetaBySlug(slug);
  if (!meta) notFound();

  const allowedCategories = (userType ? CATEGORIES_BY_USER_TYPE[userType] : undefined) ?? ACTIVE_CATEGORIES;
  if (!allowedCategories.includes(meta.category)) notFound();

  const all = await db.deductionCandidate.findMany({
    where:   { userId, category: meta.category },
    include: { transaction: true },
    orderBy: { transaction: { date: "desc" } },
  });

  const needsReview = all.filter((c) => c.status === "NEEDS_REVIEW");
  const confirmed   = all.filter((c) => c.status === "CONFIRMED");
  const rejected    = all.filter((c) => c.status === "REJECTED");

  const totalAmount    = all.reduce((s, c) => s + Math.abs(c.transaction.amount), 0);
  const reviewedCount  = confirmed.length + rejected.length;
  const missingReceipts = confirmed.filter((c) => !c.hasEvidence).length;

  const { Icon, color, bg, label } = meta;

  return (
    <MobileScreen maxWidth="lg" as="main" padY={false} className="py-8 sm:py-10">

      {/* Back link */}
      <FadeIn>
        <Link
          href="/review"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors duration-150 mb-5"
          style={{ color: "var(--text-muted)" }}
        >
          ← All categories
        </Link>
      </FadeIn>

      {/* Header */}
      <FadeIn delay={0.04}>
        <div className="flex items-center gap-3 mb-6">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: bg }}
          >
            <Icon size={20} style={{ color }} />
          </div>
          <h1
            className="text-[26px] font-bold leading-tight tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {label}
          </h1>
        </div>
      </FadeIn>

      {/* Stats row */}
      {all.length > 0 && (
        <FadeIn delay={0.08}>
          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
          >
            {[
              { label: "Potential amount",   value: `$${totalAmount.toFixed(2)}`,    accent: color },
              { label: "Transactions",       value: String(all.length),              accent: null  },
              { label: "Reviewed",           value: `${reviewedCount} / ${all.length}`, accent: null },
              { label: "Missing receipts",   value: String(missingReceipts),         accent: missingReceipts > 0 ? "#F59E0B" : null },
            ].map(({ label: lbl, value, accent }) => (
              <div
                key={lbl}
                className="rounded-2xl px-4 py-3.5"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border:          "1px solid var(--bg-border)",
                  boxShadow:       "var(--shadow-card)",
                }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
                  {lbl}
                </p>
                <p
                  className="text-[22px] font-bold leading-none tabular-nums"
                  style={{ color: accent ?? "var(--text-primary)" }}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
        </FadeIn>
      )}

      {/* Empty state */}
      {all.length === 0 ? (
        <FadeIn delay={0.08}>
          <div
            className="rounded-2xl px-6 py-10 text-center space-y-3"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-border)" }}
          >
            <p className="text-[15px] font-medium" style={{ color: "var(--text-secondary)" }}>
              No {label.toLowerCase()} transactions yet
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              <Link href="/import" className="underline underline-offset-2">Import your bank CSV</Link>
              {" "}to detect potential deductions.
            </p>
          </div>
        </FadeIn>
      ) : (
        <FadeIn delay={0.12}>
          <ReviewList
            needsReview={needsReview.map((c) => toCardProps(c, userType))}
            confirmed={confirmed.map((c) => toCardProps(c, userType))}
            rejected={rejected.map((c) => toCardProps(c, userType))}
            missingEvidence={missingReceipts}
          />
        </FadeIn>
      )}

      {all.length > 0 && (
        <p className="mt-10 text-xs" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
          {DISCLAIMER}
        </p>
      )}

    </MobileScreen>
  );
}
