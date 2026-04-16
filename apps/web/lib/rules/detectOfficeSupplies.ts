// Category:   Office Supplies
// Confidence: MEDIUM when a specialist office retailer AND a supply keyword both match
//             LOW for broad retailers (Ikea, Woolworths) or keyword-only matches
// Note:       Merchant-only matches are not flagged — even specialist stores
//             sell a wide range of items with no obvious work connection.
//             mixedUse is always true: these stores sell personal items too.

import type { Rule, RawMatch, Explanation } from "./types";
import { CATEGORIES } from "./categories";
import { merchantText, combinedText, matchesMerchant } from "./shared";
import { getMerchantsForCategory, getMerchantInfo } from "../merchants";
import { userTypeNote } from "./userTypeLayer";

// Merchant list computed per-call so forUserTypes filtering applies.

const KEYWORDS = [
  "stationery",
  "office supplies",
  "ink cartridge",
  "toner",
  "printer paper",
];

function detect(tx: { normalizedMerchant: string; description: string }, userType?: string | null): RawMatch | null {
  const combined = combinedText(tx);

  const keyword = KEYWORDS.find((k) => combined.includes(k));

  // Require a supply keyword — merchant name alone is too broad.
  if (!keyword) return null;

  // Only specialist stores lift confidence to MEDIUM; broad retailers stay LOW.
  const specialistMerchants = getMerchantsForCategory(CATEGORIES.OFFICE_SUPPLIES, "specialist", userType);
  const merchantMatch = specialistMerchants.some((m) => matchesMerchant(merchantText(tx), m));

  return {
    category:   CATEGORIES.OFFICE_SUPPLIES,
    confidence: merchantMatch ? "MEDIUM" : "LOW",
    signals:    { merchantMatch, keyword },
  };
}

function explain(match: RawMatch, tx: { normalizedMerchant: string }, userType?: string | null): Explanation {
  const { merchantMatch, keyword } = match.signals;

  // Framing shifts by user type: employees need the "not reimbursed" caveat;
  // sole traders get the most direct "business expense" language.
  const context  = userType === "sole_trader" ? "your business" : "your work";
  const supplies = userType === "sole_trader"
    ? "Business supplies"
    : userType === "contractor"
    ? "Business supplies"
    : "Office supplies";
  const qualifier = userType === "employee"
    ? "are deductible if not reimbursed by your employer"
    : "are a deductible business expense";

  const tn = userTypeNote(CATEGORIES.OFFICE_SUPPLIES, userType);

  if (merchantMatch) {
    const info = getMerchantInfo(tx.normalizedMerchant);
    const what = info
      ? info.description.split(". ")[0].replace(/\.$/, "").toLowerCase()
      : "office supplies and stationery";
    return {
      reason:           `${tx.normalizedMerchant} sells ${what}. ${supplies} bought for ${context} ${qualifier} — if this ${keyword} was for home rather than ${context}, it won't qualify.`,
      confidenceReason: tn
        ? `Recognised office retailer and a matching supply keyword. Two signals pointing to a work purchase. ${tn}`
        : "Recognised office retailer and a matching supply keyword. Two signals pointing to a work purchase.",
      mixedUse: true,
    };
  }

  return {
    reason:           `${typeof keyword === "string" ? keyword.charAt(0).toUpperCase() + keyword.slice(1) : "This item"} bought for ${context} ${qualifier}, but without a recognised office store this is harder to confirm. Check before claiming.`,
    confidenceReason: tn
      ? `Supply keyword matched, but not from a recognised office retailer. Could be from a non-work purchase. ${tn}`
      : "Supply keyword matched, but not from a recognised office retailer. Could be from a non-work purchase.",
  };
}

export const detectOfficeSupplies: Rule = { priority: 4, detect, explain };
