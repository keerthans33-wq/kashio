// Category:   Work Clothing & Uniforms
// Confidence: MEDIUM for known workwear merchants and specific keywords,
//             LOW for general clothing stores with a workwear keyword.
// Detects:    Occupation-specific clothing and protective gear.
//             Conventional clothing (suits, shirts) is NOT deductible
//             under ATO rules and is intentionally excluded.

import type { Rule } from "./types";
import { CATEGORIES } from "./categories";
import { isExcluded } from "./shared";

// Dedicated workwear retailers — purchase is almost certainly work clothing
const MERCHANTS = [
  "hard yakka",
  "king gee",
  "bisley",
  "workwear",
  "work wear",
  "tradie",
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
      reason:     `${transaction.normalizedMerchant} is a workwear retailer — confirm if purchased for work use`,
    };
  }

  if (KEYWORDS.some((k) => combined.includes(k))) {
    return {
      category:   CATEGORIES.WORK_CLOTHING,
      confidence: "MEDIUM",
      reason:     `${transaction.normalizedMerchant} description suggests work clothing — confirm if deductible`,
    };
  }

  return null;
};
