// Category:   Work Travel
// Confidence: MEDIUM for explicit work-travel keywords (alone or alongside a transport merchant)
//             LOW for transport/fuel merchants without a work keyword, or general travel keywords
// ATO note:   Travel between home and work is generally NOT deductible.

import type { Rule, RawMatch, Explanation } from "./types";
import { CATEGORIES } from "./categories";
import { merchantText, combinedText, matchesMerchant } from "./shared";
import { getMerchantsForCategory, getMerchantInfo } from "../merchants";
import { userTypeNote } from "./userTypeLayer";

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

function detect(tx: { normalizedMerchant: string; description: string }, userType?: string | null): RawMatch | null {
  const merchant = merchantText(tx);
  const combined = combinedText(tx);

  const transportMerchants      = getMerchantsForCategory(CATEGORIES.WORK_TRAVEL, "transport",     userType);
  const fuelMerchants           = getMerchantsForCategory(CATEGORIES.WORK_TRAVEL, "fuel",          userType);
  const convenienceMerchants    = getMerchantsForCategory(CATEGORIES.WORK_TRAVEL, "convenience",   userType);
  const accommodationMerchants  = getMerchantsForCategory(CATEGORIES.WORK_TRAVEL, "accommodation", userType);

  const isExcludedTransport = TRANSPORT_EXCLUSIONS.some((e) => combined.includes(e));
  const isTransport     = !isExcludedTransport && transportMerchants.some((m) => matchesMerchant(merchant, m));

  const hasFuelKeyword = FUEL_KEYWORDS.some((k) => combined.includes(k));
  const isFuel = !isTransport && (
    fuelMerchants.some((m) => matchesMerchant(merchant, m)) ||
    (convenienceMerchants.some((m) => matchesMerchant(merchant, m)) && hasFuelKeyword)
  );

  const isAccommodation = !isTransport && !isFuel && accommodationMerchants.some((m) => matchesMerchant(merchant, m));

  const keyword  = ALL_KEYWORDS.find((k) => combined.includes(k));
  const isStrong = keyword ? STRONG_KEYWORDS.includes(keyword) : false;

  if (!isTransport && !isFuel && !isAccommodation && !keyword) return null;

  // Transport merchant alone can't distinguish work travel from commuting — require a strong
  // keyword to reach MEDIUM. Fuel, accommodation, and general keywords stay LOW regardless.
  return {
    category:   CATEGORIES.WORK_TRAVEL,
    confidence: isStrong ? "MEDIUM" : "LOW",
    signals:    { isTransport, isFuel, isAccommodation, keyword, isStrong },
  };
}

function explain(match: RawMatch, tx: { normalizedMerchant: string }, userType?: string | null): Explanation {
  const { isTransport, isFuel, isAccommodation, keyword, isStrong } = match.signals;
  const isBusiness = userType === "contractor" || userType === "sole_trader";
  const tn = userTypeNote(CATEGORIES.WORK_TRAVEL, userType);

  if (isTransport) {
    // Use merchant knowledge to tailor the explanation: flights vs rideshare/transit vs car hire.
    const info = getMerchantInfo(tx.normalizedMerchant);
    const desc = info?.description.toLowerCase() ?? "";
    const isFlight   = desc.includes("flight");
    const isCarHire  = desc.includes("car hire") || desc.includes("car share");

    if (isFlight) {
      const cr = `Recognised airline, but work flights and personal travel look identical in the data. Confirm this was a work trip.${tn ? ` ${tn}` : ""}`;
      return {
        reason: isBusiness
          ? `${tx.normalizedMerchant} is an airline. If this was a flight for business — attending meetings, visiting clients, or travel your business requires — it's deductible. Personal and holiday flights don't count. Check that this was a genuine work trip.`
          : `${tx.normalizedMerchant} is an airline. If this was a flight for work — attending meetings, visiting clients, or travel your job requires — it's deductible. Personal trips and holidays don't qualify. Check before claiming.`,
        confidenceReason: cr,
      };
    }

    if (isCarHire) {
      const cr = `Car hire for work travel is claimable, but personal or mixed-use hires aren't. Confirm this was a work trip.${tn ? ` ${tn}` : ""}`;
      return {
        reason: isBusiness
          ? `${tx.normalizedMerchant} is a car hire service. If this hire was for business travel, it's deductible. Keep the rental agreement and note the business reason for the trip.`
          : `${tx.normalizedMerchant} is a car hire service. If this hire was for work travel, it's deductible. Keep the rental agreement and note the work reason for the trip.`,
        confidenceReason: cr,
      };
    }

    const cr = `Recognised transport provider, but work trips and commutes look identical in the data. Confirm this was a work journey, not the daily commute.${tn ? ` ${tn}` : ""}`;
    return {
      reason: isBusiness
        ? `${tx.normalizedMerchant} is a transport provider. If this trip was for business — visiting clients, travelling between sites, attending meetings — it's deductible. A regular commute generally doesn't count. Check this was a genuine business journey.`
        : `${tx.normalizedMerchant} is a transport provider. If this trip was for work — visiting clients, travelling between job sites, attending work events — it's deductible. Your regular commute doesn't count. Check this was a genuine work journey.`,
      confidenceReason: cr,
    };
  }

  if (isAccommodation) {
    const cr = `Recognised accommodation provider. Work stays are claimable, but personal bookings look identical in the data. Confirm this was a work trip.${tn ? ` ${tn}` : ""}`;
    return {
      reason: isBusiness
        ? `${tx.normalizedMerchant} is an accommodation provider. If this stay was for a business trip, the cost is deductible. Personal travel doesn't qualify — keep your booking confirmation and note the business reason for the trip.`
        : `${tx.normalizedMerchant} is an accommodation provider. If this stay was for work travel, the cost is deductible. Personal trips don't qualify — keep your booking confirmation and note the work reason for the trip.`,
      confidenceReason: cr,
    };
  }

  if (isFuel) {
    const info = getMerchantInfo(tx.normalizedMerchant);
    const what = info?.description.split(". ")[0].replace(/\.$/, "").toLowerCase() ?? null;
    const storeLabel = what ?? "mainly a fuel station";
    const article    = what && /^[aeiou]/i.test(what) ? "an" : "a";
    const cr = `Fuel station recognised, but without a fuel keyword we can't confirm this was a fuel purchase rather than a food or convenience buy. Fuel is also used for both work and personal driving.${tn ? ` ${tn}` : ""}`;
    return {
      reason: isBusiness
        ? `${tx.normalizedMerchant} is ${article} ${storeLabel}. If this was a fuel purchase for business driving, the cost is deductible. Check your receipt, and keep a logbook or trip notes to show the drive was for business.`
        : `${tx.normalizedMerchant} is ${article} ${storeLabel}. If this was fuel for work-related driving, the cost is deductible — but not your commute to a regular workplace. Keep a logbook or trip notes to support the claim.`,
      confidenceReason: cr,
    };
  }

  const cr = isStrong
    ? `Explicit work travel language in the description. A strong signal.${tn ? ` ${tn}` : ""}`
    : `Travel keyword matched, but personal trips look identical. Confirm this was a work trip before claiming.${tn ? ` ${tn}` : ""}`;
  return {
    reason: isStrong
      ? `The description says "${keyword}", which is a clear sign this may be a ${isBusiness ? "business travel" : "work travel"} claim. Confirm the trip was for ${isBusiness ? "business" : "work"}. Personal travel and commuting don't count.`
      : `This could be a ${isBusiness ? "business travel expense" : "work travel expense"}, but ${keyword} is also common for personal trips. Only claim it if this was a ${isBusiness ? "business journey" : "work journey"}. Not a commute or holiday.`,
    confidenceReason: cr,
  };
}

export const detectTravel: Rule = { priority: 3, detect, explain };
