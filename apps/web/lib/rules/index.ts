import type { TransactionInput, DeductionMatch, Rule } from "./types";
import { detectSoftware } from "./detectSoftware";

// All active rules. Add new rules here to include them in detection.
const rules: Rule[] = [
  detectSoftware,
];

// Runs each rule in order and returns the first match, or null if none match.
// Rules are deterministic — same transaction always produces the same result.
export function detectDeduction(transaction: TransactionInput): DeductionMatch | null {
  for (const rule of rules) {
    const match = rule(transaction);
    if (match) return match;
  }
  return null;
}

export type { TransactionInput, DeductionMatch };
