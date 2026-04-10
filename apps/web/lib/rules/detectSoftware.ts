// Category:   Software & Subscriptions
// Confidence: MEDIUM for specific B2B merchants WITH a subscription keyword
//             LOW for specific merchants without a keyword, or broad merchants with a keyword

import type { Rule, RawMatch, Explanation } from "./types";
import { CATEGORIES } from "./categories";
import { merchantText, combinedText } from "./shared";

// Near-exclusively B2B — merchant name alone is a reasonable signal
const SPECIFIC_MERCHANTS = [
  "figma",
  "google workspace",
  "notion",
  "slack",
];

// Significant personal-use overlap — require a subscription/work keyword
const BROAD_MERCHANTS = [
  "adobe",
  "canva",
  "dropbox",
  "github",
  "microsoft",
  "zoom",
];

const SOFTWARE_KEYWORDS = [
  "subscription",
  "license",
  "licence",
  "monthly",
  "annual",
  "renewal",
  "365",
  "workspace",
  "pro plan",
  "premium plan",
  "business plan",
];

function detect(tx: { normalizedMerchant: string; description: string }): RawMatch | null {
  const combined = combinedText(tx);

  const merchant   = merchantText(tx);
  const isSpecific = SPECIFIC_MERCHANTS.some((m) => merchant.includes(m));
  const isBroad    = !isSpecific && BROAD_MERCHANTS.some((m) => merchant.includes(m));

  if (!isSpecific && !isBroad) return null;

  const keyword = SOFTWARE_KEYWORDS.find((k) => combined.includes(k));
  if (isBroad && !keyword) return null;

  // Specific merchant alone is not enough — require a keyword to confirm it's a paid work account.
  const confidence = isSpecific && keyword ? "MEDIUM" : "LOW";

  return {
    category:   CATEGORIES.SOFTWARE,
    confidence,
    signals:    { tier: isSpecific ? "specific" : "broad", keyword },
  };
}

function explain(match: RawMatch, tx: { normalizedMerchant: string }): Explanation {
  const isSpecific = match.signals.tier === "specific";
  const hasKeyword = !!match.signals.keyword;
  return {
    reason: isSpecific && hasKeyword
      ? `Paid ${tx.normalizedMerchant} subscriptions used to earn income are deductible. If this is your work account, you can claim the full cost.`
      : isSpecific
      ? `If this is a paid ${tx.normalizedMerchant} account for work, the subscription cost is claimable. Free tiers and personal accounts don't qualify.`
      : `Paid ${tx.normalizedMerchant} subscriptions used for work are deductible. Confirm this is your work account. Personal plans don't qualify.`,
    confidenceReason: isSpecific && hasKeyword
      ? "Recognised work tool and a subscription keyword — two signals pointing to a paid work account."
      : isSpecific
      ? "Recognised work tool, but no subscription keyword. Could be a free or personal plan rather than a paid work account."
      : "A subscription keyword supports this, but this tool has personal plans too. Confirm it's a work account before claiming.",
    mixedUse: true,
  };
}

export const detectSoftware: Rule = { priority: 5, detect, explain };
