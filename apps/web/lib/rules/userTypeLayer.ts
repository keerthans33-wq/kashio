// User-type adjustment layer.
//
// Handles per-category confidence adjustments by user type.
// Each rule's detect() produces a base confidence; adjustConfidence() shifts
// it up, down, or suppresses it based on how that category applies to this user.
//
// Explanation helpers (useContext) are also exported for use in rule explain() functions.

import type { Confidence } from "./types";
import { CATEGORIES } from "./categories";
import { downgradeConfidence } from "./shared";

type UserType = "employee" | "contractor" | "sole_trader";

// +1  upgrade one step  (LOW→MEDIUM, MEDIUM→HIGH, HIGH stays HIGH)
//  0  no change
// -1  downgrade one step (LOW → null = suppress)
// null always suppress regardless of base confidence
type Delta = 1 | 0 | -1 | null;

function upgrade(c: Confidence): Confidence {
  if (c === "LOW")    return "MEDIUM";
  if (c === "MEDIUM") return "HIGH";
  return "HIGH";
}

// Categories not listed fall through unchanged (implicit 0 for all user types).
// Work Travel is handled separately — see adjustConfidence below.
const DELTAS: Record<string, Record<UserType, Delta>> = {
  [CATEGORIES.SOFTWARE]: {
    employee:    0,   // allowed but must be unreimbursed and work-only
    contractor: +1,   // standard business tool
    sole_trader: +1,
  },
  [CATEGORIES.OFFICE_SUPPLIES]: {
    employee:    0,
    contractor: +1,
    sole_trader: +1,
  },
  [CATEGORIES.EQUIPMENT]: {
    employee:    0,   // must not be employer-supplied; depreciation rules apply
    contractor: +1,
    sole_trader: +1,
  },
  [CATEGORIES.PHONE_INTERNET]: {
    employee:    0,   // work-use portion only
    contractor: +1,
    sole_trader: +1,
  },
  [CATEGORIES.MEALS]: {
    employee:   null, // almost never deductible for employees — suppress
    contractor:  0,   // LOW; genuine business contexts only
    sole_trader: +1,  // LOW → MEDIUM
  },
};

/**
 * Adjusts base confidence for the given category and user type.
 *
 * Work Travel special case: employees are capped at LOW rather than suppressed.
 * Commutes and genuine work trips look identical in transaction data, so we
 * surface the suggestion cautiously without hiding it entirely.
 *
 * Returns null if the match should be suppressed for this user type.
 */
export function adjustConfidence(
  base: Confidence,
  category: string,
  userType?: string | null,
  canUpgrade = true,
): Confidence | null {
  if (!userType) return base;

  if (category === CATEGORIES.WORK_TRAVEL && userType === "employee") return "LOW";

  const catDeltas = DELTAS[category];
  if (!catDeltas) return base;

  const delta = catDeltas[userType as UserType];
  if (delta === null) return null;
  if (delta === +1)   return canUpgrade ? upgrade(base) : base;
  if (delta === -1)   return downgradeConfidence(base);
  return base;
}

/** "your job" | "your contract work" | "your business" */
export function useContext(userType?: string | null): string {
  if (userType === "sole_trader") return "your business";
  if (userType === "contractor")  return "your contract work";
  return "your job";
}
