// Category:   Work Clothing
// Confidence: HIGH for specialist workwear retailer AND a workwear keyword (strong double signal)
//             MEDIUM for specialist retailer alone
//             LOW for keyword-only matches
// ATO note:   Conventional clothing is NOT deductible. Only occupation-specific
//             gear that can't reasonably be worn outside of work qualifies.

import type { Rule, RawMatch, Explanation } from "./types";
import { CATEGORIES } from "./categories";
import { merchantText, combinedText } from "./shared";

const MERCHANTS = [
  "hard yakka",
  "king gee",
  "bisley workwear",
  "totally workwear",
  "safe-t-disposable",
  "safety world",
];

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

function detect(tx: { normalizedMerchant: string; description: string }): RawMatch | null {
  const combined = combinedText(tx);

  const merchantMatch = MERCHANTS.some((m) => merchantText(tx).includes(m));
  const keyword       = KEYWORDS.find((k) => combined.includes(k));

  if (!merchantMatch && !keyword) return null;

  return {
    category:   CATEGORIES.WORK_CLOTHING,
    confidence: merchantMatch && keyword ? "HIGH" : merchantMatch ? "MEDIUM" : "LOW",
    signals:    { merchantMatch, keyword },
  };
}

function explain(match: RawMatch, tx: { normalizedMerchant: string }): Explanation {
  const { merchantMatch, keyword } = match.signals;

  if (merchantMatch && keyword) {
    return {
      reason:           `${typeof keyword === "string" ? keyword.charAt(0).toUpperCase() + keyword.slice(1) : "Workwear"} from ${tx.normalizedMerchant} is deductible if it's required for your job. The test: could you wear it as everyday clothing? If not, you can claim it.`,
      confidenceReason: "Specialist workwear store and a matching item type. A strong signal for an occupation-specific clothing claim.",
    };
  }

  if (merchantMatch) {
    return {
      reason:           `Occupation-specific clothing from ${tx.normalizedMerchant} is deductible if you need it for your job: protective gear, registered uniforms, or items you can't wear outside of work. Casual clothing from the same store doesn't qualify.`,
      confidenceReason: "Recognised workwear retailer, but no specific item in the description. The same stores sometimes carry casual items too.",
    };
  }

  return {
    reason:           `${typeof keyword === "string" ? keyword.charAt(0).toUpperCase() + keyword.slice(1) : "This item"} is deductible if it's required for your job and not something you'd wear in daily life. Everyday clothing worn to work doesn't qualify. Only occupation-specific gear counts.`,
    confidenceReason: "Item type suggests work gear, but the store isn't a specialist workwear retailer. Harder to be confident without both.",
  };
}

export const detectWorkwear: Rule = { priority: 5, detect, explain };
