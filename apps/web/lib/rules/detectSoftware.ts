import type { Rule } from "./types";
import { CATEGORIES } from "./categories";

// Common software subscriptions that are likely work-related.
// Matched against the normalised merchant name (lowercase).
const KNOWN_SOFTWARE = [
  "adobe",
  "canva",
  "dropbox",
  "figma",
  "github",
  "google workspace",
  "microsoft",
  "notion",
  "slack",
  "zoom",
];

// Words in the raw description that indicate a refund or reversal.
// These are not claimable deductions even if the merchant matches.
const EXCLUSION_WORDS = ["refund", "reversal"];

export const detectSoftware: Rule = (transaction) => {
  // Only flag debits — credits, refunds, and reimbursements are not deductions.
  if (transaction.amount >= 0) return null;

  // Skip transactions that look like refunds or reversals.
  const descLower = transaction.description.toLowerCase();
  if (EXCLUSION_WORDS.some((word) => descLower.includes(word))) return null;

  const merchant = transaction.normalizedMerchant.toLowerCase();
  if (KNOWN_SOFTWARE.some((name) => merchant.includes(name))) {
    return {
      category: CATEGORIES.WORK_SOFTWARE,
      confidence: "MEDIUM",
      reason: `${transaction.normalizedMerchant} looks like a software subscription — confirm if used for work`,
    };
  }

  return null;
};
