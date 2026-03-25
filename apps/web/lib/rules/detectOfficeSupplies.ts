import type { Rule } from "./types";
import { CATEGORIES } from "./categories";

// Known office supply retailers.
const SUPPLY_MERCHANTS = [
  "officeworks",
  "staples",
];

// Keywords in the description that suggest office consumables.
const SUPPLY_KEYWORDS = [
  "stationery",
  "office supplies",
  "ink cartridge",
  "toner",
  "printer paper",
  "notebook",
  "ballpoint",
  "whiteboard",
];

const EXCLUSION_WORDS = ["refund", "reversal"];

export const detectOfficeSupplies: Rule = (transaction) => {
  // Debits only — refunds are not deductions.
  if (transaction.amount >= 0) return null;

  const descLower = transaction.description.toLowerCase();
  if (EXCLUSION_WORDS.some((w) => descLower.includes(w))) return null;

  const merchant = transaction.normalizedMerchant.toLowerCase();

  const merchantMatch = SUPPLY_MERCHANTS.some((m) => merchant.includes(m));
  const keywordMatch = SUPPLY_KEYWORDS.some(
    (k) => descLower.includes(k) || merchant.includes(k),
  );

  if (merchantMatch || keywordMatch) {
    return {
      category: CATEGORIES.OFFICE_SUPPLIES,
      confidence: "MEDIUM",
      reason: `${transaction.normalizedMerchant} looks like an office supply purchase — confirm if used for work`,
    };
  }

  return null;
};
