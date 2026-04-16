// User-type adjustment layer.
//
// Separates "does this transaction match?" (each rule's detect()) from
// "how confident should we be, and how should it be framed, for this user?"
//
// Primary export:
//   adjustConfidence() — applies per-category confidence deltas by user type.
//                        Returns null when the match should be suppressed entirely.
//
// Secondary exports (text helpers used by rule explain() functions):
//   useContext()    — "your job" | "your work" | "your business"
//   forPurpose()   — "for work" | "for your work" | "for your business"
//   userTypeNote() — short user-type-aware sentence appended to a confidence reason

import type { Confidence } from "./types";
import { CATEGORIES } from "./categories";
import { downgradeConfidence } from "./shared";

type UserType = "employee" | "contractor" | "sole_trader";

// +1  upgrade one step  (LOW→MEDIUM, MEDIUM→HIGH, HIGH stays HIGH)
//  0  no change
// -1  downgrade one step (LOW → null = suppress from the user's view)
// null always suppress, regardless of base confidence
type Delta = 1 | 0 | -1 | null;

function upgrade(c: Confidence): Confidence {
  if (c === "LOW")    return "MEDIUM";
  if (c === "MEDIUM") return "HIGH";
  return "HIGH";
}

// ── Per-category confidence deltas ───────────────────────────────────────────
//
// Rationale per category:
//
//   Software:        employees have strict ATO rules (must be unreimbursed, work-only);
//                    contractors and sole_traders treat it as a standard business cost.
//
//   Office supplies: same logic — employees can claim, but stricter proof required.
//
//   Equipment:       employees need to show it's not employer-supplied and is work-only;
//                    contractors/sole_traders claim freely as a business expense.
//
//   Work travel:     handled as a special case below — employees are capped at LOW
//                    rather than having LOW suppressed (commutes and work trips
//                    look identical; we still surface the suggestion cautiously).
//
//   Phone/internet:  all user types can claim the work-use portion, but contractors
//                    and sole_traders have more latitude and better record-keeping options.
//
//   Work clothing:   ATO rules are user-type-agnostic (occupation-specific only) — no delta.
//
//   Professional dev: equally available to all user types — no delta.
//
//   Meals:           employees almost never deduct meals under ATO rules → suppress.
//                    Contractors/sole_traders can claim in limited business contexts.

const DELTAS: Record<string, Record<UserType, Delta>> = {
  [CATEGORIES.SOFTWARE]: {
    employee:    0,
    contractor: +1,
    sole_trader: +1,
  },
  [CATEGORIES.OFFICE_SUPPLIES]: {
    employee:    0,
    contractor: +1,
    sole_trader: +1,
  },
  [CATEGORIES.EQUIPMENT]: {
    employee:    0,
    contractor: +1,
    sole_trader: +1,
  },
  [CATEGORIES.PHONE_INTERNET]: {
    employee:    0,
    contractor: +1,
    sole_trader: +1,
  },
  [CATEGORIES.WORK_CLOTHING]: {
    employee:    0,
    contractor:  0,
    sole_trader:  0,
  },
  [CATEGORIES.PROFESSIONAL_DEVELOPMENT]: {
    employee:    0,
    contractor:  0,
    sole_trader:  0,
  },
  [CATEGORIES.MEALS]: {
    employee:   null, // almost never deductible for employees — suppress
    contractor:  0,   // LOW; claimable only in genuine business contexts
    sole_trader: +1,  // LOW → MEDIUM; more common in sole-trader business settings
  },
};

/**
 * Applies a per-category, per-user-type confidence adjustment.
 *
 * Work Travel special case: employees are capped at LOW rather than
 * degraded further — so fuel and transport still surface with appropriate
 * caution. Without this cap, LOW would become null (suppressed entirely),
 * which is too aggressive since employees do have legitimate travel claims.
 *
 * Returns null if the match should be suppressed for this user type.
 * Returns base unchanged if userType is unknown or the category has no delta.
 */
export function adjustConfidence(
  base: Confidence,
  category: string,
  userType?: string | null,
): Confidence | null {
  if (!userType) return base;

  // Work Travel: cap employee confidence at LOW rather than suppressing.
  // MEDIUM (strong work-travel keywords) → LOW; LOW → LOW (no change).
  // Rationale: commutes look identical to work trips, so we reduce confidence
  // without hiding legitimate travel claims entirely.
  if (category === CATEGORIES.WORK_TRAVEL && userType === "employee") {
    return "LOW";
  }

  const catDeltas = DELTAS[category];
  if (!catDeltas) return base;

  const delta = catDeltas[userType as UserType];
  if (delta === null)  return null;
  if (delta === +1)    return upgrade(base);
  if (delta === -1)    return downgradeConfidence(base); // LOW → null (suppress)
  return base;
}

// ── Explanation helpers ───────────────────────────────────────────────────────

/** Returns a phrase describing what the expense is used for. */
export function useContext(userType?: string | null): string {
  if (userType === "sole_trader") return "your business";
  if (userType === "contractor")  return "your contract work";
  return "your job";
}

/** Returns a verb phrase for the purpose of the expense. */
export function forPurpose(userType?: string | null): string {
  if (userType === "sole_trader") return "for your business";
  if (userType === "contractor")  return "for your work";
  return "for work";
}

/**
 * Returns a short, user-type-aware sentence to append to a confidence reason.
 * Adds relevant ATO context without changing the core detection logic.
 */
export function userTypeNote(category: string, userType?: string | null): string | null {
  if (!userType) return null;

  if (userType === "employee") {
    const notes: Partial<Record<string, string>> = {
      [CATEGORIES.SOFTWARE]:      "Employees can claim software costs if the expense isn't reimbursed by their employer.",
      [CATEGORIES.OFFICE_SUPPLIES]: "Employees can claim office costs if not reimbursed — check before claiming.",
      [CATEGORIES.EQUIPMENT]:     "Check that this item isn't employer-supplied or reimbursed before claiming.",
      [CATEGORIES.WORK_TRAVEL]:   "Employees can only claim travel the job directly requires — a regular commute doesn't qualify.",
      [CATEGORIES.PHONE_INTERNET]:"Employees can claim the work-use portion — keeping a 4-week log is the ATO's recommended method.",
    };
    return notes[category] ?? null;
  }

  if (userType === "contractor") {
    const notes: Partial<Record<string, string>> = {
      [CATEGORIES.SOFTWARE]:      "Contractors can generally deduct software used for their work as a business expense.",
      [CATEGORIES.OFFICE_SUPPLIES]: "Office supplies are a straightforward business deduction for contractors.",
      [CATEGORIES.EQUIPMENT]:     "Equipment used in your contract work is deductible as a business expense.",
      [CATEGORIES.WORK_TRAVEL]:   "Business travel is deductible for contractors — keep a record of the purpose of each trip.",
      [CATEGORIES.PHONE_INTERNET]:"Contractors can claim the business-use proportion, or the full cost if used exclusively for work.",
      [CATEGORIES.MEALS]:         "Contractors can claim meals in limited business contexts — client entertainment or travel away overnight.",
    };
    return notes[category] ?? null;
  }

  if (userType === "sole_trader") {
    const notes: Partial<Record<string, string>> = {
      [CATEGORIES.SOFTWARE]:      "Sole traders can claim business software as a direct business deduction.",
      [CATEGORIES.OFFICE_SUPPLIES]: "Business supplies are a direct deduction for sole traders.",
      [CATEGORIES.EQUIPMENT]:     "Equipment used in your business is deductible — items over $300 must be depreciated.",
      [CATEGORIES.WORK_TRAVEL]:   "Business travel is fully deductible for sole traders with good records.",
      [CATEGORIES.PHONE_INTERNET]:"Sole traders can claim the full cost if the service is exclusively for business, otherwise the business-use proportion.",
      [CATEGORIES.MEALS]:         "Sole traders can claim business-related meals — client meetings, functions, or travel — with a clear business purpose.",
    };
    return notes[category] ?? null;
  }

  return null;
}
