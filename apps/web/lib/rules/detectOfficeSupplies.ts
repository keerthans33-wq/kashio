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
      reason:     `Purchased at ${transaction.normalizedMerchant} and description includes "${matchedKeyword}" — looks like it could be a work purchase`,
    };
  }

  // Only one signal → could still be personal
  return {
    category:   CATEGORIES.OFFICE_SUPPLIES,
    confidence: "LOW",
    reason:     merchantMatch
      ? `${transaction.normalizedMerchant} is a known office supply retailer — check if this was purchased for work`
      : `Description includes "${matchedKeyword}" — check if this was purchased for work`,
  };
};
