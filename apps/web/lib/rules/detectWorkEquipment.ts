// Category:   Office Supplies & Equipment
// Confidence: MEDIUM for strong-signal keywords (rarely bought for personal use)
//             LOW for weak-signal keywords (common in gaming/personal contexts)
// Note:       Weak keywords require either a tech merchant match or the keyword
//             to appear in the transaction description — prevents noisy matches
//             from merchants whose names happen to contain the word.

import type { Rule, RawMatch, Explanation } from "./types";
import { CATEGORIES } from "./categories";
import { merchantText, combinedText } from "./shared";

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

// Known tech retailers — a merchant match strengthens a weak keyword signal.
const TECH_MERCHANTS = [
  "jb hi-fi",
  "jb hifi",
  "harvey norman",
  "officeworks",
  "apple",
  "umart",
  "centre com",
  "mwave",
  "scorptec",
  "pccasegear",
  "ple computers",
];

function detect(tx: { normalizedMerchant: string; description: string }): RawMatch | null {
  const combined = combinedText(tx);

  const keyword = ALL_KEYWORDS.find((k) => combined.includes(k));
  if (!keyword) return null;

  const isStrong    = STRONG_KEYWORDS.includes(keyword);
  const inDesc      = tx.description.toLowerCase().includes(keyword);
  const techMerchant = TECH_MERCHANTS.some((m) => merchantText(tx).includes(m));

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
  const isBusiness  = userType === "contractor" || userType === "sole_trader";
  const useContext  = isBusiness ? "your business" : "your job";
  const forWork     = isBusiness ? "for business" : "for work";

  if (techMerchant) {
    return {
      reason: isStrong
        ? `A ${keyword} from ${tx.normalizedMerchant} used ${forWork} is deductible. If you also use it personally, you can only claim the proportion used ${forWork}.`
        : `If this ${keyword} from ${tx.normalizedMerchant} is mainly used for ${useContext}, the cost is deductible. Personal or gaming use means only the work proportion counts.`,
      confidenceReason: isStrong
        ? "Specialist item from a tech retailer. A strong signal for a work purchase."
        : "Tech retailer and matching item type. Reasonable, but this item is also commonly bought for personal or gaming use.",
      mixedUse: !isStrong,
    };
  }

  return {
    reason: isStrong
      ? `A ${keyword} used for ${useContext} is deductible. If you also use it personally, only the work-use proportion can be claimed.`
      : `If this ${keyword} is used primarily for ${useContext}, the cost is deductible. Personal or gaming use means you can only claim the work-use portion.`,
    confidenceReason: isStrong
      ? "This item is rarely bought for personal use. A reasonably strong work signal."
      : "Matches a work keyword, but also commonly bought for personal or gaming use. Confirm it's primarily for work.",
    mixedUse: !isStrong,
  };
}

// Priority 5: higher than detectOfficeSupplies (4) so that a tech-equipment
// keyword from a shared retailer like Officeworks wins the category tie.
export const detectWorkEquipment: Rule = { priority: 5, detect, explain };
