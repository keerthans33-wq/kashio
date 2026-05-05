// Scoring weights — total = 100
// Receipts are deliberately excluded: they're optional record-keeping, not a
// prerequisite for lodging. Including them penalised users who had perfectly
// reviewed, categorised transactions but simply hadn't uploaded PDFs yet.
const W_IMPORTED   = 30;
const W_REVIEWED   = 30;
const W_CATEGORIES = 25;
const W_EXPORT     = 15;

// ── Types ──────────────────────────────────────────────────────────────────────

export type ReadinessCandidate = {
  status:   "NEEDS_REVIEW" | "CONFIRMED";
  amount:   number;
  category: string;
};

export type TaxReadinessInput = {
  candidates: ReadinessCandidate[];
  wfhHours:   number;
  // receiptsCount is accepted but ignored — kept for call-site compatibility
  receiptsCount?: number;
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

  // 2. Transactions reviewed (30 pts) — proportion confirmed out of total
  const reviewedScore = candidates.length > 0
    ? Math.round((confirmed.length / candidates.length) * W_REVIEWED)
    : 0;

  // 3. Categories completed (25 pts) — proportion of present categories with ≥1 confirmed
  const presentCategories = new Set(candidates.map((c) => c.category));
  const doneCategories    = new Set(confirmed.map((c)  => c.category));
  const categoriesScore   = presentCategories.size === 0
    ? 0
    : Math.round((doneCategories.size / presentCategories.size) * W_CATEGORIES);

  // 4. Export ready (15 pts) — at least one confirmed claim available to export
  const exportScore = confirmed.length > 0 ? W_EXPORT : 0;

  const score = Math.min(100,
    importedScore + reviewedScore + categoriesScore + exportScore
  );

  // ── Label ────────────────────────────────────────────────────────────────────

  let label: ReadinessLabel;
  if      (score <= 30) label = "Getting started";
  else if (score <= 60) label = "Needs review";
  else if (score <= 85) label = "Almost ready";
  else                  label = "Tax ready";

  // ── Next best action ─────────────────────────────────────────────────────────

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
      categories: { score: categoriesScore, max: W_CATEGORIES },
      export:     { score: exportScore,     max: W_EXPORT     },
    },
  };
}

// ── Display helpers ───────────────────────────────────────────────────────────

export function readinessColor(score: number): string {
  if (score <= 30) return "#F59E0B";
  if (score <= 60) return "#60A5FA";
  return "#22C55E";
}
