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
      reason:     `${transaction.normalizedMerchant} sells work and safety clothing. If you bought something required for your job that you can't wear outside of work, you can claim it.`,
      confidenceReason: "This is a specialist workwear store — a strong sign the purchase is work clothing. Not fully certain because the same stores sometimes carry casual items too.",
    };
  }

  const matchedKeyword = KEYWORDS.find((k) => combined.includes(k));
  if (matchedKeyword) {
    return {
      category:   CATEGORIES.WORK_CLOTHING,
      confidence: "LOW",
      reason:     `The description mentions "${matchedKeyword}", which is the kind of item you can claim if it's required for your job. Everyday clothing worn at work doesn't qualify — only gear you couldn't reasonably wear outside of work.`,
      confidenceReason: "The item type suggests work gear, but the store isn't a specialist workwear retailer — harder to be confident without both.",
    };
  }

  return null;
};
