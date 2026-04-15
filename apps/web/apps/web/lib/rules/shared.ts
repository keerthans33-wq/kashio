// Shared constants and helpers used by all detection rules.

type TxText = { normalizedMerchant: string; description: string };

// Patterns that indicate a refund, reversal, or offset — never a deduction.
// Checked against both the merchant name and description.
export const EXCLUSION_WORDS = ["refund", "reversal", "reimbursement", "cashback"];

// Returns true if the transaction looks like a refund or reversal.
export function isExcluded(tx: TxText): boolean {
  const text = `${tx.normalizedMerchant} ${tx.description}`.toLowerCase();
  return EXCLUSION_WORDS.some((w) => text.includes(w));
}

// Returns the normalized merchant name as lowercase.
// Use this for merchant-list matching — limits matches to the merchant field
// so a merchant name appearing only in the description doesn't satisfy a merchant signal.
export function merchantText(tx: { normalizedMerchant: string }): string {
  return tx.normalizedMerchant.toLowerCase();
}

// Safe merchant substring match.
// Names of 4 characters or fewer require a word boundary to avoid false matches
// (e.g. "bp" inside "ubp", "ola" inside "motorola", "tpg" inside "tpgi").
export function matchesMerchant(merchantLower: string, name: string): boolean {
  if (name.length <= 4) {
    return new RegExp(`(?:^|[^a-z0-9])${name}(?:[^a-z0-9]|$)`).test(merchantLower);
  }
  return merchantLower.includes(name);
}

// Combines normalized merchant and raw description into one lowercase string.
// Use this for keyword matching only — so keywords are found in either field.
export function combinedText(tx: TxText): string {
  return `${tx.normalizedMerchant} ${tx.description}`.toLowerCase();
}

// Patterns that suggest personal rather than work use.
// A match reduces confidence by one step rather than excluding outright.
//
// "gift" uses substring matching — "gifted" is fine to catch.
// "family" and "personal" require word boundaries to avoid matching
// "familiar", "familiarity", "interpersonal", etc.
const PERSONAL_WORDS_SUBSTRING = ["gift"];
const PERSONAL_WORDS_WHOLE     = ["family", "personal"];

function matchesWholeWord(text: string, word: string): boolean {
  return new RegExp(`(?:^|[^a-z])${word}(?:[^a-z]|$)`).test(text);
}

// Returns true if the transaction contains a personal-use signal.
// Checked against both the merchant name and description.
export function isPersonalUse(tx: TxText): boolean {
  const text = combinedText(tx);
  if (PERSONAL_WORDS_SUBSTRING.some((w) => text.includes(w))) return true;
  return PERSONAL_WORDS_WHOLE.some((w) => matchesWholeWord(text, w));
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
