// Category:   Tools & Equipment
// Confidence: MEDIUM when a trade merchant AND a tool keyword both match
//             LOW for keyword-only matches
// Note:       Merchant-only matches are not flagged — broad hardware stores
//             like Bunnings sell far more non-deductible items than tools.
// ATO note:   Tools $300 or less can be claimed immediately; over $300 must be depreciated.

import type { Rule, RawMatch, Explanation } from "./types";
import { CATEGORIES } from "./categories";
import { merchantText, combinedText } from "./shared";

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

function detect(tx: { normalizedMerchant: string; description: string }): RawMatch | null {
  const combined     = combinedText(tx);
  const keyword      = KEYWORDS.find((k) => combined.includes(k));

  // Require a tool keyword — merchant name alone is too broad.
  if (!keyword) return null;

  const merchantMatch = MERCHANTS.some((m) => merchantText(tx).includes(m));

  return {
    category:   CATEGORIES.TOOLS_EQUIPMENT,
    confidence: merchantMatch ? "MEDIUM" : "LOW",
    signals:    { merchantMatch, keyword },
  };
}

function explain(match: RawMatch, tx: { normalizedMerchant: string }): Explanation {
  const { merchantMatch, keyword } = match.signals;

  if (merchantMatch) {
    return {
      reason:           `This looks like a ${keyword} purchase from ${tx.normalizedMerchant}. Tools you buy for work are deductible — items under $300 can be claimed in full this year.`,
      confidenceReason: "Both the store and the item type matched — two signals pointing to a work tool purchase.",
    };
  }

  return {
    reason:           `The description mentions a ${keyword}. If you bought this for work and it costs $300 or less, you can claim the full amount this year.`,
    confidenceReason: "Item type matched, but without a recognised trade store it's harder to confirm this was a work purchase.",
  };
}

export const detectTools: Rule = { priority: 4, detect, explain };
