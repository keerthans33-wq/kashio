// ReviewReminder — banner variant, used on Export.
// ReviewReminderInline — quiet text line, used on Import (doesn't compete with the primary flow).
// Priority: review items → log WFH hours → export.

import { db } from "../../../lib/db";
import { requireUserWithType } from "../../../lib/auth";
import { calcWfhSummary } from "../../../lib/wfhSummary";

function termPlural(userType: string | null): string {
  if (userType === "contractor")  return "business expenses";
  if (userType === "sole_trader") return "business deductions";
  return "deductions";
}

function wfhMsg(userType: string | null): string {
  if (userType === "contractor" || userType === "sole_trader") return "No home office hours logged this month — add them to claim the home office deduction.";
  return "No WFH hours logged this month — add them to claim the work-from-home deduction.";
}

export async function ReviewReminder() {
  let userId: string;
  let userType: string | null;
  try {
    ({ id: userId, userType } = await requireUserWithType());
  } catch {
    return null;
  }

  const [candidates, wfhEntries] = await Promise.all([
    db.deductionCandidate.findMany({
      where:  { userId },
      select: { status: true, transaction: { select: { amount: true } } },
    }),
    db.wfhLog.findMany({ where: { userId }, select: { date: true, hours: true } }),
  ]);

  if (candidates.length === 0) return null;

  const toReview  = candidates.filter((c) => c.status === "NEEDS_REVIEW");
  const confirmed = candidates.filter((c) => c.status === "CONFIRMED");
  const { monthHours: wfhMonthHours } = calcWfhSummary(wfhEntries);

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

  const terms = termPlural(userType);

  let message: string;
  let href:    string;
  let cta:     string;

  if (toReview.length > 0) {
    const value = toReview.reduce((s, c) => s + Math.abs(c.transaction.amount), 0);
    message = value > 0
      ? `${fmt(value)} in possible ${terms} still to review.`
      : `${toReview.length} possible ${toReview.length !== 1 ? terms : terms.replace(/s$/, "")} still to review.`;
    href = "/review";
    cta  = "Review now";
  } else if (wfhMonthHours === 0) {
    message = wfhMsg(userType);
    href    = "/wfh";
    cta     = "Log hours";
  } else if (confirmed.length > 0) {
    const value = confirmed.reduce((s, c) => s + Math.abs(c.transaction.amount), 0);
    message = `${fmt(value)} in confirmed ${terms} ready to export.`;
    href = "/export";
    cta  = "Export";
  } else {
    return null;
  }

  return (
    <div style={{ borderBottom: "1px solid var(--bg-border)", backgroundColor: "rgba(5,7,14,0.6)" }}>
      <div className="mx-auto max-w-5xl px-6 py-2 flex items-center justify-between gap-4">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{message}</p>
        <a
          href={href}
          className="shrink-0 text-sm font-medium hover:underline" style={{ color: "#22C55E" }}
        >
          {cta} →
        </a>
      </div>
    </div>
  );
}

// Inline variant — a quiet text line for use on Import where a banner would compete with the page.
export async function ReviewReminderInline() {
  let userId: string;
  let userType: string | null;
  try {
    ({ id: userId, userType } = await requireUserWithType());
  } catch {
    return null;
  }

  const [candidates, wfhEntries] = await Promise.all([
    db.deductionCandidate.findMany({
      where:  { userId },
      select: { status: true, transaction: { select: { amount: true } } },
    }),
    db.wfhLog.findMany({ where: { userId }, select: { date: true, hours: true } }),
  ]);

  if (candidates.length === 0) return null;

  const toReview  = candidates.filter((c) => c.status === "NEEDS_REVIEW");
  const confirmed = candidates.filter((c) => c.status === "CONFIRMED");
  const { monthHours: wfhMonthHours } = calcWfhSummary(wfhEntries);
  const terms = termPlural(userType);
  const fmt   = (n: number) =>
    n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

  let message: string;
  let href: string;

  if (toReview.length > 0) {
    const value = toReview.reduce((s, c) => s + Math.abs(c.transaction.amount), 0);
    message = value > 0
      ? `${fmt(value)} in possible ${terms} still to review.`
      : `${toReview.length} possible ${toReview.length !== 1 ? terms : terms.replace(/s$/, "")} still to review.`;
    href = "/review";
  } else if (wfhMonthHours === 0) {
    message = wfhMsg(userType);
    href    = "/wfh";
  } else if (confirmed.length > 0) {
    const value = confirmed.reduce((s, c) => s + Math.abs(c.transaction.amount), 0);
    message = `${fmt(value)} in confirmed ${terms} ready to export.`;
    href = "/export";
  } else {
    return null;
  }

  return (
    <p className="mt-6 text-sm" style={{ color: "var(--text-muted)" }}>
      {message}{" "}
      <a href={href} className="hover:underline" style={{ color: "#22C55E" }}>
        {href === "/wfh" ? "Log hours" : href === "/export" ? "Go to Export" : "Go to Review"} →
      </a>
    </p>
  );
}
