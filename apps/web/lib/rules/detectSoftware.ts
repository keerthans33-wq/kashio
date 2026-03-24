import type { Rule } from "./types";

// Common software subscriptions used for work.
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

export const detectSoftware: Rule = (transaction) => {
  const merchant = transaction.normalizedMerchant.toLowerCase();

  if (KNOWN_SOFTWARE.some((name) => merchant.includes(name))) {
    return {
      category: "Work Software & Tools",
      confidence: "MEDIUM",
      reason: `${transaction.normalizedMerchant} looks like a software subscription — confirm if used for work`,
    };
  }

  return null;
};
