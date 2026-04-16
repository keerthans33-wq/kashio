// Category:   Meals
// Confidence: LOW (base) — only fires on explicit business-meal language
// ATO note:   Meals are almost never deductible for employees. Contractors and
//             sole traders can claim in limited circumstances: entertaining clients,
//             travel away overnight, or work-related functions. Personal meals,
//             team coffees, and everyday lunches don't qualify.
//
// User types: employee    → always returns null (suppressed — not relevant)
//             contractor  → LOW; claimable only with clear business purpose
//             sole_trader → MEDIUM (after user-type adjustment); more common in business

import type { Rule, RawMatch, Explanation } from "./types";
import { CATEGORIES } from "./categories";
import { combinedText } from "./shared";

// Only explicit business-meal language triggers this rule.
// Generic food/restaurant keywords are too noisy — nearly all spending there is personal.
const KEYWORDS = [
  "client lunch",
  "client dinner",
  "client breakfast",
  "client meal",
  "business lunch",
  "business dinner",
  "business meal",
  "business breakfast",
  "working lunch",
  "team lunch",
  "team dinner",
  "staff lunch",
  "staff dinner",
  "client entertainment",
  "work function",
  "team function",
  "staff function",
];

function detect(
  tx: { normalizedMerchant: string; description: string },
  userType?: string | null,
): RawMatch | null {
  // Meals are almost never deductible for employees under ATO rules.
  // Don't surface them to avoid misleading employee users.
  if (!userType || userType === "employee") return null;

  const combined = combinedText(tx);
  const keyword  = KEYWORDS.find((k) => combined.includes(k));
  if (!keyword) return null;

  return {
    category:   CATEGORIES.MEALS,
    confidence: "LOW",
    signals:    { keyword },
  };
}

function explain(
  match: RawMatch,
  _tx: { normalizedMerchant: string },
  userType?: string | null,
): Explanation {
  const keyword     = match.signals.keyword as string;
  const isSoleTrader = userType === "sole_trader";

  const reason = isSoleTrader
    ? `"${keyword}" suggests a business-related meal. Sole traders can deduct meals in limited circumstances — client meetings, work functions, or travel away overnight. Keep a record of who attended and the business purpose of the meal.`
    : `"${keyword}" suggests a business-related meal. Contractors can claim meal costs in limited circumstances — entertaining clients, work functions, or travel away overnight. Keep a record of who attended and the business purpose.`;

  const confidenceReason = isSoleTrader
    ? "Explicit business-meal language is a strong signal. Deductible with a clear business purpose and good records — personal meals never qualify."
    : "Explicit business-meal language. Deductible in genuine business contexts — confirm this was a real business expense before claiming.";

  return { reason, confidenceReason };
}

// Priority 2: below most specific rules, above fallback.
// Meals matching is conservative by design — any specific category rule should win.
export const detectMeals: Rule = { priority: 2, detect, explain };
