// Category:   Tools & Equipment
// Confidence: MEDIUM for specialist trade/hardware merchants with a tool keyword
//             LOW for keyword-only or merchant-only matches
// Detects:    Hand tools, power tools, and trade equipment
// ATO note:   Tools costing $300 or less can be claimed immediately.
//             Items over $300 must be depreciated. User should confirm cost.

import type { Rule } from "./types";
import { CATEGORIES } from "./categories";
import { isExcluded } from "./shared";

// Trade and hardware merchants with high work-use overlap
const MERCHANTS = [
  "bunnings",
  "total tools",
  "sydney tools",
  "tools warehouse",
  "tool kit depot",
  "mitre 10",
  "home hardware",
  "hardings hardware",
  "blackwoods",
  "protector alsafe",
];

// Tool and equipment keywords
const KEYWORDS = [
  "drill",
  "saw",
  "grinder",
  "sander",
  "nail gun",
  "hammer",
  "spanner",
  "wrench",
  "screwdriver",
  "chisel",
  "level",
  "tape measure",
  "power tool",
  "hand tool",
  "tool belt",
  "toolbox",
  "ladder",
  "scaffold",
  "extension cord",
  "workbench",
];

export const detectTools: Rule = (transaction) => {
  if (transaction.amount >= 0) return null;
  if (isExcluded(transaction.description)) return null;

  const merchant = transaction.normalizedMerchant.toLowerCase();
  const desc     = transaction.description.toLowerCase();

  const merchantMatch  = MERCHANTS.some((m) => merchant.includes(m));
  const matchedKeyword = KEYWORDS.find((k) => desc.includes(k) || merchant.includes(k));

  if (!merchantMatch && !matchedKeyword) return null;

  if (merchantMatch && matchedKeyword) {
    return {
      category:   CATEGORIES.TOOLS_EQUIPMENT,
      confidence: "MEDIUM",
      reason:     `This looks like a ${matchedKeyword} purchase from ${transaction.normalizedMerchant}. Tools you buy for work are deductible — items under $300 can be claimed in full this year.`,
      confidenceReason: "Both the store and the item type matched — two signals pointing to a work tool purchase.",
    };
  }

  if (merchantMatch) {
    return {
      category:   CATEGORIES.TOOLS_EQUIPMENT,
      confidence: "LOW",
      reason:     `${transaction.normalizedMerchant} sells tools and trade supplies. If this was for work — not a personal home project — you may be able to claim it.`,
      confidenceReason: "Known hardware or trade store matched, but without a specific item in the description it could still be a personal purchase.",
    };
  }

  return {
    category:   CATEGORIES.TOOLS_EQUIPMENT,
    confidence: "LOW",
    reason:     `The description mentions a ${matchedKeyword}. If you bought this for work and it costs $300 or less, you can claim the full amount this year.`,
    confidenceReason: "Item type matched, but without a recognised trade store it's harder to confirm this was a work purchase.",
  };
};
