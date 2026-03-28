// Category:   Office Supplies & Equipment
// Confidence: MEDIUM only when a known retailer AND a work-specific keyword both match
//             (e.g. Officeworks + "ink cartridge") — corroborating evidence required.
//             LOW when only one signal is present — could easily be a personal purchase.
// Detects:    Known office supply retailers and consumable keywords

import type { Rule } from "./types";
import { CATEGORIES } from "./categories";
import { isExcluded } from "./shared";

const MERCHANTS = [
  "officeworks",
  "staples",
];

const KEYWORDS = [
  "stationery",
  "office supplies",
  "ink cartridge",
  "toner",
  "printer paper",
];

export const detectOfficeSupplies: Rule = (transaction) => {
  if (transaction.amount >= 0) return null;
  if (isExcluded(transaction.description)) return null;

  const merchant = transaction.normalizedMerchant.toLowerCase();
  const descLower = transaction.description.toLowerCase();

  const merchantMatch = MERCHANTS.some((m) => merchant.includes(m));
  const matchedKeyword = KEYWORDS.find((k) => descLower.includes(k) || merchant.includes(k));

  if (!merchantMatch && !matchedKeyword) return null;

  // Both signals present → stronger evidence it's a work purchase
  if (merchantMatch && matchedKeyword) {
    return {
      category:   CATEGORIES.OFFICE_SUPPLIES,
      confidence: "MEDIUM",
      reason:     `${transaction.normalizedMerchant} purchase that looks like ${matchedKeyword} — office consumables used for work are generally deductible. Personal use doesn't qualify.`,
    };
  }

  // Only one signal → could still be personal
  return {
    category:   CATEGORIES.OFFICE_SUPPLIES,
    confidence: "LOW",
    reason:     merchantMatch
      ? `${transaction.normalizedMerchant} is an office supply retailer. If this was for work stationery or supplies, it's likely deductible — check the receipt to confirm.`
      : `${matchedKeyword} is typically a deductible office expense when used for work. Personal stationery or home printing generally doesn't qualify.`,
  };
};
