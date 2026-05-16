// Personal-expense blacklist — checked before any rule or AI pass.
// A match causes detectDeduction to return null immediately.
//
// Philosophy: only suppress what is CLEARLY personal and non-deductible.
// When in doubt, leave it out — let the rules engine surface it for review.
// The user confirms or rejects; Kashio should not silently hide marginal cases.

import type { TransactionInput } from "./types";

// ── Personal streaming / entertainment subscriptions ──────────────────────────
const STREAMING = [
  "netflix", "spotify", "disney plus", "disney+", "stan australia",
  "binge", "paramount plus", "paramount+", "apple tv plus", "apple tv+",
  "prime video", "amazon prime video", "youtube premium", "youtube music",
  "deezer", "tidal", "apple music", "soundcloud", "crunchyroll",
  "foxtel now", "kayo sports",
];

// ── Fast food (pure personal; restaurants with wait-staff are not blocked) ─────
const FAST_FOOD = [
  "mcdonald", "hungry jacks", "kfc", "subway restaurants",
  "dominos pizza", "pizza hut", "nandos", "grill'd", "oporto",
  "red rooster", "guzman y gomez", "betty's burgers", "carl's jr",
  "taco bell", "shake shack", "lord of the fries",
];

// ── Alcohol specialty retailers ───────────────────────────────────────────────
const ALCOHOL = [
  "dan murphy", "bws", "liquorland", "first choice liquor",
  "bottle-o", "vintage cellars", "wine selectors", "naked wines",
];

// ── Gambling / betting ────────────────────────────────────────────────────────
// "tab" and "tatts" omitted — too many false-positive collisions.
const GAMBLING = [
  "sportsbet", "pointsbet", "ladbrokes", "bet365", "neds", "beteasy",
  "betfair", "unibet", "palmerbet",
];

// ── Gym / personal fitness ────────────────────────────────────────────────────
const FITNESS = [
  "fitness first", "anytime fitness", "f45 training", "planet fitness",
  "goodlife health", "snap fitness", "virgin active", "vision personal training",
  "crossfit",
];

// ── Pure grocery retailers (personal for employees and contractors) ────────────
// Woolworths and Coles are NOT here — merchants.ts forUserTypes handles them so
// sole traders still see them. Aldi has no work-related use case so always blocked.
const GROCERY = ["aldi"];

// ── Personal financial products ───────────────────────────────────────────────
const PERSONAL_FINANCE_KEYWORDS = [
  "home loan repayment", "mortgage repayment",
  "personal loan repayment", "car loan repayment",
  "health insurance premium",
];

// ── Income / payroll credits ───────────────────────────────────────────────────
// Positive amounts are already filtered upstream; these catch negative mislabels.
const INCOME_KEYWORDS = [
  "salary credit", "payroll deposit", "wages credit",
  "income tax refund", "ato refund", "centrelink payment", "jobkeeper",
];

// ── Pure inter-account transfers (not payments to vendors) ────────────────────
const TRANSFER_KEYWORDS = [
  "inter account transfer", "internal transfer",
  "own account transfer", "bank transfer ref",
];

// ── Personal keywords (low-risk additions) ─────────────────────────────────────
const PERSONAL_KEYWORDS = [
  "gambling", "casino deposit", "poker", "lottery ticket",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function merchantHits(merchant: string, list: string[]): boolean {
  const lower = merchant.toLowerCase();
  return list.some((entry) => lower.includes(entry));
}

function keywordHits(combined: string, list: string[]): boolean {
  return list.some((kw) => combined.includes(kw));
}

/**
 * Returns true if this transaction should be suppressed as clearly personal.
 * Called as the very first check in detectDeduction, before any rule runs.
 */
export function isBlacklisted(tx: TransactionInput, userType?: string | null): boolean {
  const merchant = tx.normalizedMerchant.toLowerCase();
  const combined = `${tx.normalizedMerchant} ${tx.description}`.toLowerCase();

  if (merchantHits(merchant, STREAMING))   return true;
  if (merchantHits(merchant, FAST_FOOD))   return true;
  if (merchantHits(merchant, ALCOHOL))     return true;
  if (merchantHits(merchant, GAMBLING))    return true;
  if (merchantHits(merchant, FITNESS))     return true;

  // Grocery stores — only suppress for employee/contractor
  if (userType !== "sole_trader" && merchantHits(merchant, GROCERY)) return true;

  if (keywordHits(combined, INCOME_KEYWORDS))         return true;
  if (keywordHits(combined, TRANSFER_KEYWORDS))       return true;
  if (keywordHits(combined, PERSONAL_FINANCE_KEYWORDS)) return true;
  if (keywordHits(combined, PERSONAL_KEYWORDS))       return true;

  return false;
}
