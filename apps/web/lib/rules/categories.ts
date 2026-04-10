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
