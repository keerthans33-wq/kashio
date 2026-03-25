import type { TransactionInput, DeductionMatch, Rule } from "./types";
import { detectSoftware } from "./detectSoftware";
import { detectOfficeSupplies } from "./detectOfficeSupplies";
import { detectWorkEquipment } from "./detectWorkEquipment";

// All active rules, checked in order.
// IMPORTANT: the engine returns the FIRST match only — one candidate per transaction.
// Place more specific rules before broader ones to avoid the wrong rule winning.
const rules: Rule[] = [
  detectSoftware,        // merchant list match — most precise
  detectOfficeSupplies,  // known retailers + consumable keywords
  detectWorkEquipment,   // hardware keywords in description — broadest
];

// Runs each rule in order and returns the first match, or null if none match.
// Deterministic — same transaction always produces the same result.
export function detectDeduction(transaction: TransactionInput): DeductionMatch | null {
  for (const rule of rules) {
    const match = rule(transaction);
    if (match) return match;
  }
  return null;
}

export type { TransactionInput, DeductionMatch };
