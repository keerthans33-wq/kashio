// Canonical category names used by detection rules, the UI, and export logic.
// Always reference these constants instead of writing the string directly.
export const CATEGORIES = {
  WORK_TRAVEL:             "Work Travel",
  EQUIPMENT:               "Equipment",
  SOFTWARE:                "Software & Subscriptions",
  OFFICE_SUPPLIES:         "Office Supplies",
  PHONE_INTERNET:          "Phone & Internet",
  WORK_CLOTHING:           "Work Clothing",
  PROFESSIONAL_DEVELOPMENT:"Professional Development",
  MEALS:                   "Meals",
} as const;

// All categories that at least one active rule can produce.
// Update this when new rules are added or removed.
export const ACTIVE_CATEGORIES: string[] = [
  CATEGORIES.WORK_TRAVEL,
  CATEGORIES.EQUIPMENT,
  CATEGORIES.SOFTWARE,
  CATEGORIES.OFFICE_SUPPLIES,
  CATEGORIES.PHONE_INTERNET,
  CATEGORIES.WORK_CLOTHING,
  CATEGORIES.PROFESSIONAL_DEVELOPMENT,
  CATEGORIES.MEALS,
];

// Category priority order for sorting within a confidence band.
// Index 0 = highest priority. Categories not listed rank last.
export const CATEGORY_PRIORITY_BY_USER_TYPE: Record<string, string[]> = {
  employee: [
    CATEGORIES.WORK_TRAVEL,
    CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    CATEGORIES.WORK_CLOTHING,
    CATEGORIES.EQUIPMENT,
    CATEGORIES.OFFICE_SUPPLIES,
    CATEGORIES.PHONE_INTERNET,
    CATEGORIES.SOFTWARE,
    // MEALS intentionally omitted — not surfaced for employees
  ],
  contractor: [
    CATEGORIES.EQUIPMENT,
    CATEGORIES.WORK_TRAVEL,
    CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    CATEGORIES.SOFTWARE,
    CATEGORIES.OFFICE_SUPPLIES,
    CATEGORIES.PHONE_INTERNET,
    CATEGORIES.MEALS,
    CATEGORIES.WORK_CLOTHING,
  ],
  sole_trader: [
    CATEGORIES.EQUIPMENT,
    CATEGORIES.WORK_TRAVEL,
    CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    CATEGORIES.OFFICE_SUPPLIES,
    CATEGORIES.SOFTWARE,
    CATEGORIES.PHONE_INTERNET,
    CATEGORIES.MEALS,
    CATEGORIES.WORK_CLOTHING,
  ],
};

// Categories shown in Review and Export per user type.
// Meals are visible to contractors and sole_traders only — the detection
// rule already suppresses meals for employees, but this acts as a safety net
// so a historical meal record never appears in an employee's export.
export const CATEGORIES_BY_USER_TYPE: Record<string, string[]> = {
  employee: ACTIVE_CATEGORIES.filter((c) => c !== CATEGORIES.MEALS),
  contractor:  ACTIVE_CATEGORIES,
  sole_trader: ACTIVE_CATEGORIES,
};
