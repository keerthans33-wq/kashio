import type { Rule } from "./types";
import { CATEGORIES } from "./categories";

// Hardware keywords that suggest a work equipment purchase.
// Checked against both the raw description and normalised merchant name.
const EQUIPMENT_KEYWORDS = [
  "monitor",
  "keyboard",
  "webcam",
  "headset",
  "laptop",
  "hard drive",
  "usb hub",
  "standing desk",
  "desk lamp",
  "docking station",
];

const EXCLUSION_WORDS = ["refund", "reversal"];

export const detectWorkEquipment: Rule = (transaction) => {
  // Debits only — refunds are not deductions.
  if (transaction.amount >= 0) return null;

  const descLower = transaction.description.toLowerCase();
  if (EXCLUSION_WORDS.some((w) => descLower.includes(w))) return null;

  const merchant = transaction.normalizedMerchant.toLowerCase();
  const combined = `${descLower} ${merchant}`;

  if (EQUIPMENT_KEYWORDS.some((k) => combined.includes(k))) {
    return {
      category: CATEGORIES.OFFICE_SUPPLIES,
      confidence: "LOW",
      reason: `${transaction.normalizedMerchant} may include work equipment — confirm if purchased for work use`,
    };
  }

  return null;
};
