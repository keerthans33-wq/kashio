// Category:   Office Supplies
// Confidence: MEDIUM when a specialist office retailer AND a supply/furniture keyword both match
//             LOW for broad retailers, keyword-only, or utility-bill matches
// Note:       Merchant-only matches are not flagged — even specialist stores
//             sell a wide range of items with no obvious work connection.
//             Electricity bills: LOW for non-employees only; employees should use
//             the WFH 67¢/hr fixed rate instead to avoid double-counting.
//             mixedUse is always true.

import type { Rule, RawMatch, Explanation } from "./types";
import { CATEGORIES } from "./categories";
import { merchantText, combinedText, matchesMerchant } from "./shared";
import { getMerchantsForCategory, getMerchantInfo } from "../merchants";

const SUPPLY_KEYWORDS = [
  "stationery",
  "office supplies",
  "ink cartridge",
  "toner",
  "printer paper",
];

const FURNITURE_KEYWORDS = [
  "office chair",
  "desk chair",
  "ergonomic chair",
  "office desk",
];

// Only surfaced for non-employees; keep LOW regardless of merchant.
const UTILITY_KEYWORDS = [
  "electricity bill",
  "energy bill",
  "power bill",
];

function detect(tx: { normalizedMerchant: string; description: string }, userType?: string | null): RawMatch | null {
  const combined = combinedText(tx);
  const merchant = merchantText(tx);

  // ── Utility bills (electricity) — non-employees only ───────────────────────
  // Employees claim home-office electricity via the 67¢/hr WFH rate.
  // Contractors and sole traders may deduct a work-use proportion under the actual method.
  if (userType !== "employee") {
    const utilityKeyword = UTILITY_KEYWORDS.find((k) => combined.includes(k));
    const utilityMerchants = getMerchantsForCategory(CATEGORIES.OFFICE_SUPPLIES, "utility", userType);
    const isUtility = utilityMerchants.some((m) => matchesMerchant(merchant, m));

    if (utilityKeyword || isUtility) {
      return {
        category:   CATEGORIES.OFFICE_SUPPLIES,
        confidence: "LOW",
        canUpgrade: false,
        signals:    { isUtility: true, keyword: utilityKeyword ?? undefined, utilityMerchant: isUtility },
      };
    }
  }

  // ── Furniture keywords (office chair, desk) ────────────────────────────────
  const furnitureKeyword = FURNITURE_KEYWORDS.find((k) => combined.includes(k));
  if (furnitureKeyword) {
    const specialistMerchants = getMerchantsForCategory(CATEGORIES.OFFICE_SUPPLIES, "specialist", userType);
    const merchantMatch = specialistMerchants.some((m) => matchesMerchant(merchant, m));
    return {
      category:   CATEGORIES.OFFICE_SUPPLIES,
      confidence: merchantMatch ? "MEDIUM" : "LOW",
      canUpgrade: merchantMatch,
      signals:    { isFurniture: true, merchantMatch, keyword: furnitureKeyword },
    };
  }

  // ── Supply keywords (stationery, ink, etc.) ────────────────────────────────
  const supplyKeyword = SUPPLY_KEYWORDS.find((k) => combined.includes(k));
  if (!supplyKeyword) return null;

  const specialistMerchants = getMerchantsForCategory(CATEGORIES.OFFICE_SUPPLIES, "specialist", userType);
  const merchantMatch = specialistMerchants.some((m) => matchesMerchant(merchant, m));

  return {
    category:   CATEGORIES.OFFICE_SUPPLIES,
    confidence: merchantMatch ? "MEDIUM" : "LOW",
    canUpgrade: merchantMatch,
    signals:    { merchantMatch, keyword: supplyKeyword },
  };
}

function explain(match: RawMatch, tx: { normalizedMerchant: string }, userType?: string | null): Explanation {
  const { isUtility, isFurniture, merchantMatch, keyword, utilityMerchant } = match.signals;
  const context   = userType === "sole_trader" ? "your business" : "your work";
  const supplies  = userType === "employee" ? "Office supplies" : "Business supplies";
  const qualifier = userType === "employee"
    ? "are deductible if not reimbursed by your employer"
    : "are a deductible business expense";

  // ── Utility bill explanation ───────────────────────────────────────────────
  if (isUtility) {
    const isBusiness = userType === "sole_trader";
    const proportion = isBusiness
      ? "Claim the proportion used for your business — calculate this based on the floor area of your home office as a percentage of your home's total area."
      : "Estimate the work-use proportion based on the time you use the space for work.";
    if (utilityMerchant) {
      const info = getMerchantInfo(tx.normalizedMerchant);
      const what = info?.description.split(". ")[0].replace(/\.$/, "").toLowerCase() ?? "electricity and gas";
      return {
        reason:           `${tx.normalizedMerchant} is ${/^[aeiou]/i.test(what) ? "an" : "a"} ${what} provider. If you have a dedicated home office, the work-use portion of your electricity bill may be a potential deduction. ${proportion} Do not also claim this under the 67¢/hr fixed rate — choose one method and stick to it.`,
        confidenceReason: "Recognised energy provider. Home office electricity can be a potential deduction for non-employees, but only the work-use proportion qualifies.",
        mixedUse: true,
      };
    }
    return {
      reason:           `A home office electricity expense could be a potential deduction if you have a dedicated work space. ${proportion} Do not also claim this under the 67¢/hr fixed rate — use one method only.`,
      confidenceReason: "Electricity bill keyword matched. Home office running costs may qualify, but only under the actual expenses method — not alongside the fixed rate.",
      mixedUse: true,
    };
  }

  // ── Furniture explanation ──────────────────────────────────────────────────
  if (isFurniture) {
    if (merchantMatch) {
      const info = getMerchantInfo(tx.normalizedMerchant);
      const what = info?.description.split(". ")[0].replace(/\.$/, "").toLowerCase() ?? "office furniture";
      return {
        reason:           `${tx.normalizedMerchant} sells ${what}. A ${keyword} used exclusively for ${context} is potentially deductible — if you also use it personally, only the work-use proportion qualifies.`,
        confidenceReason: "Recognised office or furniture retailer and a home office keyword. Two signals pointing to a potential work purchase.",
        mixedUse: true,
      };
    }
    return {
      reason:           `A ${keyword} used for ${context} is potentially deductible — but only the work-use proportion if you also use it personally. Check before claiming.`,
      confidenceReason: "Home office keyword matched. Could be a work expense, but without a recognised office retailer it's harder to confirm.",
      mixedUse: true,
    };
  }

  // ── Supplies explanation ───────────────────────────────────────────────────
  if (merchantMatch) {
    const info = getMerchantInfo(tx.normalizedMerchant);
    const what = info?.description.split(". ")[0].replace(/\.$/, "").toLowerCase() ?? "office supplies and stationery";
    return {
      reason:           `${tx.normalizedMerchant} sells ${what}. ${supplies} bought for ${context} ${qualifier} — if this ${keyword} was for home rather than ${context}, it won't qualify.`,
      confidenceReason: "Recognised office retailer and a matching supply keyword. Two signals pointing to a potential work purchase.",
      mixedUse: true,
    };
  }

  return {
    reason:           `${typeof keyword === "string" ? keyword.charAt(0).toUpperCase() + keyword.slice(1) : "This item"} bought for ${context} ${qualifier}, but without a recognised office store this is harder to confirm. Check before claiming.`,
    confidenceReason: "Supply keyword matched, but not from a recognised office retailer. Could be from a non-work purchase.",
  };
}

export const detectOfficeSupplies: Rule = { priority: 4, detect, explain };
