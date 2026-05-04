/**
 * Unit tests for lib/plan.ts — the shared Pro plan gate.
 *
 * These tests cover the pure helper functions that gate both the Export feature
 * and the Receipt upload feature. Because there is only one Pro plan, every
 * upgrade path (from Export or from Receipts) must unlock both simultaneously.
 *
 * Scenarios covered:
 *   1.  Free user uploads first receipt (allowed)
 *   2.  Free user uploads 5th receipt (allowed — boundary)
 *   3.  Free user tries 6th receipt (blocked → PAYWALL_REQUIRED)
 *   4.  Pro user uploads 6th receipt (allowed — Pro limit is higher)
 *   5.  Pro user hits 100 receipt cap (blocked)
 *   6.  Pro user is at 99 receipts (still allowed)
 *   7.  Export is blocked for free users
 *   8.  Export is allowed for Pro users
 *   9.  Upgrading from Export also unlocks receipt uploads (same isProUser check)
 *   10. Upgrading from Receipts also unlocks Export (same isProUser check)
 *   11. Legacy reportUnlocked flag grants Pro status (backward compat)
 *   12. Both entitlement sources must be false for a free user
 */

import { describe, it, expect, vi } from "vitest";

// Prevent database initialisation — fetchUserPlan (async) is not tested here;
// only the pure synchronous helpers are covered in this file.
vi.mock("@/lib/db", () => ({ db: {} }));

import {
  isProUser,
  shouldShowReceiptPaywall,
  shouldShowExportPaywall,
  FREE_RECEIPT_LIMIT,
  PRO_RECEIPT_LIMIT,
  PRODUCT_KEY,
} from "@/lib/plan";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FREE = { entitlementActive: false, reportUnlocked: false };
const PRO  = { entitlementActive: true,  reportUnlocked: false };
// A user whose Pro status comes only from the legacy flag (paid before UserEntitlement existed).
const PRO_LEGACY = { entitlementActive: false, reportUnlocked: true };

// ── Constants ─────────────────────────────────────────────────────────────────

describe("plan constants", () => {
  it("FREE_RECEIPT_LIMIT is 5", () => {
    expect(FREE_RECEIPT_LIMIT).toBe(5);
  });

  it("PRO_RECEIPT_LIMIT is 100", () => {
    expect(PRO_RECEIPT_LIMIT).toBe(100);
  });

  it("PRODUCT_KEY is stable (changing it breaks all paid users)", () => {
    expect(PRODUCT_KEY).toBe("kashio_tax_summary_report");
  });
});

// ── isProUser ─────────────────────────────────────────────────────────────────

describe("isProUser", () => {
  it("returns false for a free user", () => {
    expect(isProUser(FREE)).toBe(false);
  });

  it("returns true when UserEntitlement.isActive is set", () => {
    expect(isProUser(PRO)).toBe(true);
  });

  it("returns true for legacy reportUnlocked (backward compat)", () => {
    expect(isProUser(PRO_LEGACY)).toBe(true);
  });

  it("returns true when both sources are set", () => {
    expect(isProUser({ entitlementActive: true, reportUnlocked: true })).toBe(true);
  });
});

// ── Receipt upload gate ───────────────────────────────────────────────────────

describe("shouldShowReceiptPaywall — scenario 1: free user, first upload", () => {
  it("allows upload when count is 0", () => {
    expect(shouldShowReceiptPaywall(FREE, 0)).toBe(false);
  });
});

describe("shouldShowReceiptPaywall — scenario 2: free user, 5th upload (boundary)", () => {
  it("allows the 5th upload (count is 4 before uploading)", () => {
    expect(shouldShowReceiptPaywall(FREE, 4)).toBe(false);
  });
});

describe("shouldShowReceiptPaywall — scenario 3: free user hits limit", () => {
  it("blocks when count equals FREE_RECEIPT_LIMIT", () => {
    expect(shouldShowReceiptPaywall(FREE, FREE_RECEIPT_LIMIT)).toBe(true);
  });

  it("blocks when count exceeds FREE_RECEIPT_LIMIT", () => {
    expect(shouldShowReceiptPaywall(FREE, FREE_RECEIPT_LIMIT + 1)).toBe(true);
  });
});

describe("shouldShowReceiptPaywall — scenario 4: Pro user uploads after 5 receipts", () => {
  it("allows upload when Pro user has 5 receipts", () => {
    expect(shouldShowReceiptPaywall(PRO, 5)).toBe(false);
  });

  it("allows upload when Pro user has 6 receipts", () => {
    expect(shouldShowReceiptPaywall(PRO, 6)).toBe(false);
  });

  it("allows upload when Pro user has 99 receipts (scenario 6)", () => {
    expect(shouldShowReceiptPaywall(PRO, 99)).toBe(false);
  });
});

describe("shouldShowReceiptPaywall — scenario 5: Pro user hits 100 cap", () => {
  it("blocks when count equals PRO_RECEIPT_LIMIT", () => {
    expect(shouldShowReceiptPaywall(PRO, PRO_RECEIPT_LIMIT)).toBe(true);
  });

  it("blocks when count exceeds PRO_RECEIPT_LIMIT", () => {
    expect(shouldShowReceiptPaywall(PRO, PRO_RECEIPT_LIMIT + 1)).toBe(true);
  });
});

describe("shouldShowReceiptPaywall — legacy Pro flag (scenario 11 partial)", () => {
  it("applies Pro limit when entitlement comes from legacy flag", () => {
    expect(shouldShowReceiptPaywall(PRO_LEGACY, FREE_RECEIPT_LIMIT)).toBe(false);
    expect(shouldShowReceiptPaywall(PRO_LEGACY, PRO_RECEIPT_LIMIT)).toBe(true);
  });
});

// ── Export gate ───────────────────────────────────────────────────────────────

describe("shouldShowExportPaywall — scenario 7: Export blocked for free users", () => {
  it("shows paywall for a free user", () => {
    expect(shouldShowExportPaywall(FREE)).toBe(true);
  });
});

describe("shouldShowExportPaywall — scenario 8: Export allowed for Pro users", () => {
  it("does not show paywall for a Pro user", () => {
    expect(shouldShowExportPaywall(PRO)).toBe(false);
  });

  it("does not show paywall for a legacy Pro user", () => {
    expect(shouldShowExportPaywall(PRO_LEGACY)).toBe(false);
  });
});

// ── Shared unlock invariant ───────────────────────────────────────────────────
//
// Scenarios 9 and 10 verify the core product promise:
// one payment, from either paywall, unlocks both Export and Receipts.

describe("shared unlock — scenario 9: upgrading from Export also unlocks Receipts", () => {
  it("Pro status gained via Export also removes receipt paywall at 5 uploads", () => {
    // Simulate: user paid from Export screen → UserEntitlement.isActive = true
    const plan = { entitlementActive: true, reportUnlocked: false };
    expect(shouldShowExportPaywall(plan)).toBe(false);       // Export: unlocked
    expect(shouldShowReceiptPaywall(plan, 5)).toBe(false);   // Receipts: also unlocked
  });
});

describe("shared unlock — scenario 10: upgrading from Receipts also unlocks Export", () => {
  it("Pro status gained via receipt paywall also opens Export", () => {
    // Simulate: user paid from ProPaywallModal → same UserEntitlement.isActive = true
    const plan = { entitlementActive: true, reportUnlocked: false };
    expect(shouldShowReceiptPaywall(plan, 5)).toBe(false);   // Receipts: unlocked
    expect(shouldShowExportPaywall(plan)).toBe(false);       // Export: also unlocked
  });
});
