// Category:   Phone & Internet
// Confidence: MEDIUM when a telco merchant AND a billing keyword both match
//             LOW for merchant-only or keyword-only matches
// ATO note:   Only the work-use portion is deductible.

import type { Rule, RawMatch, Explanation } from "./types";
import { CATEGORIES } from "./categories";
import { merchantText, combinedText } from "./shared";

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

  const merchantMatch = MERCHANTS.some((m) => merchantText(tx).includes(m));
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
      reason:           `This looks like a ${tx.normalizedMerchant} ${keyword}. If you use this service for work, the work-use portion is deductible. Personal use isn't claimable.`,
      confidenceReason: "Recognised telco and a billing keyword in the description — two signals pointing to a recurring phone or internet charge.",
    };
  }

  if (merchantMatch) {
    return {
      reason:           `${tx.normalizedMerchant} is a phone or internet provider. If this is a recurring bill you use for work, the work portion is deductible — but confirm it's a service charge, not a device purchase.`,
      confidenceReason: "Recognised telco, but no billing keyword — could be a handset, accessory, or store payment rather than a phone or internet bill.",
    };
  }

  return {
    reason:           `The description mentions "${keyword}". If this is a phone or internet service you use for work, the work portion is deductible. Keep a record of how much you use it for work vs personal.`,
    confidenceReason: "Billing keyword matched, but without a recognised telco merchant it's harder to confirm this is a phone or internet bill.",
  };
}

export const detectPhoneInternet: Rule = { priority: 4, detect, explain };
