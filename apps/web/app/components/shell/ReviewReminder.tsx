// ReviewReminder — banner variant, used on Export.
// ReviewReminderInline — quiet text line, used on Import (doesn't compete with the primary flow).
// Both share the same priority logic: review → receipts → export.

import { db } from "../../../lib/db";
import { requireUserWithType } from "../../../lib/auth";

function termPlural(userType: string | null): string {
  if (userType === "contractor")  return "business expenses";
  if (userType === "sole_trader") return "business deductions";
  return "deductions";
}

export async function ReviewReminder() {
  let userId: string;
  let userType: string | null;
  try {
    ({ id: userId, userType } = await requireUserWithType());
  } catch {
    // Not signed in — nothing to show.
    return null;
  }

  const candidates = await db.deductionCandidate.findMany({
    where:   { userId },
    select:  { status: true, hasEvidence: true, transaction: { select: { amount: true } } },
  });

  if (candidates.length === 0) return null;

  const toReview       = candidates.filter((c) => c.status === "NEEDS_REVIEW");
  const confirmed      = candidates.filter((c) => c.status === "CONFIRMED");
  const missingReceipt = confirmed.filter((c) => !c.hasEvidence);

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
  } else if (missingReceipt.length > 0) {
    message = `${missingReceipt.length} confirmed item${missingReceipt.length !== 1 ? "s" : ""} still need${missingReceipt.length === 1 ? "s" : ""} a receipt.`;
    href = "/review";
    cta  = "Add receipts";
  } else if (confirmed.length > 0) {
    const value = confirmed.reduce((s, c) => s + Math.abs(c.transaction.amount), 0);
    message = `${fmt(value)} in confirmed ${terms} ready to export.`;
    href = "/export";
    cta  = "Export";
  } else {
    return null;
  }

  return (
    <div className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-5xl px-6 py-2 flex items-center justify-between gap-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
        <a
          href={href}
          className="shrink-0 text-sm font-medium text-violet-600 dark:text-violet-400 hover:underline"
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

  const candidates = await db.deductionCandidate.findMany({
    where:   { userId },
    select:  { status: true, hasEvidence: true, transaction: { select: { amount: true } } },
  });

  if (candidates.length === 0) return null;

  const toReview       = candidates.filter((c) => c.status === "NEEDS_REVIEW");
  const confirmed      = candidates.filter((c) => c.status === "CONFIRMED");
  const missingReceipt = confirmed.filter((c) => !c.hasEvidence);
  const terms          = termPlural(userType);
  const fmt            = (n: number) =>
    n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

  let message: string;
  let href: string;

  if (toReview.length > 0) {
    const value = toReview.reduce((s, c) => s + Math.abs(c.transaction.amount), 0);
    message = value > 0
      ? `${fmt(value)} in possible ${terms} still to review.`
      : `${toReview.length} possible ${toReview.length !== 1 ? terms : terms.replace(/s$/, "")} still to review.`;
    href = "/review";
  } else if (missingReceipt.length > 0) {
    message = `${missingReceipt.length} confirmed item${missingReceipt.length !== 1 ? "s" : ""} still need${missingReceipt.length === 1 ? "s" : ""} a receipt.`;
    href = "/review";
  } else if (confirmed.length > 0) {
    const value = confirmed.reduce((s, c) => s + Math.abs(c.transaction.amount), 0);
    message = `${fmt(value)} in confirmed ${terms} ready to export.`;
    href = "/export";
  } else {
    return null;
  }

  return (
    <p className="mt-6 text-sm text-gray-400 dark:text-gray-500">
      {message}{" "}
      <a href={href} className="text-violet-600 dark:text-violet-400 hover:underline">
        Go to {href === "/export" ? "Export" : "Review"} →
      </a>
    </p>
  );
}
