// Category:   Office Supplies & Equipment
// Confidence: LOW — all items here are consumer-heavy enough that a keyword
//             match alone is never strong evidence. Description matches are
//             slightly more informative than merchant-name matches, so the
//             reason text distinguishes between them, but confidence stays LOW
//             in both cases.
// Detects:    Work-equipment keywords in description or merchant name

import type { Rule } from "./types";
import { CATEGORIES } from "./categories";
import { isExcluded } from "./shared";

// Items with meaningful work use but also common in personal/gaming contexts.
// Intentionally excludes laptop, headset, and desk lamp (too consumer-heavy).
const KEYWORDS = [
  "docking station",  // strongest signal — rarely personal
  "standing desk",    // home-office furniture, still needs confirmation
  "usb hub",          // mostly work, occasionally personal
  "webcam",           // work or streaming — needs confirmation
  "hard drive",       // work backup or personal storage — needs confirmation
  "monitor",          // work or gaming — needs confirmation
  "keyboard",         // work or gaming — needs confirmation
];

export const detectWorkEquipment: Rule = (transaction) => {
  if (transaction.amount >= 0) return null;
  if (isExcluded(transaction.description)) return null;

  const desc     = transaction.description.toLowerCase();
  const merchant = transaction.normalizedMerchant.toLowerCase();

  const matchedInDesc     = KEYWORDS.find((k) => desc.includes(k));
  const matchedInMerchant = KEYWORDS.find((k) => merchant.includes(k));

  if (!matchedInDesc && !matchedInMerchant) return null;

  return {
    category:   CATEGORIES.OFFICE_SUPPLIES,
    confidence: "LOW",
    reason: matchedInDesc
      ? `Description includes "${matchedInDesc}" — check if this was purchased for work use`
      : `Merchant name includes "${matchedInMerchant}" — check if this purchase was work-related`,
  };
};
