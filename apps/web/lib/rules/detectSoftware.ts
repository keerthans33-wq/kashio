// Category:   Work Software & Tools
// Confidence: LOW throughout — even specific merchants have personal tiers,
//             so a match is a prompt to confirm, not a strong assertion.
//
// Two tiers of merchants:
//   SPECIFIC  — tools that are almost exclusively used for work (Figma, Slack,
//               etc.). Merchant match alone is enough to flag.
//   BROAD     — consumer-heavy merchants (Microsoft, Zoom, GitHub) that also
//               sell gaming, personal storage, and free/personal plans.
//               Require a software keyword in the raw description to match.

import type { Rule } from "./types";
import { CATEGORIES } from "./categories";
import { isExcluded } from "./shared";

// Mostly B2B / professional tools — personal use is uncommon
const SPECIFIC_MERCHANTS = [
  "adobe",
  "canva",
  "dropbox",
  "figma",
  "google workspace",
  "notion",
  "slack",
];

// High personal-use overlap — need description confirmation
const BROAD_MERCHANTS = [
  "github",
  "microsoft",
  "zoom",
];

// Keywords that suggest a subscription rather than a one-off or personal purchase
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

export const detectSoftware: Rule = (transaction) => {
  if (transaction.amount >= 0) return null;
  if (isExcluded(transaction.description)) return null;

  const merchant = transaction.normalizedMerchant.toLowerCase();
  const desc     = transaction.description.toLowerCase();

  const isSpecific = SPECIFIC_MERCHANTS.some((m) => merchant.includes(m));
  const isBroad    = !isSpecific && BROAD_MERCHANTS.some((m) => merchant.includes(m));

  if (!isSpecific && !isBroad) return null;

  // Broad merchants require a software keyword in the description to reduce
  // false positives (e.g. Microsoft Xbox, Zoom personal, GitHub personal)
  const matchedKeyword = SOFTWARE_KEYWORDS.find((k) => desc.includes(k));
  if (isBroad && !matchedKeyword) return null;

  return {
    category:   CATEGORIES.WORK_SOFTWARE,
    confidence: "LOW",
    reason: isSpecific
      ? `${transaction.normalizedMerchant} is a work tool. If you use this subscription for your job, you can claim the cost — personal accounts and free tiers don't qualify.`
      : `This looks like a paid ${transaction.normalizedMerchant} subscription. If the account is used for work, the cost is deductible — personal plans don't count.`,
    confidenceReason: isSpecific
      ? "We recognised this as a common work tool, but it also has personal plans — we can't tell from the transaction alone which one this is."
      : "A subscription keyword in the description supports this, but this merchant also has personal plans — confirm it's a work account before claiming.",
  };
};
