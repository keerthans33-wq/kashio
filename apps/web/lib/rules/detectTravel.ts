// Category:   Work-Related Travel
// Confidence: MEDIUM for known transport merchants or explicit work-travel keywords
//             LOW for fuel merchants or general travel keywords
// ATO note:   Travel between home and work is generally NOT deductible.

import type { Rule, RawMatch, Explanation } from "./types";
import { CATEGORIES } from "./categories";
import { merchantText, combinedText } from "./shared";

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

const FUEL_MERCHANTS = [
  "bp",
  "shell",
  "caltex",
  "ampol",
  "7-eleven",
  "united petroleum",
  "puma energy",
];

// Explicit work intent — strong enough for MEDIUM on their own
const STRONG_KEYWORDS = [
  "work trip",
  "business travel",
];

// General travel terms — LOW without a merchant signal.
// airfare/flight are intentionally LOW because they are equally common for personal holidays.
const WEAK_KEYWORDS = [
  "parking",
  "toll",
  "linkt",
  "e-toll",
  "fuel",
  "petrol",
  "airfare",
  "flight",
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
  const isTransport = !isExcludedTransport && TRANSPORT_MERCHANTS.some((m) => merchant.includes(m));
  const isFuel      = !isTransport && FUEL_MERCHANTS.some((m) => merchant.includes(m));
  const keyword     = ALL_KEYWORDS.find((k) => combined.includes(k));
  const isStrong    = keyword ? STRONG_KEYWORDS.includes(keyword) : false;

  if (!isTransport && !isFuel && !keyword) return null;

  return {
    category:   CATEGORIES.WORK_TRAVEL,
    confidence: isTransport || isStrong ? "MEDIUM" : "LOW",
    signals:    { isTransport, isFuel, keyword, isStrong },
  };
}

function explain(match: RawMatch, tx: { normalizedMerchant: string }): Explanation {
  const { isTransport, isFuel, keyword, isStrong } = match.signals;

  if (isTransport) {
    return {
      reason:           `${tx.normalizedMerchant} is a transport provider. If this trip was for work — visiting a client, attending a site, or travelling between work locations — you can claim it. Commuting to your regular workplace doesn't qualify.`,
      confidenceReason: "Recognised transport merchant — likely work travel, but commuting trips look the same and aren't deductible.",
    };
  }

  if (isFuel) {
    return {
      reason:           `${tx.normalizedMerchant} is a fuel station. If you drove for work — not your regular commute — the fuel cost is deductible. Keep a logbook or note the trips this covers.`,
      confidenceReason: "Fuel purchases are common for both work and personal driving — a logbook is the best way to confirm the work portion.",
    };
  }

  return {
    reason:           `The description mentions "${keyword}", which could be a work travel expense. If this trip was for work, you can claim it — regular commutes don't qualify.`,
    confidenceReason: isStrong
      ? "The description explicitly mentions work or business travel — a strong signal."
      : "Keyword matched, but travel expenses often mix personal and work trips — confirm this was a work-related journey.",
  };
}

export const detectTravel: Rule = { priority: 3, detect, explain };
