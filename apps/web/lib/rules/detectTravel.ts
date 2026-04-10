// Category:   Work Travel
// Confidence: MEDIUM for explicit work-travel keywords (alone or alongside a transport merchant)
//             LOW for transport/fuel merchants without a work keyword, or general travel keywords
// ATO note:   Travel between home and work is generally NOT deductible.

import type { Rule, RawMatch, Explanation } from "./types";
import { CATEGORIES } from "./categories";
import { merchantText, combinedText, matchesMerchant } from "./shared";
import { getMerchantsForCategory, getMerchantInfo } from "../merchants";

const TRANSPORT_MERCHANTS    = getMerchantsForCategory(CATEGORIES.WORK_TRAVEL, "transport");
const FUEL_MERCHANTS         = getMerchantsForCategory(CATEGORIES.WORK_TRAVEL, "fuel");
const CONVENIENCE_MERCHANTS  = getMerchantsForCategory(CATEGORIES.WORK_TRAVEL, "convenience");

// Services from transport-adjacent brands that are NOT work travel
const TRANSPORT_EXCLUSIONS = [
  "eats",
  "food",
  "grocery",
  "delivery",
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

function explain(match: RawMatch, tx: { normalizedMerchant: string }, userType?: string | null): Explanation {
  const { isTransport, isFuel, keyword, isStrong } = match.signals;
  const isBusiness = userType === "contractor" || userType === "sole_trader";

  if (isTransport) {
    // Use merchant knowledge to tailor the explanation: flights vs rideshare/transit vs car hire.
    const info = getMerchantInfo(tx.normalizedMerchant);
    const desc = info?.description.toLowerCase() ?? "";
    const isFlight   = desc.includes("flight");
    const isCarHire  = desc.includes("car hire") || desc.includes("car share");

    if (isFlight) {
      return {
        reason: isBusiness
          ? `${tx.normalizedMerchant} is an airline. If this was a flight for business — attending meetings, visiting clients, or travel your business requires — it's deductible. Personal and holiday flights don't count. Check that this was a genuine work trip.`
          : `${tx.normalizedMerchant} is an airline. If this was a flight for work — attending meetings, visiting clients, or travel your job requires — it's deductible. Personal trips and holidays don't qualify. Check before claiming.`,
        confidenceReason: "Recognised airline, but work flights and personal travel look identical in the data. Confirm this was a work trip.",
      };
    }

    if (isCarHire) {
      return {
        reason: isBusiness
          ? `${tx.normalizedMerchant} is a car hire service. If this hire was for business travel, it's deductible. Keep the rental agreement and note the business reason for the trip.`
          : `${tx.normalizedMerchant} is a car hire service. If this hire was for work travel, it's deductible. Keep the rental agreement and note the work reason for the trip.`,
        confidenceReason: "Car hire for work travel is claimable, but personal or mixed-use hires aren't. Confirm this was a work trip.",
      };
    }

    return {
      reason: isBusiness
        ? `${tx.normalizedMerchant} is a transport provider. If this trip was for business — visiting clients, travelling between sites, attending meetings — it's deductible. A regular commute generally doesn't count. Check this was a genuine business journey.`
        : `${tx.normalizedMerchant} is a transport provider. If this trip was for work — visiting clients, travelling between job sites, attending work events — it's deductible. Your regular commute doesn't count. Check this was a genuine work journey.`,
      confidenceReason: "Recognised transport provider, but work trips and commutes look identical in the data. Confirm this was a work journey, not the daily commute.",
    };
  }

  if (isFuel) {
    return {
      reason: isBusiness
        ? `${tx.normalizedMerchant} is mainly a fuel station. If this was a fuel purchase for business driving, the cost is deductible. We can't see the exact purchase — check your receipt, and keep a logbook or trip notes to show the drive was for business.`
        : `${tx.normalizedMerchant} is mainly a fuel station. If this was fuel for work-related driving, the cost is deductible — but not your commute to a regular workplace. Check your receipt, and keep a logbook or trip notes to support the claim.`,
      confidenceReason: "Fuel station recognised, but without a fuel keyword we can't confirm this was a fuel purchase rather than a food or convenience buy. Fuel is also used for both work and personal driving.",
    };
  }

  return {
    reason: isStrong
      ? `The description says "${keyword}", which is a clear sign this may be a ${isBusiness ? "business travel" : "work travel"} claim. Confirm the trip was for ${isBusiness ? "business" : "work"}. Personal travel and commuting don't count.`
      : `This could be a ${isBusiness ? "business travel expense" : "work travel expense"}, but ${keyword} is also common for personal trips. Only claim it if this was a ${isBusiness ? "business journey" : "work journey"}. Not a commute or holiday.`,
    confidenceReason: isStrong
      ? "Explicit work travel language in the description. A strong signal."
      : "Travel keyword matched, but personal trips look identical. Confirm this was a work trip before claiming.",
  };
}

export const detectTravel: Rule = { priority: 3, detect, explain };
