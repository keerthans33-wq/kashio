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
  const keywordMatch  = KEYWORDS.some((k) => descLower.includes(k) || merchant.includes(k));

  if (!merchantMatch && !keywordMatch) return null;

  // Both signals present → stronger evidence it's a work purchase
  if (merchantMatch && keywordMatch) {
    return {
      category:   CATEGORIES.OFFICE_SUPPLIES,
      confidence: "MEDIUM",
      reason:     `${transaction.normalizedMerchant} matches a known retailer and description — confirm if purchased for work`,
    };
  }

  // Only one signal → could still be personal
  return {
    category:   CATEGORIES.OFFICE_SUPPLIES,
    confidence: "LOW",
    reason:     merchantMatch
      ? `${transaction.normalizedMerchant} is an office supply retailer — confirm if purchased for work`
      : `${transaction.normalizedMerchant} description suggests office supplies — confirm if used for work`,
  };
};
