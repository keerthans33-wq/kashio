// Shared constants and helpers used by all detection rules.

// Description patterns that indicate a refund or reversal.
// Rules must check this before matching — refunds are never deductions.
export const EXCLUSION_WORDS = ["refund", "reversal", "reimbursement", "cashback"];

// Returns true if the transaction description suggests a refund or reversal.
export function isExcluded(description: string): boolean {
  const lower = description.toLowerCase();
  return EXCLUSION_WORDS.some((w) => lower.includes(w));
}

// Returns the normalized merchant name as lowercase.
// Use this for merchant-list matching — limits matches to the merchant field
// so a merchant name appearing only in the description doesn't satisfy a merchant signal.
export function merchantText(tx: { normalizedMerchant: string }): string {
  return tx.normalizedMerchant.toLowerCase();
}

// Combines normalized merchant and raw description into one lowercase string.
// Use this for keyword matching only — so keywords are found in either field.
export function combinedText(tx: { normalizedMerchant: string; description: string }): string {
  return `${tx.normalizedMerchant} ${tx.description}`.toLowerCase();
}

// Description patterns that suggest personal rather than work use.
// A match doesn't disqualify the transaction outright, but reduces confidence.
const PERSONAL_WORDS = ["family", "personal", "gift"];

// Returns true if the description contains a personal-use signal.
export function isPersonalUse(description: string): boolean {
  const lower = description.toLowerCase();
  return PERSONAL_WORDS.some((w) => lower.includes(w));
}

// Downgrades confidence by one step. Returns null if already LOW
// (no confidence level below LOW makes sense to surface to the user).
export function downgradeConfidence(
  confidence: "LOW" | "MEDIUM" | "HIGH",
): "LOW" | "MEDIUM" | null {
  if (confidence === "HIGH")   return "MEDIUM";
  if (confidence === "MEDIUM") return "LOW";
  return null;
}
