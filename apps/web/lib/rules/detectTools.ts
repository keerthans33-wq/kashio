// Category:   Equipment
// Confidence: HIGH when a trade-only merchant AND a tool keyword both match
//             MEDIUM when a general hardware merchant AND a tool keyword both match
//             LOW for keyword-only matches
// Note:       Merchant-only matches are not flagged — hardware stores sell far more
//             non-deductible items than tools.
// ATO note:   Tools $300 or less can be claimed immediately; over $300 must be depreciated.

import type { Rule, RawMatch, Explanation } from "./types";
import { CATEGORIES } from "./categories";
import { merchantText, combinedText, matchesMerchant } from "./shared";
import { getMerchantsForCategory, getMerchantInfo } from "../merchants";
import { useContext } from "./userTypeLayer";

// Merchant lists are computed per-call using userType so forUserTypes filtering applies.

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

function detect(tx: { normalizedMerchant: string; description: string }, userType?: string | null): RawMatch | null {
  const combined = combinedText(tx);
  const keyword  = KEYWORDS.find((k) => combined.includes(k));

  // Require a tool keyword — merchant name alone is too broad.
  if (!keyword) return null;

  const tradeOnlyMerchants = getMerchantsForCategory(CATEGORIES.EQUIPMENT, "trade_only", userType);
  const generalMerchants   = getMerchantsForCategory(CATEGORIES.EQUIPMENT, "general",     userType);

  const merchant     = merchantText(tx);
  const isTradeOnly  = tradeOnlyMerchants.some((m) => matchesMerchant(merchant, m));
  const isGeneral    = !isTradeOnly && generalMerchants.some((m) => matchesMerchant(merchant, m));
  const merchantMatch = isTradeOnly || isGeneral;

  return {
    category:   CATEGORIES.EQUIPMENT,
    confidence: isTradeOnly ? "HIGH" : merchantMatch ? "MEDIUM" : "LOW",
    // Keyword-only matches are too ambiguous to promote; require a merchant match.
    canUpgrade: merchantMatch,
    signals:    { isTradeOnly, isGeneral, merchantMatch, keyword },
  };
}

function explain(match: RawMatch, tx: { normalizedMerchant: string }, userType?: string | null): Explanation {
  const { isTradeOnly, merchantMatch, keyword } = match.signals;
  const forWork = `for ${useContext(userType)}`;

  if (isTradeOnly) {
    const info = getMerchantInfo(tx.normalizedMerchant);
    const storeContext = info
      ? info.description.split(". ")[0].replace(/\.$/, "").toLowerCase()
      : "trade tools and equipment";
    return {
      reason:           `${tx.normalizedMerchant} sells ${storeContext}. If this ${keyword} was purchased ${forWork}, it's deductible — tools $300 or under can be claimed in full; over $300 must be depreciated over the asset's life. Check your receipt to confirm it was a work purchase.`,
      confidenceReason: "Trade-only retailer and a matching tool. A strong signal this was a work purchase.",
    };
  }

  if (merchantMatch) {
    return {
      reason:           `${tx.normalizedMerchant} serves both tradespeople and home renovators. If this ${keyword} was bought ${forWork} rather than for a home project, it's deductible. Tools under $300 can be claimed in full; over $300 must be depreciated. Check before claiming.`,
      confidenceReason: "Hardware store and a matching tool type. Reasonable, but these stores also serve homeowners and DIY buyers.",
      mixedUse: true,
    };
  }

  return {
    reason:           `If this ${keyword} was bought ${forWork}, it's deductible. Tools $300 or under can be claimed immediately; over $300 must be depreciated over time. We can only see the description — check your receipt to confirm.`,
    confidenceReason: "Tool type matched, but without a recognised trade store it's harder to confirm this was a work purchase.",
  };
}

export const detectTools: Rule = { priority: 4, detect, explain };
