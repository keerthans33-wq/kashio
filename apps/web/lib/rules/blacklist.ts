// Personal-expense blacklist — checked before any rule or AI pass.
//
// Two tiers:
//   Hard blocks  — always suppressed; no business-context override.
//   Soft blocks  — suppressed unless the transaction description contains
//                  a recognisable business-context token (client, invoice, etc.).
//
// Philosophy: only suppress what is CLEARLY personal and non-deductible.
// For ambiguous cases (hotel, restaurant) keep the soft block so a
// "Hotel Grand Chancellor conference invoice" can still surface.

import type { TransactionInput } from "./types";

// ── Hard blocks — gambling ────────────────────────────────────────────────────
const GAMBLING_HARD = [
  "lotterywest", "lottery", "lotto",
  "sportsbet", "pointsbet", "ladbrokes", "bet365", "neds", "beteasy",
  "betfair", "unibet", "palmerbet",
];
// "tab" matched with word boundary (avoids "tableau" etc.)

// ── Hard blocks — streaming / entertainment subscriptions ─────────────────────
const STREAMING = [
  "netflix", "spotify", "disney plus", "disney+", "stan australia",
  "binge", "paramount plus", "paramount+", "apple tv plus", "apple tv+",
  "prime video", "amazon prime video", "youtube premium", "youtube music",
  "deezer", "tidal", "apple music", "soundcloud", "crunchyroll",
  "foxtel now", "kayo sports",
];

// ── Hard blocks — alcohol specialty ───────────────────────────────────────────
const ALCOHOL = [
  "dan murphy", "bws", "liquorland", "first choice liquor",
  "bottle-o", "vintage cellars", "wine selectors", "naked wines",
];

// ── Hard blocks — gym / personal fitness ──────────────────────────────────────
const FITNESS = [
  "fitness first", "anytime fitness", "f45 training", "planet fitness",
  "goodlife health", "snap fitness", "virgin active", "vision personal training",
  "crossfit",
];

// ── Hard blocks — physical entertainment venues ───────────────────────────────
// These have no plausible business deduction use.
const ENTERTAINMENT_HARD = [
  "event cinemas", "hoyts", "ticketek", "ticketmaster", "village cinema",
  "village cinemas",
];

// ── Hard blocks — generic bank fees / interest ────────────────────────────────
// Matched as phrases to avoid catching "Business Loan Interest Expense".
const BANK_FEE_PHRASES = [
  "purchase interest", "cash advance interest",
  "overdrawn fee", "overdraw fee", "late payment fee", "account keeping fee",
  // Bank penalty and fx fees — never deductible as a business expense.
  "international transaction fee", "foreign transaction fee",
  "currency conversion fee",
  "insufficient funds fee", "non-sufficient funds", "nsf fee",
  "exceeding available funds",
  "dishonour fee", "payment dishonour", "honour fee",
  "failed payment fee",
];
// "interest" matched standalone on merchant name below.

// ── Hard blocks — ATM / cash ──────────────────────────────────────────────────
const ATM_PHRASES = ["cash advance", "cash withdrawal", "cash out"];
// "atm" matched with word boundary below.

// ── Hard blocks — grocery (user-type specific) ────────────────────────────────
// Woolworths / Coles handled by merchants.ts forUserTypes for sole traders.
const GROCERY_ALWAYS = ["aldi"];

// ── Hard blocks — income / transfers / personal finance ───────────────────────
const INCOME_KEYWORDS = [
  "salary credit", "payroll deposit", "wages credit",
  "income tax refund", "ato refund", "centrelink payment", "jobkeeper",
];
const TRANSFER_KEYWORDS = [
  "inter account transfer", "internal transfer",
  "own account transfer", "bank transfer ref",
  // Personal P2P payment apps — no business deduction use.
  "commbank app",
];
const PERSONAL_FINANCE_KEYWORDS = [
  "home loan repayment", "mortgage repayment",
  "personal loan repayment", "car loan repayment",
  "health insurance premium",
];
const PERSONAL_KEYWORDS = [
  "gambling", "casino deposit", "poker", "lottery ticket",
];

// ── Hard blocks — personal money splits ───────────────────────────────────────
// Matches CommBank's "Mine and NAME's share" split-payment descriptions.
const PERSONAL_SPLIT_REGEX = /\bmine\s+and\b/i;

// ── Soft blocks — fast food (can be overridden but rarely needed) ─────────────
const FAST_FOOD = [
  "mcdonald", "hungry jacks", "kfc", "subway restaurants",
  "dominos pizza", "pizza hut", "nandos", "grill'd", "oporto",
  "red rooster", "guzman y gomez", "betty's burgers", "carl's jr",
  "taco bell", "shake shack", "lord of the fries",
];

// ── Soft blocks — restaurants / food (broad) ──────────────────────────────────
// Specific merchant names that are clearly restaurants.
const RESTAURANT_SPECIFIC = [
  "gamagama", "kuafood", "kickin inn", "sizzle n sambar", "sizzle sambar",
];
// Generic keywords that indicate a food/dining venue.
const RESTAURANT_KEYWORDS = [
  "restaurant", "cuisine", "cafe", "bistro", "tavern",
  "takeaway", "doordash", "menulog", "deliveroo",
];
// "bar", "pub", "coffee", "grill", "food", "pizza", "burger" handled with
// word-boundary regex against the merchant name only (see below).

// ── Soft blocks — personal medical ────────────────────────────────────────────
const MEDICAL_SPECIFIC = [
  "nextclinic", "chemist warehouse", "chemistwarehouse",
  "priceline pharmacy", "terrywhite", "amcal", "blooms the chemist",
];
// Substring matches against combinedText (description + normalizedMerchant).
// These are long enough that substring match is safe.
const MEDICAL_KEYWORDS = [
  "medical centre", "gp clinic", "bulk bill",
  "dental", "dentist",
  "pathology", "radiology",
  "health insurance",
];
// Short terms handled with word-boundary regex against combined below:
// medical, clinic, pharmacy, chemist, doctor, hospital, physio, chiro, gp

// ── Soft blocks — personal travel / tourism ───────────────────────────────────
const TRAVEL_SPECIFIC = [
  "edreams", "gotogate", "patong", "phuket", "bangkok",
  "agoda", "airbnb", "hostel",
];
const TRAVEL_KEYWORDS = ["travel agency", "airport lounge", "booking.com"];
// "hotel", "resort", "tourist" handled with word-boundary regex below.

// ── Business-context override tokens ─────────────────────────────────────────
// Any soft-blocked transaction is rescued if the combined text includes one of
// these tokens — indicating it was likely a legitimate client/work expense.
const BUSINESS_OVERRIDE_TOKENS = [
  "business", "invoice", "client", "conference",
  "training", "course", "seminar", "abn", "tax invoice",
  "company", "pty", "contractor",
];

// ── Soft blocks — person-to-person bank transfers ─────────────────────────────
// "Transfer To NAME" is the standard Australian bank label for P2P transfers.
// Soft-blocked (not hard) so legitimate entries like "Transfer To ATO" or
// "Transfer To Accountant" are rescued by the business-context check above.
const TRANSFER_TO_REGEX = /^transfer\s+to\s+\S/i;

// ── Soft blocks — rent / personal accommodation ──────────────────────────────
// Raw "rent" payments are almost always personal (lease, room rent).
// Rescued only when the combined text suggests commercial use.
const COMMERCIAL_RENT_OVERRIDE = [
  "office", "commercial", "studio", "warehouse", "co-working", "coworking",
  "workshop", "storage",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function merchantHits(merchant: string, list: string[]): boolean {
  return list.some((entry) => merchant.includes(entry));
}

function keywordHits(combined: string, list: string[]): boolean {
  return list.some((kw) => combined.includes(kw));
}

function wordBoundary(text: string, word: string): boolean {
  return new RegExp(`(?:^|[^a-z])${word}(?:[^a-z]|$)`).test(text);
}

function hasBusinessContext(combined: string): boolean {
  if (BUSINESS_OVERRIDE_TOKENS.some((t) => combined.includes(t))) return true;
  // Short tokens use word-boundary to avoid substring matches in unrelated words
  // ("ato" inside "patron"/"patong", etc.).
  if (wordBoundary(combined, "ato"))  return true;   // Australian Taxation Office
  if (wordBoundary(combined, "work")) return true;
  if (wordBoundary(combined, "job"))  return true;
  return false;
}

function isAtmOrCash(combined: string): boolean {
  if (/\batm\b/.test(combined)) return true;
  return ATM_PHRASES.some((p) => combined.includes(p));
}

function isBankInterest(merchant: string, combined: string): boolean {
  // Only block "interest" when it's the merchant name itself, or in a known fee phrase.
  if (/^interest/.test(merchant)) return true;
  return BANK_FEE_PHRASES.some((p) => combined.includes(p));
}

function isRestaurantOrFood(merchant: string, combined: string): boolean {
  if (merchantHits(merchant, RESTAURANT_SPECIFIC))              return true;
  if (RESTAURANT_KEYWORDS.some((k) => combined.includes(k)))   return true;
  if (wordBoundary(merchant, "bar"))    return true;
  if (wordBoundary(merchant, "pub"))    return true;
  if (wordBoundary(merchant, "coffee")) return true;
  if (wordBoundary(merchant, "grill"))  return true;
  if (wordBoundary(merchant, "food"))   return true;
  if (wordBoundary(merchant, "pizza"))  return true;
  if (wordBoundary(merchant, "burger")) return true;
  return false;
}

function isPersonalMedical(merchant: string, combined: string): boolean {
  if (merchantHits(merchant, MEDICAL_SPECIFIC))            return true;
  if (MEDICAL_KEYWORDS.some((k) => combined.includes(k))) return true;
  // Check combined (not just merchant) so keywords in the raw description are
  // caught even when normalizeMerchant has already stripped them via LOCATION_SLUG.
  // e.g. "APPLECROSS MEDICAL" → normalizedMerchant = "Applecross" (LOCATION_SLUG
  // strips "MEDICAL"), but the raw description still contains the word.
  if (wordBoundary(combined, "medical"))   return true;
  if (wordBoundary(combined, "clinic"))    return true;
  if (wordBoundary(combined, "pharmacy"))  return true;
  if (wordBoundary(combined, "chemist"))   return true;
  if (wordBoundary(combined, "doctor"))    return true;
  if (wordBoundary(combined, "hospital"))  return true;
  if (wordBoundary(combined, "gp"))        return true;
  if (combined.includes("physio"))         return true;  // physio + physiotherapy
  if (combined.includes("chiro"))          return true;  // chiro + chiropractor
  return false;
}

function isPersonalTravelTourism(merchant: string, combined: string): boolean {
  if (merchantHits(merchant, TRAVEL_SPECIFIC))             return true;
  if (TRAVEL_KEYWORDS.some((k) => combined.includes(k)))  return true;
  if (wordBoundary(combined, "hotel"))   return true;
  if (wordBoundary(combined, "resort"))  return true;
  if (wordBoundary(combined, "tourist")) return true;
  return false;
}

function isEntertainmentVenue(merchant: string): boolean {
  if (merchantHits(merchant, ENTERTAINMENT_HARD)) return true;
  // "EVENT" alone in bank statements is almost always Event Cinemas.
  if (/^events?$/.test(merchant.trim())) return true;
  return false;
}

// ── Public API ────────────────────────────────────────────────────────────────

export type PersonalExpenseReason =
  | "gambling"
  | "atm_cash"
  | "generic_interest"
  | "streaming"
  | "alcohol"
  | "fitness"
  | "entertainment"
  | "restaurant_food"
  | "personal_medical"
  | "personal_travel_tourism"
  | "personal_transfer"
  | "rent"
  | "personal";

/**
 * Returns a suppression reason if this transaction is clearly personal, or null
 * if it should proceed to the rules engine.
 *
 * Hard blocks are never overridden.
 * Soft blocks (restaurant, medical, travel) are rescued when the combined text
 * contains a business-context token (invoice, client, conference, etc.).
 */
export function getPersonalExpenseBlockReason(
  tx: TransactionInput,
  userType?: string | null,
): PersonalExpenseReason | null {
  const merchant = tx.normalizedMerchant.toLowerCase();
  const combined = `${tx.normalizedMerchant} ${tx.description}`.toLowerCase();

  // ── Hard blocks (no business-context rescue) ──────────────────────────────

  if (merchantHits(merchant, GAMBLING_HARD))     return "gambling";
  if (wordBoundary(merchant, "tab"))             return "gambling";
  if (keywordHits(combined, PERSONAL_KEYWORDS))  return "gambling";

  if (isAtmOrCash(combined))                    return "atm_cash";
  if (isBankInterest(merchant, combined))        return "generic_interest";

  if (merchantHits(merchant, STREAMING))         return "streaming";
  if (merchantHits(merchant, ALCOHOL))           return "alcohol";
  if (merchantHits(merchant, FITNESS))           return "fitness";
  if (isEntertainmentVenue(merchant))            return "entertainment";

  if (keywordHits(combined, INCOME_KEYWORDS))          return "personal";
  if (keywordHits(combined, TRANSFER_KEYWORDS))        return "personal";
  if (keywordHits(combined, PERSONAL_FINANCE_KEYWORDS)) return "personal";
  if (PERSONAL_SPLIT_REGEX.test(combined))             return "personal";

  if (userType !== "sole_trader" && merchantHits(merchant, GROCERY_ALWAYS)) return "personal";

  // ── Soft blocks (rescued by business-context token) ───────────────────────

  const bizCtx = hasBusinessContext(combined);

  // "Transfer To NAME" — P2P bank transfer. Rescued if destination looks like a
  // business entity (pty/ltd/abn/invoice/ato/accountant in the full description).
  if (TRANSFER_TO_REGEX.test(tx.description) && !bizCtx) return "personal_transfer";

  // Rent payments — personal lease unless clearly commercial premises.
  if (
    wordBoundary(combined, "rent") &&
    !COMMERCIAL_RENT_OVERRIDE.some((t) => combined.includes(t)) &&
    !bizCtx
  ) return "rent";

  if (merchantHits(merchant, FAST_FOOD)          && !bizCtx) return "restaurant_food";
  if (isRestaurantOrFood(merchant, combined)     && !bizCtx) return "restaurant_food";
  if (isPersonalMedical(merchant, combined)      && !bizCtx) return "personal_medical";
  if (isPersonalTravelTourism(merchant, combined) && !bizCtx) return "personal_travel_tourism";

  return null;
}

/**
 * Returns true if this transaction should be suppressed as clearly personal.
 * Called as the very first check in detectDeduction, before any rule runs.
 */
export function isBlacklisted(tx: TransactionInput, userType?: string | null): boolean {
  return getPersonalExpenseBlockReason(tx, userType) !== null;
}
