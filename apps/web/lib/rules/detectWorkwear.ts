// Category:   Work Clothing & Uniforms
// Confidence: MEDIUM for known specialist workwear retailers
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
    confidence: merchantMatch ? "MEDIUM" : "LOW",
    signals:    { merchantMatch, keyword },
  };
}

function explain(match: RawMatch, tx: { normalizedMerchant: string }): Explanation {
  const { merchantMatch, keyword } = match.signals;

  if (merchantMatch) {
    return {
      reason:           `${tx.normalizedMerchant} sells work and safety clothing. If you bought something required for your job that you can't wear outside of work, you can claim it.`,
      confidenceReason: "Specialist workwear store — a strong signal. Not fully certain because the same stores sometimes carry casual items too.",
    };
  }

  return {
    reason:           `The description mentions "${keyword}", which is the kind of item you can claim if it's required for your job. Everyday clothing worn at work doesn't qualify — only gear you couldn't reasonably wear outside of work.`,
    confidenceReason: "The item type suggests work gear, but the store isn't a specialist workwear retailer — harder to be confident without both.",
  };
}

export const detectWorkwear: Rule = { priority: 5, detect, explain };
