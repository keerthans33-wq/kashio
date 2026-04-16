// Category:   Phone & Internet
// Confidence: MEDIUM when a telco merchant AND a billing keyword both match
//             LOW for merchant-only or keyword-only matches
// ATO note:   Only the work-use portion is deductible.

import type { Rule, RawMatch, Explanation } from "./types";
import { CATEGORIES } from "./categories";
import { merchantText, combinedText, matchesMerchant } from "./shared";
import { getMerchantsForCategory, getMerchantInfo } from "../merchants";
import { userTypeNote } from "./userTypeLayer";

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

function detect(tx: { normalizedMerchant: string; description: string }, userType?: string | null): RawMatch | null {
  const combined = combinedText(tx);

  const merchants     = getMerchantsForCategory(CATEGORIES.PHONE_INTERNET, undefined, userType);
  const merchant      = merchantText(tx);
  const merchantMatch = merchants.some((m) => matchesMerchant(merchant, m));
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
  const both         = merchantMatch && keyword;
  const isBusiness   = userType === "contractor" || userType === "sole_trader";
  const useLabel     = isBusiness ? "business-use" : "work-use";
  const tn           = userTypeNote(CATEGORIES.PHONE_INTERNET, userType);

  // Sole traders can claim full cost if used exclusively for business — make that explicit.
  const proportionNote = userType === "sole_trader"
    ? "If you use it exclusively for business you can claim the full cost; otherwise claim the business-use proportion."
    : `You'll need to estimate what percentage you use for ${isBusiness ? "business" : "work"}. The ATO suggests a 4-week representative log to work out the split.`;

  if (both) {
    return {
      reason:           `Your ${tx.normalizedMerchant} ${keyword} has a ${useLabel} portion that's deductible. ${proportionNote}`,
      confidenceReason: tn
        ? `Recognised telco and a billing keyword. Two signals pointing to a recurring phone or internet charge. ${tn}`
        : "Recognised telco and a billing keyword. Two signals pointing to a recurring phone or internet charge.",
      mixedUse: true,
    };
  }

  if (merchantMatch) {
    const info = getMerchantInfo(tx.normalizedMerchant);
    const what = info
      ? info.description.split(". ")[0].replace(/\.$/, "").toLowerCase()
      : "mobile and internet services";
    return {
      reason:           `${tx.normalizedMerchant} offers ${what}. We can see this is from ${tx.normalizedMerchant} but not what the charge is for — check your statement. If it's a plan or service you use for ${isBusiness ? "your business" : "work"}, the ${useLabel} portion is deductible. If it's a device or accessory, that would be an equipment claim instead.`,
      confidenceReason: tn
        ? `Recognised telco, but no billing keyword. Could be a device or accessory purchase rather than a recurring service bill. ${tn}`
        : "Recognised telco, but no billing keyword. Could be a device or accessory purchase rather than a recurring service bill.",
      mixedUse: true,
    };
  }

  return {
    reason:           `This looks like it could be a phone or internet charge, but we can't confirm — the provider isn't one we recognise. If it is a plan or service used for ${isBusiness ? "your business" : "work"}, the ${useLabel} portion would be claimable. Check your statement before confirming.`,
    confidenceReason: tn
      ? `Billing keyword matched, but without a recognised telco it's hard to confirm this is a phone or internet bill. ${tn}`
      : "Billing keyword matched, but without a recognised telco it's hard to confirm this is a phone or internet bill.",
    mixedUse: true,
  };
}

export const detectPhoneInternet: Rule = { priority: 4, detect, explain };
