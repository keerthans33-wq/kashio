// Category:   Work Software & Tools
// Confidence: MEDIUM for SPECIFIC merchants (near-exclusively B2B tools)
//             LOW for BROAD merchants even with a keyword (significant personal overlap)

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

  return {
    category:   CATEGORIES.WORK_SOFTWARE,
    confidence: isSpecific ? "MEDIUM" : "LOW",
    signals:    { tier: isSpecific ? "specific" : "broad", keyword },
  };
}

function explain(match: RawMatch, tx: { normalizedMerchant: string }): Explanation {
  const isSpecific = match.signals.tier === "specific";
  return {
    reason: isSpecific
      ? `${tx.normalizedMerchant} is a work tool. If you use this subscription for your job, you can claim the cost — personal accounts and free tiers don't qualify.`
      : `This looks like a paid ${tx.normalizedMerchant} subscription. If the account is used for work, the cost is deductible — personal plans don't count.`,
    confidenceReason: isSpecific
      ? "Recognised as a near-exclusively B2B tool — a reasonable signal, but personal plans exist so confirm it's a work account."
      : "A subscription keyword in the description supports this, but this merchant also has personal plans — confirm it's a work account before claiming.",
  };
}

export const detectSoftware: Rule = { priority: 5, detect, explain };
