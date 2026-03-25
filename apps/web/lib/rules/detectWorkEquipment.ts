// Category:   Office Supplies & Equipment
// Confidence: LOW
// Detects:    Hardware/equipment keywords in description or merchant

import type { Rule } from "./types";
import { CATEGORIES } from "./categories";
import { isExcluded } from "./shared";

const KEYWORDS = [
  "monitor",
  "keyboard",
  "webcam",
  "hard drive",
  "usb hub",
  "standing desk",
  "docking station",
];

export const detectWorkEquipment: Rule = (transaction) => {
  if (transaction.amount >= 0) return null;
  if (isExcluded(transaction.description)) return null;

  const combined =
    transaction.description.toLowerCase() + " " +
    transaction.normalizedMerchant.toLowerCase();

  if (!KEYWORDS.some((k) => combined.includes(k))) return null;

  return {
    category: CATEGORIES.OFFICE_SUPPLIES,
    confidence: "LOW",
    reason: `${transaction.normalizedMerchant} may include work equipment — confirm if purchased for work use`,
  };
};
