import { db } from "@/lib/db";

// ── Kashio Pro — shared subscription plan ─────────────────────────────────────
//
// There is exactly one Pro plan. A single subscription unlocks ALL features:
//
//   • Export      — full tax summary download (PaywallGate on /export)
//   • Receipts    — upload up to PRO_RECEIPT_LIMIT receipts
//   • Review      — see all deduction candidates (free tier capped at FREE_DEDUCTION_LIMIT)
//   • Dashboard   — full tax readiness breakdown and insights
//
// Subscription flow:
//   1. User clicks "Start monthly/annual plan" in any paywall UI.
//   2. All UIs call POST /api/stripe/create-checkout-session with { interval, cancelPath }.
//   3. Stripe redirects to checkout for STRIPE_MONTHLY_PRICE_ID or STRIPE_ANNUAL_PRICE_ID.
//   4. On success, Stripe fires checkout.session.completed to /api/stripe/webhook.
//   5. Webhook writes UserEntitlement { productKey: PRODUCT_KEY, isActive: true }.
//   6. isProUser() returns true and all feature gates open simultaneously.
//   7. On cancellation, customer.subscription.deleted fires and sets isActive: false.
//
// To add a new gated feature: import isProUser from this file and derive the gate
// from the same UserPlan. Do not add a second product key.

// ── Constants ──────────────────────────────────────────────────────────────────

// Matches the productKey written by the webhook and read by every entitlement check.
// Changing this string would silently break all existing paid users — do not rename.
export const PRODUCT_KEY = "kashio_tax_summary_report";

// Receipt upload limits per tier.
export const FREE_RECEIPT_LIMIT = 5;
export const PRO_RECEIPT_LIMIT  = 100;

// How many NEEDS_REVIEW deduction candidates a free user can see.
// Beyond this, a paywall card is shown in place of the remaining items.
export const FREE_DEDUCTION_LIMIT = 10;

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
 * This is the single source of truth for Pro status. All feature gates
 * (export, receipts, review, dashboard) derive their answer from this function —
 * so one subscription always unlocks everything simultaneously.
 */
export function isProUser(plan: UserPlan): boolean {
  return plan.entitlementActive || plan.reportUnlocked;
}

/**
 * Returns true if the user should be blocked from uploading another receipt.
 *
 * Free users are blocked after FREE_RECEIPT_LIMIT (5) uploads.
 * Pro users are blocked after PRO_RECEIPT_LIMIT (100) uploads.
 */
export function shouldShowReceiptPaywall(plan: UserPlan, receiptCount: number): boolean {
  const limit = isProUser(plan) ? PRO_RECEIPT_LIMIT : FREE_RECEIPT_LIMIT;
  return receiptCount >= limit;
}

/**
 * Returns true if the user should see the Export paywall.
 * Upgrading from any paywall unlocks all features simultaneously.
 */
export function shouldShowExportPaywall(plan: UserPlan): boolean {
  return !isProUser(plan);
}

/**
 * Returns the number of NEEDS_REVIEW candidates to show a free user,
 * and whether a paywall card should be shown for the remainder.
 *
 * Pro users see all candidates. Free users see up to FREE_DEDUCTION_LIMIT,
 * with an upgrade prompt for anything beyond that.
 */
export function getReviewLimit(plan: UserPlan): number {
  return isProUser(plan) ? Infinity : FREE_DEDUCTION_LIMIT;
}
