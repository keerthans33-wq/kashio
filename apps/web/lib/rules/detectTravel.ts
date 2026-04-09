// Category:   Work-Related Travel
// Confidence: MEDIUM for known transport merchants (strong signal)
//             LOW for keyword-only matches (could be personal)
// Detects:    Work travel including fuel, public transport, rideshare, parking
// ATO note:   Travel between home and work is generally NOT deductible.
//             This rule flags likely work-related travel for user confirmation.

import type { Rule } from "./types";
import { CATEGORIES } from "./categories";
import { isExcluded } from "./shared";

// Rideshare and transport merchants with high work-use overlap
const MERCHANTS = [
  "uber",
  "ola",
  "didi",
  "13cabs",
  "ingogo",
  "opal",       // NSW public transport
  "myki",       // VIC public transport
  "go card",    // QLD
  "metrocard",  // SA/WA
  "airportlink",
];

// Fuel merchants
const FUEL_MERCHANTS = [
  "bp",
  "shell",
  "caltex",
  "ampol",
  "7-eleven",
  "united petroleum",
  "puma energy",
];

const TRAVEL_KEYWORDS = [
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
  "work trip",
  "business travel",
];

export const detectTravel: Rule = (transaction) => {
  if (transaction.amount >= 0) return null;
  if (isExcluded(transaction.description)) return null;

  const merchant = transaction.normalizedMerchant.toLowerCase();
  const desc     = transaction.description.toLowerCase();

  const isFuelMerchant    = FUEL_MERCHANTS.some((m) => merchant.includes(m));
  const isTransportMerchant = MERCHANTS.some((m) => merchant.includes(m));
  const matchedKeyword    = TRAVEL_KEYWORDS.find((k) => desc.includes(k) || merchant.includes(k));

  if (!isFuelMerchant && !isTransportMerchant && !matchedKeyword) return null;

  if (isTransportMerchant) {
    return {
      category:   CATEGORIES.WORK_TRAVEL,
      confidence: "MEDIUM",
      reason:     `${transaction.normalizedMerchant} is a transport provider. If this trip was for work — visiting a client, attending a site, or travelling between work locations — you can claim it. Commuting to your regular workplace doesn't qualify.`,
      confidenceReason: "Recognised transport merchant — likely work travel, but commuting trips look the same and aren't deductible.",
    };
  }

  if (isFuelMerchant) {
    return {
      category:   CATEGORIES.WORK_TRAVEL,
      confidence: "LOW",
      reason:     `${transaction.normalizedMerchant} is a fuel station. If you drove for work — not your regular commute — the fuel cost is deductible. Keep a logbook or note the trips this covers.`,
      confidenceReason: "Fuel purchases are common for both work and personal driving — a logbook is the best way to confirm the work portion.",
    };
  }

  return {
    category:   CATEGORIES.WORK_TRAVEL,
    confidence: "LOW",
    reason:     `The description mentions "${matchedKeyword}", which could be a work travel expense. If this trip was for work, you can claim it — regular commutes don't qualify.`,
    confidenceReason: "Keyword matched, but travel expenses often mix personal and work trips — confirm this was a work-related journey.",
  };
};
