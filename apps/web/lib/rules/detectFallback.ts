// Fallback rule — two jobs:
//
//   1. Known merchants with no specific rule (currently: Professional Development):
//      getMerchantInfo() returns an entry, but no other rule handles that category.
//      Return LOW confidence using the merchant's own category.
//
//   2. Unknown merchants with a work keyword:
//      getMerchantInfo() returns null. Scan keywords to infer a category.
//      Return LOW confidence.
//
// Priority 1 ensures any specific rule wins when both fire.

import type { Rule, RawMatch, Explanation } from "./types";
import { CATEGORIES } from "./categories";
import { combinedText } from "./shared";
import { getMerchantInfo } from "../merchants";

// Keywords grouped by the category they most strongly suggest.
// Only include keywords that are unambiguous enough to be worth surfacing at LOW confidence.
const KEYWORD_CATEGORIES: { category: string; keywords: string[] }[] = [
  {
    category: CATEGORIES.SOFTWARE,
    keywords: [
      "subscription",
      "license",
      "licence",
      "renewal",
      "monthly plan",
      "annual plan",
      "pro plan",
      "premium plan",
      "business plan",
    ],
  },
  {
    category: CATEGORIES.PHONE_INTERNET,
    keywords: [
      "phone bill",
      "mobile plan",
      "internet plan",
      "broadband",
      "nbn",
      "sim plan",
      "data plan",
      "phone recharge",
      "mobile recharge",
    ],
  },
  {
    category: CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    keywords: [
      "course",
      "training",
      "seminar",
      "workshop",
      "conference",
      "webinar",
      "certification",
      "cpd",
      "professional development",
    ],
  },
  {
    category: CATEGORIES.WORK_TRAVEL,
    keywords: [
      "business travel",
      "work trip",
    ],
  },
  {
    category: CATEGORIES.EQUIPMENT,
    keywords: [
      "docking station",
      "standing desk",
      "usb hub",
    ],
  },
  {
    category: CATEGORIES.OFFICE_SUPPLIES,
    keywords: [
      "stationery",
      "office supplies",
      "ink cartridge",
      "toner",
      "printer paper",
    ],
  },
  {
    category: CATEGORIES.WORK_CLOTHING,
    keywords: [
      "uniform",
      "hi-vis",
      "high-vis",
      "safety boots",
      "hard hat",
      "ppe",
      "protective wear",
    ],
  },
];

// Categories whose merchants are in the knowledge base but have no specific detection rule.
// The fallback handles them so their entries aren't dead.
const FALLBACK_HANDLED_CATEGORIES: Set<string> = new Set([CATEGORIES.PROFESSIONAL_DEVELOPMENT]);

function detect(tx: { normalizedMerchant: string; description: string }, userType?: string | null): RawMatch | null {
  const info = getMerchantInfo(tx.normalizedMerchant);

  if (info) {
    // Known merchant in a fallback-handled category — surface it at LOW.
    if (FALLBACK_HANDLED_CATEGORIES.has(info.category)) {
      return {
        category:   info.category,
        confidence: "LOW",
        signals:    { merchantMatch: true },
      };
    }
    // All other known merchants are handled by their category-specific rule.
    return null;
  }

  // Unknown merchant — scan keywords to infer a category.
  const combined = combinedText(tx);
  for (const { category, keywords } of KEYWORD_CATEGORIES) {
    const keyword = keywords.find((k) => combined.includes(k));
    if (keyword) {
      return {
        category,
        confidence: "LOW",
        signals: { keyword, unknownMerchant: true },
      };
    }
  }

  return null;
}

function explain(match: RawMatch, tx: { normalizedMerchant: string }, userType?: string | null): Explanation {
  const isBusiness = userType === "contractor" || userType === "sole_trader";
  const context    = isBusiness ? "your business" : "your work";

  if (match.signals.merchantMatch) {
    // Known merchant — use the description to say what the provider is.
    const info = getMerchantInfo(tx.normalizedMerchant);
    const what = info
      ? info.description.split(". ")[0].replace(/\.$/, "").toLowerCase()
      : null;
    return {
      reason: what
        ? `${tx.normalizedMerchant} is ${/^[aeiou]/i.test(what) ? "an" : "a"} ${what}. If this was for ${context}, it may be deductible — check your statement before claiming.`
        : `${tx.normalizedMerchant} looks like a ${match.category.toLowerCase()} provider. If this was for ${context}, it may be deductible — confirm before claiming.`,
      confidenceReason: `Recognised ${match.category.toLowerCase()} provider, but we can't confirm this was a work expense from the transaction alone.`,
      mixedUse: true,
    };
  }

  // Unknown merchant — keyword-based explanation.
  const keyword = match.signals.keyword as string;
  return {
    reason:           `"${keyword}" suggests this could be a ${match.category.toLowerCase()} expense for ${context}. We don't have ${tx.normalizedMerchant} in our database — check your statement and confirm this was a work purchase before claiming.`,
    confidenceReason: `Keyword matched, but ${tx.normalizedMerchant} isn't a merchant we recognise. Low confidence until you can confirm it was a work expense.`,
    mixedUse:         true,
  };
}

export const detectFallback: Rule = { priority: 1, detect, explain };
