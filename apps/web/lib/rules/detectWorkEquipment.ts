// Category:   Office Supplies & Equipment
// Confidence: MEDIUM for strong-signal keywords (rarely bought for personal use)
//             LOW for weak-signal keywords (common in gaming/personal contexts)

import type { Rule, RawMatch, Explanation } from "./types";
import { CATEGORIES } from "./categories";
import { combinedText } from "./shared";

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

function detect(tx: { normalizedMerchant: string; description: string }): RawMatch | null {
  const combined = combinedText(tx);

  const keyword = ALL_KEYWORDS.find((k) => combined.includes(k));
  if (!keyword) return null;

  const inDesc = tx.description.toLowerCase().includes(keyword);
  const isStrong  = STRONG_KEYWORDS.includes(keyword);

  return {
    category:   CATEGORIES.OFFICE_SUPPLIES,
    confidence: isStrong ? "MEDIUM" : "LOW",
    signals:    { keyword, inDesc, isStrong },
  };
}

function explain(match: RawMatch): Explanation {
  const { keyword, inDesc, isStrong } = match.signals;
  return {
    reason: inDesc
      ? `The description mentions a ${keyword}. If you use it mainly for work, you can claim it. If it's also used personally, only the work-use portion qualifies.`
      : `This purchase may include a ${keyword}. Work equipment is deductible — if you also use it personally, only the work proportion can be claimed.`,
    confidenceReason: isStrong
      ? "This item is rarely bought for personal use — a reasonably strong work signal."
      : "The item matches a work keyword, but it's also commonly bought for personal or gaming use — confirm it's primarily for work.",
  };
}

export const detectWorkEquipment: Rule = { priority: 4, detect, explain };
