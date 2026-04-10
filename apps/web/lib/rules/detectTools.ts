// Category:   Equipment
// Confidence: HIGH when a trade-only merchant AND a tool keyword both match
//             MEDIUM when a general hardware merchant AND a tool keyword both match
//             LOW for keyword-only matches
// Note:       Merchant-only matches are not flagged — hardware stores sell far more
//             non-deductible items than tools.
// ATO note:   Tools $300 or less can be claimed immediately; over $300 must be depreciated.

import type { Rule, RawMatch, Explanation } from "./types";
import { CATEGORIES } from "./categories";
import { merchantText, combinedText } from "./shared";

// Near-exclusively professional/trade customers — strong work signal with a tool keyword.
const TRADE_ONLY_MERCHANTS = [
  "total tools",
  "sydney tools",
  "tools warehouse",
  "tool kit depot",
  "blackwoods",
  "protector alsafe",
];

// General hardware stores that also serve homeowners and DIY buyers — weaker signal.
const GENERAL_MERCHANTS = [
  "bunnings",
  "mitre 10",
  "home hardware",
  "hardings hardware",
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
  const combined = combinedText(tx);
  const keyword  = KEYWORDS.find((k) => combined.includes(k));

  // Require a tool keyword — merchant name alone is too broad.
  if (!keyword) return null;

  const merchant     = merchantText(tx);
  const isTradeOnly  = TRADE_ONLY_MERCHANTS.some((m) => merchant.includes(m));
  const isGeneral    = !isTradeOnly && GENERAL_MERCHANTS.some((m) => merchant.includes(m));
  const merchantMatch = isTradeOnly || isGeneral;

  return {
    category:   CATEGORIES.EQUIPMENT,
    confidence: isTradeOnly ? "HIGH" : merchantMatch ? "MEDIUM" : "LOW",
    signals:    { isTradeOnly, isGeneral, merchantMatch, keyword },
  };
}

function explain(match: RawMatch, tx: { normalizedMerchant: string }, userType?: string | null): Explanation {
  const { isTradeOnly, merchantMatch, keyword } = match.signals;
  const forWork = userType === "sole_trader" ? "for your business" : "for your trade";

  if (isTradeOnly) {
    return {
      reason:           `A ${keyword} from ${tx.normalizedMerchant} used ${forWork} is deductible. Tools under $300 can be claimed in full; over $300 must be depreciated over the asset's life.`,
      confidenceReason: "Trade-only retailer and a matching tool. A strong signal this was a work purchase.",
    };
  }

  if (merchantMatch) {
    return {
      reason:           `If this ${keyword} from ${tx.normalizedMerchant} was bought ${forWork}, not a home project, it's deductible. Tools under $300 can be claimed in full; over $300 must be depreciated.`,
      confidenceReason: "Hardware store and a matching tool type. Reasonable, but these stores also serve homeowners and DIY buyers.",
    };
  }

  return {
    reason:           `If this ${keyword} was bought ${forWork}, it's deductible. Tools $300 or under can be claimed immediately; over $300 must be depreciated over time.`,
    confidenceReason: "Tool type matched, but without a recognised trade store it's harder to confirm this was a work purchase.",
  };
}

export const detectTools: Rule = { priority: 4, detect, explain };
