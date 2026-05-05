// Scoring weights
const W_IMPORTED   = 30;
const W_REVIEWED   = 25;
const W_RECEIPTS   = 20;
const W_CATEGORIES = 15;
const W_EXPORT     = 10;

// A confirmed claim must exceed this amount (absolute) to count as "high-value"
const HIGH_VALUE_THRESHOLD = 100;

// ── Types ──────────────────────────────────────────────────────────────────────

export type ReadinessCandidate = {
  status:      "NEEDS_REVIEW" | "CONFIRMED";
  hasEvidence: boolean;
  amount:      number;
  category:    string;
};

export type TaxReadinessInput = {
  candidates:    ReadinessCandidate[];  // already filtered to allowed + non-rejected
  receiptsCount: number;
  wfhHours:      number;
};

export type ReadinessLabel = "Getting started" | "Needs review" | "Almost ready" | "Tax ready";

export type NextAction = {
  text: string;
  sub:  string;
  href: string;
};

export type ReadinessBreakdown = {
  imported:   { score: number; max: number };
  reviewed:   { score: number; max: number };
  receipts:   { score: number; max: number };
  categories: { score: number; max: number };
  export:     { score: number; max: number };
};

export type TaxReadinessResult = {
  score:      number;
  label:      ReadinessLabel;
  nextAction: NextAction | null;
  breakdown:  ReadinessBreakdown;
};

// ── Utility ────────────────────────────────────────────────────────────────────

export function calculateTaxReadiness(input: TaxReadinessInput): TaxReadinessResult {
  const { candidates, wfhHours } = input;

  const confirmed = candidates.filter((c) => c.status === "CONFIRMED");
  const pending   = candidates.filter((c) => c.status === "NEEDS_REVIEW");

  // 1. Transactions imported (30 pts) — binary: any candidates detected?
  const importedScore = candidates.length > 0 ? W_IMPORTED : 0;

  // 2. Claimable transactions reviewed (25 pts) — proportion confirmed
  const reviewedScore = candidates.length > 0
    ? Math.round((confirmed.length / candidates.length) * W_REVIEWED)
    : 0;

  // 3. Receipts for high-value claims (20 pts)
  // "High-value" = confirmed candidates with |amount| >= $100.
  // If there are no high-value claims, the user has nothing to attach → full score.
  // If there are no candidates at all → 0 (no data yet).
  const highValue            = confirmed.filter((c) => Math.abs(c.amount) >= HIGH_VALUE_THRESHOLD);
  const highValueWithReceipt = highValue.filter((c) => c.hasEvidence);
  const receiptsScore =
    candidates.length === 0 ? 0
    : highValue.length  === 0 ? W_RECEIPTS
    : Math.round((highValueWithReceipt.length / highValue.length) * W_RECEIPTS);

  // 4. Categories completed (15 pts) — how many active categories have ≥1 confirmed claim
  const presentCategories = new Set(candidates.map((c) => c.category));
  const doneCategories    = new Set(confirmed.map((c)  => c.category));
  const categoriesScore   = presentCategories.size === 0
    ? 0
    : Math.round((doneCategories.size / presentCategories.size) * W_CATEGORIES);

  // 5. Export ready (10 pts) — at least one confirmed claim available to export
  const exportScore = confirmed.length > 0 ? W_EXPORT : 0;

  const score = Math.min(100,
    importedScore + reviewedScore + receiptsScore + categoriesScore + exportScore
  );

  // ── Label ────────────────────────────────────────────────────────────────────

  let label: ReadinessLabel;
  if      (score <= 30) label = "Getting started";
  else if (score <= 60) label = "Needs review";
  else if (score <= 85) label = "Almost ready";
  else                  label = "Tax ready";

  // ── Next best action ─────────────────────────────────────────────────────────

  const missingHighValue = highValue.length - highValueWithReceipt.length;

  let nextAction: NextAction | null = null;

  if (candidates.length === 0) {
    nextAction = {
      text: "Import your transactions",
      sub:  "Upload your bank CSV to detect deductions",
      href: "/import",
    };
  } else if (pending.length > 0) {
    nextAction = {
      text: "Review your deductions",
      sub:  `${pending.length} transaction${pending.length !== 1 ? "s" : ""} awaiting review`,
      href: "/review",
    };
  } else if (missingHighValue > 0) {
    nextAction = {
      text: "Attach receipts for high-value claims",
      sub:  `${missingHighValue} claim${missingHighValue !== 1 ? "s" : ""} over $${HIGH_VALUE_THRESHOLD} without a receipt`,
      href: "/review",
    };
  } else if (wfhHours === 0) {
    nextAction = {
      text: "Log work-from-home days",
      sub:  "Claim 67¢/hr under the ATO fixed-rate method",
      href: "/wfh",
    };
  } else if (confirmed.length > 0) {
    nextAction = {
      text: "Export your tax summary",
      sub:  "Download a report for your accountant",
      href: "/export",
    };
  }

  return {
    score,
    label,
    nextAction,
    breakdown: {
      imported:   { score: importedScore,   max: W_IMPORTED   },
      reviewed:   { score: reviewedScore,   max: W_REVIEWED   },
      receipts:   { score: receiptsScore,   max: W_RECEIPTS   },
      categories: { score: categoriesScore, max: W_CATEGORIES },
      export:     { score: exportScore,     max: W_EXPORT     },
    },
  };
}

// ── Display helpers ───────────────────────────────────────────────────────────

export function readinessColor(score: number): string {
  if (score <= 30) return "#F59E0B";
  if (score <= 60) return "#60A5FA";
  if (score <= 85) return "#22C55E";
  return "#22C55E";
}
