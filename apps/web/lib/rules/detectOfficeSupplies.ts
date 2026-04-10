// Category:   Office Supplies
// Confidence: MEDIUM when a specialist office retailer AND a supply keyword both match
//             LOW for broad retailers (Ikea, Woolworths) or keyword-only matches
// Note:       Merchant-only matches are not flagged — even specialist stores
//             sell a wide range of items with no obvious work connection.
//             mixedUse is always true: these stores sell personal items too.

import type { Rule, RawMatch, Explanation } from "./types";
import { CATEGORIES } from "./categories";
import { merchantText, combinedText } from "./shared";
import { getMerchantsForCategory, getMerchantInfo } from "../merchants";

// Dedicated office supply stores — eligible for MEDIUM confidence when a keyword also matches.
const SPECIALIST_MERCHANTS = getMerchantsForCategory(CATEGORIES.OFFICE_SUPPLIES, "specialist");

const KEYWORDS = [
  "stationery",
  "office supplies",
  "ink cartridge",
  "toner",
  "printer paper",
];

function detect(tx: { normalizedMerchant: string; description: string }): RawMatch | null {
  const combined = combinedText(tx);

  const keyword = KEYWORDS.find((k) => combined.includes(k));

  // Require a supply keyword — merchant name alone is too broad.
  if (!keyword) return null;

  // Only specialist stores lift confidence to MEDIUM; broad retailers stay LOW.
  const merchantMatch = SPECIALIST_MERCHANTS.some((m) => merchantText(tx).includes(m));

  return {
    category:   CATEGORIES.OFFICE_SUPPLIES,
    confidence: merchantMatch ? "MEDIUM" : "LOW",
    signals:    { merchantMatch, keyword },
  };
}

function explain(match: RawMatch, tx: { normalizedMerchant: string }, userType?: string | null): Explanation {
  const { merchantMatch, keyword } = match.signals;
  const context  = userType === "sole_trader" ? "your business" : "your work";
  const supplies = userType === "sole_trader" ? "Business supplies" : "Office supplies";

  if (merchantMatch) {
    // Use merchant knowledge to describe what the store carries.
    const info = getMerchantInfo(tx.normalizedMerchant);
    const what = info
      ? info.description.split(". ")[0].replace(/\.$/, "").toLowerCase()
      : "office supplies and stationery";
    return {
      reason:           `${tx.normalizedMerchant} sells ${what}. ${supplies} bought for ${context} are deductible — if this ${keyword} was for home rather than ${context}, it won't qualify.`,
      confidenceReason: "Recognised office retailer and a matching supply keyword. Two signals pointing to a work purchase.",
      mixedUse:         true,
    };
  }

  return {
    reason:           `${typeof keyword === "string" ? keyword.charAt(0).toUpperCase() + keyword.slice(1) : "This item"} bought for ${context} is deductible, but without a recognised office store this is harder to confirm. Check before claiming.`,
    confidenceReason: "Supply keyword matched, but not from a recognised office retailer. Could be from a non-work purchase.",
  };
}

export const detectOfficeSupplies: Rule = { priority: 4, detect, explain };
