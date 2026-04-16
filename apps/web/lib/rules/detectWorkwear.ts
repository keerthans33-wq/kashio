// Category:   Work Clothing
// Confidence: HIGH for specialist workwear retailer AND a workwear keyword (strong double signal)
//             MEDIUM for specialist retailer alone
//             LOW for keyword-only matches
// ATO note:   Conventional clothing is NOT deductible. Only occupation-specific
//             gear that can't reasonably be worn outside of work qualifies.

import type { Rule, RawMatch, Explanation } from "./types";
import { CATEGORIES } from "./categories";
import { merchantText, combinedText, matchesMerchant } from "./shared";
import { getMerchantsForCategory, getMerchantInfo } from "../merchants";
import { useContext } from "./userTypeLayer";

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

function detect(tx: { normalizedMerchant: string; description: string }, userType?: string | null): RawMatch | null {
  const combined = combinedText(tx);

  const merchants     = getMerchantsForCategory(CATEGORIES.WORK_CLOTHING, undefined, userType);
  const merchantMatch = merchants.some((m) => matchesMerchant(merchantText(tx), m));
  const keyword       = KEYWORDS.find((k) => combined.includes(k));

  if (!merchantMatch && !keyword) return null;

  return {
    category:   CATEGORIES.WORK_CLOTHING,
    confidence: merchantMatch && keyword ? "HIGH" : merchantMatch ? "MEDIUM" : "LOW",
    signals:    { merchantMatch, keyword },
  };
}

function explain(match: RawMatch, tx: { normalizedMerchant: string }, userType?: string | null): Explanation {
  const { merchantMatch, keyword } = match.signals;
  const ctx     = useContext(userType);
  const forWork = `required for ${ctx}`;
  const context = ctx;

  if (merchantMatch && keyword) {
    // Use merchant knowledge to name what the store specialises in.
    const info = getMerchantInfo(tx.normalizedMerchant);
    const specialty = info
      ? info.description.split(". ")[0].replace(/\.$/, "").toLowerCase()
      : "workwear and safety gear";
    const keywordCap = typeof keyword === "string" ? keyword.charAt(0).toUpperCase() + keyword.slice(1) : "Workwear";
    return {
      reason:           `${tx.normalizedMerchant} sells ${specialty}. If this ${keyword} is ${forWork}, it's deductible. The test is whether you'd wear it outside of work — if not, you can claim it. Check your receipt before confirming.`,
      confidenceReason: "Specialist workwear store and a matching item type. A strong signal for an occupation-specific clothing claim.",
    };
  }

  if (merchantMatch) {
    const info = getMerchantInfo(tx.normalizedMerchant);
    const specialty = info
      ? info.description.split(". ")[0].replace(/\.$/, "").toLowerCase()
      : "workwear and safety gear";
    return {
      reason:           `${tx.normalizedMerchant} sells ${specialty}. We can't see exactly what was purchased — check what you bought. Occupation-specific items you need for ${context} are deductible: protective gear, registered uniforms, or clothing you can't wear outside of work. Casual items don't qualify.`,
      confidenceReason: "Recognised workwear retailer, but no specific item in the description. The same stores sometimes carry casual items too.",
    };
  }

  return {
    reason:           `${typeof keyword === "string" ? keyword.charAt(0).toUpperCase() + keyword.slice(1) : "This item"} is deductible if it's ${forWork} and not something you'd wear in daily life. Everyday clothing worn to work doesn't qualify — only occupation-specific gear counts. Check before claiming.`,
    confidenceReason: "Item type suggests work gear, but the store isn't a specialist workwear retailer. Harder to be confident without both.",
  };
}

export const detectWorkwear: Rule = { priority: 5, detect, explain };
