// Category:   Office Supplies & Equipment
// Confidence: MEDIUM for strong-signal keywords (rarely bought for personal use)
//             LOW for weak-signal keywords (common in gaming/personal contexts)
// Note:       Weak keywords require either a tech merchant match or the keyword
//             to appear in the transaction description — prevents noisy matches
//             from merchants whose names happen to contain the word.

import type { Rule, RawMatch, Explanation } from "./types";
import { CATEGORIES } from "./categories";
import { merchantText, combinedText, matchesMerchant } from "./shared";
import { getMerchantsForCategory, getMerchantInfo } from "../merchants";
import { useContext, forPurpose, userTypeNote } from "./userTypeLayer";

// Rarely bought for personal use — stronger work signal
const STRONG_KEYWORDS = [
  "docking station",
  "standing desk",
  "usb hub",
];

// Common in gaming/personal contexts too — weaker signal
const WEAK_KEYWORDS = [
  "webcam",
  "hard drive",
  "monitor",
  "keyboard",
];

const ALL_KEYWORDS = [...STRONG_KEYWORDS, ...WEAK_KEYWORDS];

function detect(tx: { normalizedMerchant: string; description: string }, userType?: string | null): RawMatch | null {
  const combined = combinedText(tx);

  const keyword = ALL_KEYWORDS.find((k) => combined.includes(k));
  if (!keyword) return null;

  // Known tech retailers — a merchant match strengthens a weak keyword signal.
  const techMerchants = getMerchantsForCategory(CATEGORIES.EQUIPMENT, "tech_retailer", userType);
  const isStrong      = STRONG_KEYWORDS.includes(keyword);
  const inDesc        = tx.description.toLowerCase().includes(keyword);
  const techMerchant  = techMerchants.some((m) => matchesMerchant(merchantText(tx), m));

  // Weak keywords need a corroborating signal — either a tech merchant or the
  // keyword present in the description (not just in the merchant name).
  if (!isStrong && !techMerchant && !inDesc) return null;

  return {
    category:   CATEGORIES.EQUIPMENT,
    confidence: isStrong ? "MEDIUM" : "LOW",
    signals:    { keyword, inDesc, isStrong, techMerchant },
  };
}

function explain(match: RawMatch, tx: { normalizedMerchant: string }, userType?: string | null): Explanation {
  const { keyword, isStrong, techMerchant } = match.signals;
  const ctx    = useContext(userType);
  const forW   = forPurpose(userType);
  const tn     = userTypeNote(CATEGORIES.EQUIPMENT, userType);

  // Employee-specific caveat: check it isn't employer-supplied.
  const employerNote = userType === "employee"
    ? " Check that this isn't supplied or reimbursed by your employer."
    : "";

  if (techMerchant) {
    const info = getMerchantInfo(tx.normalizedMerchant);
    const what = info
      ? info.description.split(". ")[0].replace(/\.$/, "").toLowerCase()
      : "electronics and computers";
    const baseConfidence = isStrong
      ? "Specialist item from a tech retailer. A strong signal for a work purchase."
      : "Tech retailer and matching item type. Reasonable, but this item is also commonly bought for personal or gaming use.";
    return {
      reason: isStrong
        ? `${tx.normalizedMerchant} sells ${what}. If this ${keyword} is used ${forW}, it's deductible — if you also use it personally, only the work-use proportion can be claimed.${employerNote}`
        : `${tx.normalizedMerchant} sells ${what}. If this ${keyword} is mainly used for ${ctx}, the cost is deductible. Personal or gaming use means only the work proportion counts.${employerNote}`,
      confidenceReason: tn ? `${baseConfidence} ${tn}` : baseConfidence,
      mixedUse: true,
    };
  }

  const baseConfidence = isStrong
    ? "This item is rarely bought for personal use. A reasonably strong work signal."
    : "Matches a work keyword, but also commonly bought for personal or gaming use. Confirm it's primarily for work.";

  return {
    reason: isStrong
      ? `A ${keyword} used for ${ctx} is deductible. If you also use it personally, only the work-use proportion can be claimed.${employerNote}`
      : `If this ${keyword} is used primarily for ${ctx}, the cost is deductible. Personal or gaming use means you can only claim the work-use portion.${employerNote}`,
    confidenceReason: tn ? `${baseConfidence} ${tn}` : baseConfidence,
    mixedUse: !isStrong,
  };
}

// Priority 5: higher than detectOfficeSupplies (4) so that a tech-equipment
// keyword from a shared retailer like Officeworks wins the category tie.
export const detectWorkEquipment: Rule = { priority: 5, detect, explain };
