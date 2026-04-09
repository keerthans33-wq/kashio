// Category:   Phone & Internet
// Confidence: MEDIUM for known telco merchants (strong merchant signal)
//             LOW for keyword-only matches
// Detects:    Phone bills, internet plans, and mobile subscriptions
// ATO note:   Only the work-use portion is deductible. Mixed personal/work
//             use is very common — the hint in the UI flags this automatically.

import type { Rule } from "./types";
import { CATEGORIES } from "./categories";
import { isExcluded } from "./shared";

// Australian telcos and ISPs
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

export const detectPhoneInternet: Rule = (transaction) => {
  if (transaction.amount >= 0) return null;
  if (isExcluded(transaction.description)) return null;

  const merchant = transaction.normalizedMerchant.toLowerCase();
  const desc     = transaction.description.toLowerCase();

  const merchantMatch  = MERCHANTS.some((m) => merchant.includes(m));
  const matchedKeyword = KEYWORDS.find((k) => desc.includes(k) || merchant.includes(k));

  if (!merchantMatch && !matchedKeyword) return null;

  if (merchantMatch) {
    return {
      category:   CATEGORIES.PHONE_INTERNET,
      confidence: "MEDIUM",
      reason:     `${transaction.normalizedMerchant} is a phone or internet provider. If you use this service for work, the work-use portion of the bill is deductible. Personal use isn't claimable.`,
      confidenceReason: "Recognised Australian telco or ISP — strong signal, but phone and internet are almost always mixed personal and work use.",
    };
  }

  return {
    category:   CATEGORIES.PHONE_INTERNET,
    confidence: "LOW",
    reason:     `The description mentions "${matchedKeyword}". If this is a phone or internet service you use for work, the work portion is deductible. Keep a record of how much you use it for work vs personal.`,
    confidenceReason: "Keyword matched, but without a recognised telco merchant it's harder to confirm this is a phone or internet bill.",
  };
};
