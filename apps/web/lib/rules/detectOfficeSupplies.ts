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
      reason:     `This looks like a ${matchedKeyword} purchase from ${transaction.normalizedMerchant}. Office supplies you buy for work are deductible — home or personal use doesn't qualify.`,
      confidenceReason: "Both the store and the item type matched — two signals pointing to a work purchase.",
    };
  }

  // Only one signal → could still be personal
  return {
    category:   CATEGORIES.OFFICE_SUPPLIES,
    confidence: "LOW",
    reason:     merchantMatch
      ? `${transaction.normalizedMerchant} is an office supply store. If this was for work — stationery, printer supplies, or similar — you can claim it. Home purchases from the same store don't count.`
      : `The description mentions "${matchedKeyword}". Office supplies bought for work are deductible — if it was for home use, it won't qualify.`,
    confidenceReason: merchantMatch
      ? "Known office store matched, but no specific item in the description — could still be a personal purchase."
      : "Item type matched in the description, but without a recognised office store it's harder to be sure.",
  };
};
