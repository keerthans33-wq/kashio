// Category:   Software & Subscriptions
// Confidence: MEDIUM for specific B2B merchants WITH a subscription keyword
//             LOW for specific merchants without a keyword, or broad merchants with a keyword

import type { Rule, RawMatch, Explanation } from "./types";
import { CATEGORIES } from "./categories";
import { merchantText, combinedText, matchesMerchant } from "./shared";
import { getMerchantsForCategory, getMerchantInfo } from "../merchants";
import { useContext } from "./userTypeLayer";

// Merchant lists computed per-call so forUserTypes filtering applies.

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

function detect(tx: { normalizedMerchant: string; description: string }, userType?: string | null): RawMatch | null {
  const combined = combinedText(tx);

  const specificMerchants = getMerchantsForCategory(CATEGORIES.SOFTWARE, "specific", userType);
  const broadMerchants    = getMerchantsForCategory(CATEGORIES.SOFTWARE, "broad",    userType);

  const merchant   = merchantText(tx);
  const isSpecific = specificMerchants.some((m) => matchesMerchant(merchant, m));
  const isBroad    = !isSpecific && broadMerchants.some((m) => matchesMerchant(merchant, m));

  if (!isSpecific && !isBroad) return null;

  const keyword = SOFTWARE_KEYWORDS.find((k) => combined.includes(k));
  if (isBroad && !keyword) return null;

  // Specific merchant alone is not enough — require a keyword to confirm it's a paid work account.
  const confidence = isSpecific && keyword ? "MEDIUM" : "LOW";

  // Only allow the business-user +1 bump when both signals are present;
  // a lone merchant or lone keyword is too weak to promote.
  const canUpgrade = isSpecific && !!keyword;

  return {
    category:   CATEGORIES.SOFTWARE,
    confidence,
    canUpgrade,
    signals:    { tier: isSpecific ? "specific" : "broad", keyword },
  };
}

function explain(match: RawMatch, tx: { normalizedMerchant: string }, userType?: string | null): Explanation {
  const isSpecific = match.signals.tier === "specific";
  const hasKeyword = !!match.signals.keyword;
  const context    = useContext(userType);

  // Employee framing: hedged, "not reimbursed" caveat.
  // Contractor framing: confident, "business expense for your work".
  // Sole trader framing: direct, "business software — typically deductible".
  const qualifier = userType === "sole_trader"
    ? "used to run your business are a deductible business expense"
    : userType === "contractor"
    ? "used for your contract work are deductible"
    : "used for your job may be deductible if not reimbursed by your employer";

  // Use merchant knowledge to describe what the tool is.
  const info = getMerchantInfo(tx.normalizedMerchant);
  const what = info ? (() => {
    const first = info.description.split(". ")[0].replace(/\.$/, "");
    return first.charAt(0).toLowerCase() + first.slice(1);
  })() : null;

  return {
    reason: isSpecific && hasKeyword
      ? what
        ? `${tx.normalizedMerchant} is ${/^[aeiou]/i.test(what) ? "an" : "a"} ${what}. Paid subscriptions ${qualifier} — if this is your work account, you can claim the full cost.`
        : `Paid ${tx.normalizedMerchant} subscriptions ${qualifier}. If this is your work account, you can claim the full subscription cost.`
      : isSpecific
      ? what
        ? `${tx.normalizedMerchant} is ${/^[aeiou]/i.test(what) ? "an" : "a"} ${what}. If this is a paid account used for ${context}, the subscription cost is claimable. Free tiers and personal accounts don't qualify.`
        : `If this is a paid ${tx.normalizedMerchant} account used for ${context}, the subscription cost is claimable. Free tiers and personal accounts don't qualify.`
      : what
        ? `${tx.normalizedMerchant} is ${/^[aeiou]/i.test(what) ? "an" : "a"} ${what}. Paid subscriptions ${qualifier}. Confirm this is your work account — personal plans don't qualify.`
        : `Paid ${tx.normalizedMerchant} subscriptions ${qualifier}. Confirm this is your work account. Personal plans don't qualify.`,
    confidenceReason: isSpecific && hasKeyword
      ? "Recognised work tool and a subscription keyword — two signals pointing to a paid work account."
      : isSpecific
      ? "Recognised work tool, but no subscription keyword. Could be a free or personal plan rather than a paid work account."
      : "A subscription keyword supports this, but this tool has personal plans too. Confirm it's a work account before claiming.",
    mixedUse: true,
  };
}

export const detectSoftware: Rule = { priority: 5, detect, explain };
