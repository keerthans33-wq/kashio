// Category:   Office Supplies & Equipment
// Confidence: MEDIUM
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
  "notebook",
  "ballpoint",
  "whiteboard",
];

export const detectOfficeSupplies: Rule = (transaction) => {
  if (transaction.amount >= 0) return null;
  if (isExcluded(transaction.description)) return null;

  const merchant = transaction.normalizedMerchant.toLowerCase();
  const descLower = transaction.description.toLowerCase();

  const matched =
    MERCHANTS.some((m) => merchant.includes(m)) ||
    KEYWORDS.some((k) => descLower.includes(k) || merchant.includes(k));

  if (!matched) return null;

  return {
    category: CATEGORIES.OFFICE_SUPPLIES,
    confidence: "MEDIUM",
    reason: `${transaction.normalizedMerchant} looks like an office supply purchase — confirm if used for work`,
  };
};
