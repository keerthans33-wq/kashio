// Category:   Office Supplies & Equipment
// Confidence: MEDIUM when a known retailer AND a work keyword both match
//             LOW when only one signal is present

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

  const merchantMatch = MERCHANTS.some((m) => merchantText(tx).includes(m));
  const keyword       = KEYWORDS.find((k) => combined.includes(k));

  if (!merchantMatch && !keyword) return null;

  return {
    category:   CATEGORIES.OFFICE_SUPPLIES,
    confidence: merchantMatch && keyword ? "MEDIUM" : "LOW",
    signals:    { merchantMatch, keyword },
  };
}

function explain(match: RawMatch, tx: { normalizedMerchant: string }): Explanation {
  const { merchantMatch, keyword } = match.signals;
  const both = merchantMatch && keyword;

  if (both) {
    return {
      reason:           `This looks like a ${keyword} purchase from ${tx.normalizedMerchant}. Office supplies you buy for work are deductible — home or personal use doesn't qualify.`,
      confidenceReason: "Both the store and the item type matched — two signals pointing to a work purchase.",
    };
  }

  if (merchantMatch) {
    return {
      reason:           `${tx.normalizedMerchant} is an office supply store. If this was for work — stationery, printer supplies, or similar — you can claim it. Home purchases from the same store don't count.`,
      confidenceReason: "Known office store matched, but no specific item in the description — could still be a personal purchase.",
    };
  }

  return {
    reason:           `The description mentions "${keyword}". Office supplies bought for work are deductible — if it was for home use, it won't qualify.`,
    confidenceReason: "Item type matched in the description, but without a recognised office store it's harder to be sure.",
  };
}

export const detectOfficeSupplies: Rule = { priority: 4, detect, explain };
