import { db } from "@/lib/db";

// ── Kashio Pro — shared plan ───────────────────────────────────────────────────
//
// There is exactly one Pro plan. A single $19.99 payment unlocks BOTH features:
//
//   • Export      — full tax summary download (PaywallGate on /export)
//   • Receipts    — upload up to 100 receipts (ProPaywallModal via receipt FAB)
//
// Payment flow:
//   1. User clicks "Upgrade to Pro" in either paywall UI.
//   2. Both UIs call the same endpoint: POST /api/stripe/create-checkout-session.
//   3. Stripe redirects the user to checkout for the single price (STRIPE_PRICE_ID).
//   4. On success, Stripe fires checkout.session.completed to /api/stripe/webhook.
//   5. The webhook writes UserEntitlement { productKey: PRODUCT_KEY, isActive: true }.
//   6. isProUser() returns true and both feature gates open simultaneously.
//
// To add a new gated feature: import isProUser/shouldShowExportPaywall from this
// file and derive the gate from the same UserPlan. Do not add a second product key.

// ── Constants ──────────────────────────────────────────────────────────────────

// Matches the productKey written by the webhook and read by every entitlement check.
// Changing this string would silently break all existing paid users — do not rename.
export const PRODUCT_KEY = "kashio_tax_summary_report";

// Receipt upload limits per tier.
export const FREE_RECEIPT_LIMIT = 5;
export const PRO_RECEIPT_LIMIT  = 100;

// ── Types ──────────────────────────────────────────────────────────────────────

/**
 * Normalised plan state for a user.
 *
 * Combines two sources so callers don't need to know about both:
 *   • UserEntitlement.isActive  — primary, written by the Stripe webhook.
 *   • UserProfile.reportUnlocked — legacy boolean kept for backward compat with
 *     users who paid before the UserEntitlement table existed.
 *
 * Always read this via fetchUserPlan(); never query the tables directly in
 * feature-gate logic or the two sources will drift apart.
 */
export type UserPlan = {
  entitlementActive: boolean;
  reportUnlocked:    boolean;
};

// ── Fetcher ────────────────────────────────────────────────────────────────────

/**
 * Fetch the user's Pro status from both entitlement sources in one parallel query.
 *
 * Use this in every server component and API route that needs to gate a feature.
 * The returned UserPlan is passed to the pure helpers below — it never touches
 * Stripe directly and is safe to call on every request.
 */
export async function fetchUserPlan(userId: string): Promise<UserPlan> {
  const [entitlement, profile] = await Promise.all([
    db.userEntitlement.findUnique({
      where:  { userId_productKey: { userId, productKey: PRODUCT_KEY } },
      select: { isActive: true },
    }),
    db.userProfile.findUnique({
      where:  { userId },
      select: { reportUnlocked: true },
    }),
  ]);
  return {
    entitlementActive: entitlement?.isActive === true,
    reportUnlocked:    profile?.reportUnlocked === true,
  };
}

// ── Pure helpers ───────────────────────────────────────────────────────────────

/**
 * Returns true if the user has an active Pro subscription.
 *
 * This is the single source of truth for Pro status. Both the Export paywall
 * (shouldShowExportPaywall) and the receipt upload gate (shouldShowReceiptPaywall)
 * derive their answer from this function — so one payment always unlocks both.
 */
export function isProUser(plan: UserPlan): boolean {
  return plan.entitlementActive || plan.reportUnlocked;
}

/**
 * Returns true if the user should be blocked from uploading another receipt.
 *
 * Free users are blocked after FREE_RECEIPT_LIMIT (5) uploads.
 * Pro users are blocked after PRO_RECEIPT_LIMIT (100) uploads.
 * The receipt count must be fetched by the caller (db.receipt.count).
 */
export function shouldShowReceiptPaywall(plan: UserPlan, receiptCount: number): boolean {
  const limit = isProUser(plan) ? PRO_RECEIPT_LIMIT : FREE_RECEIPT_LIMIT;
  return receiptCount >= limit;
}

/**
 * Returns true if the user should see the Export paywall.
 *
 * Export requires Pro. Upgrading from the Export paywall also unlocks Receipts,
 * and upgrading from the Receipt paywall also unlocks Export — same plan, same
 * Stripe product, same webhook write.
 */
export function shouldShowExportPaywall(plan: UserPlan): boolean {
  return !isProUser(plan);
}
