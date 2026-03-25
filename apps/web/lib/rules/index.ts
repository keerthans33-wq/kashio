import type { TransactionInput, DeductionMatch, Rule } from "./types";
import { detectSoftware } from "./detectSoftware";
import { detectOfficeSupplies } from "./detectOfficeSupplies";
import { detectWorkEquipment } from "./detectWorkEquipment";

const rules: Rule[] = [
  detectSoftware,
  detectOfficeSupplies,
  detectWorkEquipment,
];

// Confidence rank used to resolve conflicts when multiple rules match.
const CONFIDENCE_RANK: Record<DeductionMatch["confidence"], number> = {
  HIGH:   3,
  MEDIUM: 2,
  LOW:    1,
};

// Runs all rules against a transaction and returns the highest-confidence
// match, or null if nothing matches. Ties go to whichever rule appears
// first in the array above — behaviour is always deterministic.
export function detectDeduction(transaction: TransactionInput): DeductionMatch | null {
  const matches = rules
    .map((rule) => rule(transaction))
    .filter((m): m is DeductionMatch => m !== null);

  if (matches.length === 0) return null;

  return matches.reduce((best, current) =>
    CONFIDENCE_RANK[current.confidence] > CONFIDENCE_RANK[best.confidence] ? current : best,
  );
}

export type { TransactionInput, DeductionMatch };
