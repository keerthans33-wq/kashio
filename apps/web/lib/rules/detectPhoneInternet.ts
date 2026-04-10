// Category:   Phone & Internet
// Confidence: MEDIUM when a telco merchant AND a billing keyword both match
//             LOW for merchant-only or keyword-only matches
// ATO note:   Only the work-use portion is deductible.

import type { Rule, RawMatch, Explanation } from "./types";
import { CATEGORIES } from "./categories";
import { merchantText, combinedText, matchesMerchant } from "./shared";
import { getMerchantsForCategory, getMerchantInfo } from "../merchants";

const MERCHANTS = getMerchantsForCategory(CATEGORIES.PHONE_INTERNET);

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

function explain(match: RawMatch, tx: { normalizedMerchant: string }, userType?: string | null): Explanation {
  const { merchantMatch, keyword } = match.signals;
  const both       = merchantMatch && keyword;
  const isBusiness = userType === "contractor" || userType === "sole_trader";
  const useLabel   = isBusiness ? "business-use" : "work-use";

  if (both) {
    return {
      reason:           `Your ${tx.normalizedMerchant} ${keyword} has a ${useLabel} portion that's deductible. You'll need to estimate what percentage you use for ${isBusiness ? "business" : "work"}. The ATO suggests a 4-week representative log to work out the split.`,
      confidenceReason: "Recognised telco and a billing keyword. Two signals pointing to a recurring phone or internet charge.",
      mixedUse:         true,
    };
  }

  if (merchantMatch) {
    // Use merchant knowledge to describe what this provider offers, so users can identify the charge.
    const info = getMerchantInfo(tx.normalizedMerchant);
    const what = info
      ? info.description.split(". ")[0].replace(/\.$/, "").toLowerCase()
      : "mobile and internet services";
    return {
      reason:           `${tx.normalizedMerchant} offers ${what}. We can see this is from ${tx.normalizedMerchant} but not what the charge is for — check your statement. If it's a plan or service you use for ${isBusiness ? "your business" : "work"}, the ${useLabel} portion is deductible. If it's a device or accessory, that would be an equipment claim instead.`,
      confidenceReason: "Recognised telco, but no billing keyword. Could be a device or accessory purchase rather than a recurring service bill.",
      mixedUse:         true,
    };
  }

  return {
    reason:           `This looks like it could be a phone or internet charge, but we can't confirm — the provider isn't one we recognise. If it is a plan or service used for ${isBusiness ? "your business" : "work"}, the ${useLabel} portion would be claimable. Check your statement before confirming.`,
    confidenceReason: "Billing keyword matched, but without a recognised telco it's hard to confirm this is a phone or internet bill.",
    mixedUse:         true,
  };
}

export const detectPhoneInternet: Rule = { priority: 4, detect, explain };
