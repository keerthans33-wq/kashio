// Canonical category names used by detection rules, the UI, and export logic.
// Always reference these constants instead of writing the string directly.
export const CATEGORIES = {
  WORK_TRAVEL:     "Work Travel",
  EQUIPMENT:       "Equipment",
  SOFTWARE:        "Software & Subscriptions",
  OFFICE_SUPPLIES: "Office Supplies",
  PHONE_INTERNET:  "Phone & Internet",
  WORK_CLOTHING:   "Work Clothing",
} as const;

// Only categories that at least one active rule can produce.
// Update this when new rules are added or removed.
export const ACTIVE_CATEGORIES: string[] = [
  CATEGORIES.WORK_TRAVEL,
  CATEGORIES.EQUIPMENT,
  CATEGORIES.SOFTWARE,
  CATEGORIES.OFFICE_SUPPLIES,
  CATEGORIES.PHONE_INTERNET,
  CATEGORIES.WORK_CLOTHING,
];

// Category priority order for sorting within a confidence band.
// Index 0 = highest priority. Categories not listed rank last.
export const CATEGORY_PRIORITY_BY_USER_TYPE: Record<string, string[]> = {
  employee: [
    CATEGORIES.WORK_TRAVEL,
    CATEGORIES.WORK_CLOTHING,
    CATEGORIES.EQUIPMENT,
    CATEGORIES.OFFICE_SUPPLIES,
    CATEGORIES.PHONE_INTERNET,
    CATEGORIES.SOFTWARE,
  ],
  contractor: [
    CATEGORIES.EQUIPMENT,
    CATEGORIES.WORK_TRAVEL,
    CATEGORIES.WORK_CLOTHING,
    CATEGORIES.OFFICE_SUPPLIES,
    CATEGORIES.PHONE_INTERNET,
    CATEGORIES.SOFTWARE,
  ],
  sole_trader: [
    CATEGORIES.EQUIPMENT,
    CATEGORIES.WORK_TRAVEL,
    CATEGORIES.OFFICE_SUPPLIES,
    CATEGORIES.SOFTWARE,
    CATEGORIES.PHONE_INTERNET,
    CATEGORIES.WORK_CLOTHING,
  ],
};

// Categories visible in the review stage per user type.
// employee    — standard PAYG work deductions (no office supplies)
// contractor  — broader business expenses (no work clothing)
// sole_trader — full set
export const CATEGORIES_BY_USER_TYPE: Record<string, string[]> = {
  employee: [
    CATEGORIES.WORK_TRAVEL,
    CATEGORIES.EQUIPMENT,
    CATEGORIES.SOFTWARE,
    CATEGORIES.OFFICE_SUPPLIES,
    CATEGORIES.PHONE_INTERNET,
    CATEGORIES.WORK_CLOTHING,
  ],
  contractor: [
    CATEGORIES.WORK_TRAVEL,
    CATEGORIES.EQUIPMENT,
    CATEGORIES.SOFTWARE,
    CATEGORIES.OFFICE_SUPPLIES,
    CATEGORIES.PHONE_INTERNET,
    CATEGORIES.WORK_CLOTHING,
  ],
  sole_trader: ACTIVE_CATEGORIES,
};
