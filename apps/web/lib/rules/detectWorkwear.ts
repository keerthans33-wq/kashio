// Category:   Work Clothing & Uniforms
// Confidence: MEDIUM for known dedicated workwear retailers (strong merchant signal)
//             LOW for keyword-only matches (description could still be personal)
// Detects:    Occupation-specific clothing and protective gear.
//             Conventional clothing (suits, shirts) is NOT deductible
//             under ATO rules and is intentionally excluded.

import type { Rule } from "./types";
import { CATEGORIES } from "./categories";
import { isExcluded } from "./shared";

// Dedicated workwear retailers — specific brand names only.
// Avoid broad substrings like "workwear" or "work wear" that could
// over-match general retailers who happen to stock some PPE.
const MERCHANTS = [
  "hard yakka",
  "king gee",
  "bisley workwear",
  "totally workwear",
  "safe-t-disposable",
  "safety world",
];

// Keywords specific enough to indicate deductible clothing
const KEYWORDS = [
  "uniform",
  "hi-vis",
  "high vis",
  "high-vis",
  "hiviz",
  "steel cap",
  "steel-cap",
  "safety boots",
  "safety vest",
  "hard hat",
  "ppe",
  "protective wear",
  "work boots",
  "chef whites",
  "scrubs",
];

export const detectWorkwear: Rule = (transaction) => {
  if (transaction.amount >= 0) return null;
  if (isExcluded(transaction.description)) return null;

  const merchant = transaction.normalizedMerchant.toLowerCase();
  const desc     = transaction.description.toLowerCase();
  const combined = desc + " " + merchant;

  if (MERCHANTS.some((m) => merchant.includes(m))) {
    return {
      category:   CATEGORIES.WORK_CLOTHING,
      confidence: "MEDIUM",
      reason:     `${transaction.normalizedMerchant} specialises in work and safety clothing. Occupation-specific clothing you can't wear outside work is generally deductible — conventional clothing isn't.`,
    };
  }

  const matchedKeyword = KEYWORDS.find((k) => combined.includes(k));
  if (matchedKeyword) {
    return {
      category:   CATEGORIES.WORK_CLOTHING,
      confidence: "LOW",
      reason:     `${matchedKeyword} is typically deductible as protective or occupation-specific clothing. Everyday clothing — even if worn at work — generally can't be claimed.`,
    };
  }

  return null;
};
