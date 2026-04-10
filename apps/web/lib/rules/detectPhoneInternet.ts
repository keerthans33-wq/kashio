// Category:   Phone & Internet
// Confidence: MEDIUM when a telco merchant AND a billing keyword both match
//             LOW for merchant-only or keyword-only matches
// ATO note:   Only the work-use portion is deductible.

import type { Rule, RawMatch, Explanation } from "./types";
import { CATEGORIES } from "./categories";
import { merchantText, combinedText, matchesMerchant } from "./shared";

const MERCHANTS = [
  "telstra",
  "optus",
  "vodafone",
  "tpg",
  "iinet",
  "aussie broadband",
  "internode",
  "amaysim",
  "boost mobile",
  "belong",
  "circles.life",
  "kogan mobile",
  "dodo",
  "spintel",
];

const KEYWORDS = [
  "phone bill",
  "mobile plan",
  "internet plan",
  "broadband",
  "nbn",
  "sim plan",
  "data plan",
  "phone recharge",
  "mobile recharge",
  "telecommunications",
];

function detect(tx: { normalizedMerchant: string; description: string }): RawMatch | null {
  const combined = combinedText(tx);

  const merchant      = merchantText(tx);
  const merchantMatch = MERCHANTS.some((m) => matchesMerchant(merchant, m));
  const keyword       = KEYWORDS.find((k) => combined.includes(k));

  if (!merchantMatch && !keyword) return null;

  return {
    category:   CATEGORIES.PHONE_INTERNET,
    confidence: merchantMatch && keyword ? "MEDIUM" : "LOW",
    signals:    { merchantMatch, keyword },
  };
}

function explain(match: RawMatch, tx: { normalizedMerchant: string }): Explanation {
  const { merchantMatch, keyword } = match.signals;
  const both = merchantMatch && keyword;

  if (both) {
    return {
      reason:           `Your ${tx.normalizedMerchant} ${keyword} has a work-use portion that's deductible. You'll need to estimate what percentage you use for work — the ATO suggests a 4-week representative log to work out the split.`,
      confidenceReason: "Recognised telco and a billing keyword — two signals pointing to a recurring phone or internet charge.",
      mixedUse:         true,
    };
  }

  if (merchantMatch) {
    return {
      reason:           `If this ${tx.normalizedMerchant} charge is for a recurring service you use for work, the work-use portion is deductible. A handset or accessory purchase would be treated differently — as an equipment claim.`,
      confidenceReason: "Recognised telco, but no billing keyword — could be a device or accessory purchase rather than a recurring service bill.",
      mixedUse:         true,
    };
  }

  return {
    reason:           `This may be a phone or internet charge — if so, the work-use portion could be claimable. Without a recognised provider, it's hard to be sure what this charge is for. Check before claiming.`,
    confidenceReason: "Billing keyword matched, but without a recognised telco it's hard to confirm this is a phone or internet bill.",
    mixedUse:         true,
  };
}

export const detectPhoneInternet: Rule = { priority: 4, detect, explain };
