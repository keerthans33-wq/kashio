// Category:   Office Supplies
// Confidence: MEDIUM when a known retailer AND a supply keyword both match
//             LOW for keyword-only matches (no recognised office store)
// Note:       Merchant-only matches are not flagged — Officeworks and Staples
//             sell a wide range of items with no obvious work connection.

import type { Rule, RawMatch, Explanation } from "./types";
import { CATEGORIES } from "./categories";
import { merchantText, combinedText } from "./shared";

const MERCHANTS = [
  "officeworks",
  "staples",
];

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

  const merchantMatch = MERCHANTS.some((m) => merchantText(tx).includes(m));

  return {
    category:   CATEGORIES.OFFICE_SUPPLIES,
    confidence: merchantMatch ? "MEDIUM" : "LOW",
    signals:    { merchantMatch, keyword },
  };
}

function explain(match: RawMatch, tx: { normalizedMerchant: string }): Explanation {
  const { merchantMatch, keyword } = match.signals;
  if (merchantMatch) {
    return {
      reason:           `Office supplies bought for work are deductible, and a ${keyword} from ${tx.normalizedMerchant} fits the pattern. If it was for home rather than work, it won't qualify.`,
      confidenceReason: "Recognised office retailer and a matching item type — two signals pointing to a work purchase.",
    };
  }

  return {
    reason:           `${typeof keyword === "string" ? keyword.charAt(0).toUpperCase() + keyword.slice(1) : "This item"} bought for work is deductible, but without a recognised office store this is harder to confirm. Check before claiming.`,
    confidenceReason: "Supply keyword matched, but not from a recognised office retailer — could be from a non-work purchase.",
  };
}

export const detectOfficeSupplies: Rule = { priority: 4, detect, explain };
