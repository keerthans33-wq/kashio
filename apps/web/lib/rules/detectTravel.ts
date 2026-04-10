// Category:   Work Travel
// Confidence: MEDIUM for explicit work-travel keywords (alone or alongside a transport merchant)
//             LOW for transport/fuel merchants without a work keyword, or general travel keywords
// ATO note:   Travel between home and work is generally NOT deductible.

import type { Rule, RawMatch, Explanation } from "./types";
import { CATEGORIES } from "./categories";
import { merchantText, combinedText, matchesMerchant } from "./shared";

const TRANSPORT_MERCHANTS = [
  "uber",
  "ola",
  "didi",
  "13cabs",
  "ingogo",
  "opal",
  "myki",
  "go card",
  "metrocard",
  "airportlink",
];

// Services from transport-adjacent brands that are NOT work travel
const TRANSPORT_EXCLUSIONS = [
  "eats",
  "food",
  "grocery",
  "delivery",
];

// Dedicated fuel stations — merchant alone is a LOW fuel signal.
const FUEL_MERCHANTS = [
  "bp",
  "shell",
  "caltex",
  "ampol",
  "united petroleum",
  "puma energy",
];

// Mixed-use merchants that sell fuel but also food, drinks, and other non-deductibles.
// Only treated as fuel if a fuel keyword is also present.
const CONVENIENCE_MERCHANTS = [
  "7-eleven",
];

// Keywords that confirm a fuel purchase at a convenience merchant.
const FUEL_KEYWORDS = ["fuel", "petrol", "diesel", "unleaded"];

// Explicit work intent — strong enough for MEDIUM on their own
const STRONG_KEYWORDS = [
  "work trip",
  "business travel",
];

// General travel terms — LOW without a merchant signal.
// "flight" and "airfare" are omitted: without a known transport merchant or explicit
// work-travel language, a standalone flight keyword is indistinguishable from a holiday.
const WEAK_KEYWORDS = [
  "parking",
  "toll",
  "linkt",
  "e-toll",
  "fuel",
  "petrol",
  "train",
  "bus ticket",
  "ferry",
  "taxi",
  "rideshare",
];

const ALL_KEYWORDS = [...STRONG_KEYWORDS, ...WEAK_KEYWORDS];

function detect(tx: { normalizedMerchant: string; description: string }): RawMatch | null {
  const merchant = merchantText(tx);
  const combined = combinedText(tx);

  const isExcludedTransport = TRANSPORT_EXCLUSIONS.some((e) => combined.includes(e));
  const isTransport = !isExcludedTransport && TRANSPORT_MERCHANTS.some((m) => matchesMerchant(merchant, m));

  const hasFuelKeyword = FUEL_KEYWORDS.some((k) => combined.includes(k));
  const isFuel = !isTransport && (
    FUEL_MERCHANTS.some((m) => matchesMerchant(merchant, m)) ||
    (CONVENIENCE_MERCHANTS.some((m) => merchant.includes(m)) && hasFuelKeyword)
  );

  const keyword  = ALL_KEYWORDS.find((k) => combined.includes(k));
  const isStrong = keyword ? STRONG_KEYWORDS.includes(keyword) : false;

  if (!isTransport && !isFuel && !keyword) return null;

  // Transport merchant alone can't distinguish work travel from commuting — require a strong
  // keyword to reach MEDIUM. Fuel and general keywords stay LOW regardless.
  return {
    category:   CATEGORIES.WORK_TRAVEL,
    confidence: isStrong ? "MEDIUM" : "LOW",
    signals:    { isTransport, isFuel, keyword, isStrong },
  };
}

function explain(match: RawMatch, tx: { normalizedMerchant: string }): Explanation {
  const { isTransport, isFuel, keyword, isStrong } = match.signals;

  if (isTransport) {
    return {
      reason:           `${tx.normalizedMerchant} trips for work — visiting clients, travelling between job sites, attending work events — are deductible. Your regular commute to the office doesn't count.`,
      confidenceReason: "Recognised transport provider, but work trips and commutes look identical in the data — confirm this was a work journey, not the daily commute.",
    };
  }

  if (isFuel) {
    return {
      reason:           `Fuel used for work-related driving is deductible — but not your commute to a regular workplace. A logbook or trip notes will help you confirm and support the claim.`,
      confidenceReason: "Fuel is used for both work and personal driving — without a logbook it's hard to separate the two.",
    };
  }

  return {
    reason: isStrong
      ? `The description says "${keyword}", which is a clear sign this may be a work travel claim. Confirm the trip was for business — personal travel and commuting don't count.`
      : `This could be a work travel expense, but ${keyword} is also common for personal trips. Only claim it if this was a business journey — not a commute or holiday.`,
    confidenceReason: isStrong
      ? "Explicit work travel language in the description — a strong signal."
      : "Travel keyword matched, but personal trips look identical — this needs your confirmation before claiming.",
  };
}

export const detectTravel: Rule = { priority: 3, detect, explain };
