// Category:   Work Travel
// Confidence: MEDIUM for explicit work-travel keywords, fuel merchants, or parking merchants
//             LOW for transport merchants without a work keyword, or general travel keywords
// ATO note:   Travel between home and work is generally NOT deductible.
//             Fuel and parking require confirmation that the trip was work-related.

import type { Rule, RawMatch, Explanation } from "./types";
import { CATEGORIES } from "./categories";
import { merchantText, combinedText, matchesMerchant } from "./shared";
import { getMerchantsForCategory, getMerchantInfo } from "../merchants";

// Services from transport-adjacent brands that are NOT work travel
const TRANSPORT_EXCLUSIONS = [
  "eats",
  "food",
  "grocery",
  "delivery",
];

// Keywords that confirm a fuel purchase at a convenience merchant.
const FUEL_KEYWORDS = ["fuel", "petrol", "diesel", "unleaded"];

// Explicit work-intent phrases — strong enough for MEDIUM on their own regardless
// of whether a transport merchant is present.
const INTENT_KEYWORDS = [
  "work trip",
  "business travel",
];

// Context amplifiers — only upgrade to MEDIUM when a recognised transport or
// accommodation merchant is also present. Without a merchant signal, "airport",
// "conference", or "client meeting" in a description most likely belongs to a
// different category (e.g. Professional Development registration fee) rather
// than a Work Travel claim.
const CONTEXT_AMPLIFIERS = [
  "airport",
  "client meeting",
  "conference",
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
  "train ticket",
  "bus ticket",
  "ferry",
  "taxi",
  "rideshare",
];

function detect(tx: { normalizedMerchant: string; description: string }, userType?: string | null): RawMatch | null {
  const merchant = merchantText(tx);
  const combined = combinedText(tx);

  const transportMerchants     = getMerchantsForCategory(CATEGORIES.WORK_TRAVEL, "transport",     userType);
  const fuelMerchants          = getMerchantsForCategory(CATEGORIES.WORK_TRAVEL, "fuel",          userType);
  const convenienceMerchants   = getMerchantsForCategory(CATEGORIES.WORK_TRAVEL, "convenience",   userType);
  const parkingMerchants       = getMerchantsForCategory(CATEGORIES.WORK_TRAVEL, "parking",       userType);
  const accommodationMerchants = getMerchantsForCategory(CATEGORIES.WORK_TRAVEL, "accommodation", userType);

  const isExcludedTransport = TRANSPORT_EXCLUSIONS.some((e) => combined.includes(e));
  const isTransport = !isExcludedTransport && transportMerchants.some((m) => matchesMerchant(merchant, m));

  const hasFuelKeyword = FUEL_KEYWORDS.some((k) => combined.includes(k));
  const isFuel = !isTransport && (
    fuelMerchants.some((m) => matchesMerchant(merchant, m)) ||
    (convenienceMerchants.some((m) => matchesMerchant(merchant, m)) && hasFuelKeyword)
  );

  const isParking = !isTransport && !isFuel &&
    parkingMerchants.some((m) => matchesMerchant(merchant, m));

  const isAccommodation = !isTransport && !isFuel && !isParking &&
    accommodationMerchants.some((m) => matchesMerchant(merchant, m));

  const hasMerchantSignal = isTransport || isFuel || isParking || isAccommodation;

  // Context amplifiers only count when a recognised merchant is present.
  const ampKeyword    = hasMerchantSignal ? CONTEXT_AMPLIFIERS.find((k) => combined.includes(k)) : undefined;
  const intentKeyword = INTENT_KEYWORDS.find((k) => combined.includes(k));
  const weakKeyword   = WEAK_KEYWORDS.find((k) => combined.includes(k));
  const keyword       = intentKeyword ?? ampKeyword ?? weakKeyword;
  const isStrong      = !!intentKeyword || !!ampKeyword;

  if (!hasMerchantSignal && !intentKeyword && !weakKeyword) return null;

  // Fuel and parking are high-commuting-risk categories: deductible only for work
  // travel, not commutes. Return MEDIUM so they're visible for review, but set
  // commutingRisk=true so the scoring layer keeps them out of the estimate total
  // until the user explicitly confirms work-related use.
  const isCommutingRisk = isFuel || isParking;
  const confidence = isCommutingRisk ? "MEDIUM" : isStrong ? "MEDIUM" : "LOW";

  return {
    category:  CATEGORIES.WORK_TRAVEL,
    confidence,
    signals:   { isTransport, isFuel, isParking, isAccommodation, keyword, isStrong, commutingRisk: isCommutingRisk },
  };
}

function explain(match: RawMatch, tx: { normalizedMerchant: string }, userType?: string | null): Explanation {
  const { isTransport, isFuel, isParking, isAccommodation, keyword, isStrong } = match.signals;
  const isBusiness = userType === "contractor" || userType === "sole_trader";
  const context    = isBusiness ? "business" : "work";

  if (isTransport) {
    const info = getMerchantInfo(tx.normalizedMerchant);
    const desc = info?.description.toLowerCase() ?? "";
    const isFlight  = desc.includes("flight");
    const isCarHire = desc.includes("car hire") || desc.includes("car share");

    if (isFlight) {
      return {
        reason: `${tx.normalizedMerchant} is an airline. If this was a flight for ${context} — attending meetings, visiting clients, or travel your ${context} requires — it's deductible. Personal and holiday flights don't count. Check that this was a genuine work trip.`,
        confidenceReason: "Recognised airline, but work flights and personal travel look identical in the data. Confirm this was a work trip.",
      };
    }

    if (isCarHire) {
      return {
        reason: `${tx.normalizedMerchant} is a car hire service. If this hire was for ${context} travel, it's deductible. Keep the rental agreement and note the ${context} reason for the trip.`,
        confidenceReason: "Car hire for work travel is claimable, but personal or mixed-use hires aren't. Confirm this was a work trip.",
      };
    }

    return {
      reason: `${tx.normalizedMerchant} is a transport provider. If this trip was for ${context} — visiting clients, travelling between sites, attending meetings — it's deductible. Your regular commute doesn't count. Check this was a genuine ${context} journey.`,
      confidenceReason: "Recognised transport provider, but work trips and commutes look identical in the data. Confirm this was a work journey, not the daily commute.",
    };
  }

  if (isFuel) {
    return {
      reason: `Fuel may be deductible for ${context} driving — but not your regular commute between home and your usual workplace. Confirm this was for ${context} travel. The ATO requires a logbook or detailed trip records to support fuel claims.`,
      confidenceReason: "Fuel and parking are only deductible for work-related travel, not commuting. Confirm this was for work travel before claiming.",
      mixedUse: true,
    };
  }

  if (isParking) {
    return {
      reason: `Parking fees may be deductible when the parking is for ${context} travel — for example, parking at a client site, conference, or work location other than your usual workplace. Parking at your regular workplace is not deductible. Confirm this was for ${context}.`,
      confidenceReason: "Fuel and parking are only deductible for work-related travel, not commuting. Confirm this was for work travel before claiming.",
      mixedUse: true,
    };
  }

  if (isAccommodation) {
    return {
      reason: `${tx.normalizedMerchant} is an accommodation provider. If this stay was for a ${context} trip, the cost is deductible. Personal trips don't qualify — keep your booking confirmation and note the ${context} reason for the trip.`,
      confidenceReason: "Recognised accommodation provider. Work stays are claimable, but personal bookings look identical in the data. Confirm this was a work trip.",
    };
  }

  return {
    reason: isStrong
      ? `The description says "${keyword}", which is a clear sign this may be a ${context} travel claim. Confirm the trip was for ${context}. Personal travel and commuting don't count.`
      : `This could be a ${context} travel expense, but "${keyword}" is also common for personal trips. Only claim it if this was a ${context} journey — not a commute or holiday.`,
    confidenceReason: isStrong
      ? "Explicit work travel language in the description. A strong signal."
      : "Travel keyword matched, but personal trips look identical. Confirm this was a work trip before claiming.",
  };
}

export const detectTravel: Rule = { priority: 3, detect, explain };
