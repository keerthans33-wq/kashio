// Canonical category names used by detection rules, the UI, and future export logic.
// Always reference these constants instead of writing the string directly,
// so names stay consistent if they ever need to change.
export const CATEGORIES = {
  WORK_SOFTWARE:            "Work Software & Tools",
  OFFICE_SUPPLIES:          "Office Supplies & Equipment",
  WORK_CLOTHING:            "Work Clothing & Uniforms",
  PROFESSIONAL_DEVELOPMENT: "Professional Development",
  WORK_TRAVEL:              "Work-Related Travel",
  HOME_OFFICE:              "Home Office",
} as const;

// Only categories that at least one active rule can produce.
// Update this when new rules are added.
export const ACTIVE_CATEGORIES: string[] = [
  CATEGORIES.WORK_SOFTWARE,
  CATEGORIES.OFFICE_SUPPLIES,
  CATEGORIES.WORK_CLOTHING,
];
