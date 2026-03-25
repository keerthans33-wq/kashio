// Category:   Work Software & Tools
// Confidence: MEDIUM
// Detects:    Known software subscription merchants

import type { Rule } from "./types";
import { CATEGORIES } from "./categories";
import { isExcluded } from "./shared";

const MERCHANTS = [
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
  if (transaction.amount >= 0) return null;
  if (isExcluded(transaction.description)) return null;

  const merchant = transaction.normalizedMerchant.toLowerCase();
  if (!MERCHANTS.some((m) => merchant.includes(m))) return null;

  return {
    category: CATEGORIES.WORK_SOFTWARE,
    confidence: "MEDIUM",
    reason: `${transaction.normalizedMerchant} looks like a software subscription — confirm if used for work`,
  };
};
