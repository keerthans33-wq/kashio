// Category:   Office Supplies & Equipment
// Confidence: MEDIUM for known dedicated retailers (strong merchant signal)
//             LOW for keyword-only matches (description could be personal)
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

  if (MERCHANTS.some((m) => merchant.includes(m))) {
    return {
      category:   CATEGORIES.OFFICE_SUPPLIES,
      confidence: "MEDIUM",
      reason:     `${transaction.normalizedMerchant} is an office supply retailer — confirm if purchased for work`,
    };
  }

  if (KEYWORDS.some((k) => descLower.includes(k) || merchant.includes(k))) {
    return {
      category:   CATEGORIES.OFFICE_SUPPLIES,
      confidence: "LOW",
      reason:     `${transaction.normalizedMerchant} description suggests office supplies — confirm if used for work`,
    };
  }

  return null;
};
