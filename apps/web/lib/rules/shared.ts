// Shared constants used by all detection rules.

// Description patterns that indicate a refund or reversal.
// Rules must check this before matching — refunds are never deductions.
export const EXCLUSION_WORDS = ["refund", "reversal"];

// Returns true if the transaction description suggests a refund or reversal.
export function isExcluded(description: string): boolean {
  const lower = description.toLowerCase();
  return EXCLUSION_WORDS.some((w) => lower.includes(w));
}
