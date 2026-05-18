// Ambiguous payment processor rule — priority 11 (beats detectMerchantAlias priority 10).
//
// Intercepts well-known payment platforms that are frequently used for personal
// transactions (Wise international transfers, consumer BNPL like Afterpay/Zip,
// bare PayPal) and keeps them at LOW confidence / Uncategorised until the user
// confirms deductibility.
//
// Payment Processing is reserved for clearly-business merchant service fees
// (Stripe, Square, etc.). These ambiguous platforms are NOT Payment Processing
// by default — they need human review.
//
// Business-context upgrade: if the description contains a clear business signal
// (invoice, client, ABN, supplier, etc.) confidence is raised to MEDIUM.
//
// Exclusion: if the merchant name contains a business marker (fee, merchant,
// payout, processing) the rule returns null, allowing detectMerchantAlias to
// handle the clearly-business variant (e.g. "Afterpay Merchant Fee").

import type { Rule, RawMatch, Explanation } from "./types";
import { CATEGORIES } from "./categories";
import { merchantText, matchesMerchant, combinedText } from "./shared";

// ── Ambiguous platform names ──────────────────────────────────────────────────
// These are matched against the display-normalised merchant (lowercased).
// Only bare/consumer forms are listed — specific business variants (e.g. "Afterpay
// Merchant Fee", "Zip Merchant") are handled by detectMerchantAlias and must not
// be double-intercepted here (see BUSINESS_PAYMENT_MARKERS below).
const AMBIGUOUS_PROCESSORS: { name: string; what: string }[] = [
  { name: "wise",      what: "an international money transfer service" },
  { name: "afterpay",  what: "a buy-now-pay-later service" },
  { name: "paypal",    what: "an online payment service" },
  { name: "zip",       what: "a buy-now-pay-later service" },
  { name: "zip co",    what: "a buy-now-pay-later service" },
  { name: "zip pay",   what: "a buy-now-pay-later service" },
  { name: "humm",      what: "a buy-now-pay-later service" },
  { name: "laybuy",    what: "a buy-now-pay-later service" },
  { name: "openpay",   what: "a buy-now-pay-later service" },
  { name: "splitit",   what: "a buy-now-pay-later service" },
];

// If the normalised merchant contains any of these words it is already a
// clearly-business variant handled by detectMerchantAlias — skip it here.
const BUSINESS_PAYMENT_MARKERS = ["fee", "merchant", "payout", "processing", "settlement"];

// ── Business-context tokens for description upgrade ───────────────────────────
// If the combined text (merchant + raw description) contains one of these,
// the match is upgraded to MEDIUM — it's probably a legitimate business payment.
//
// Deliberately excludes company-name fragments ("pty", "ltd") and ambiguous short
// tokens ("tax", "ato") that appear inside unrelated words.  Short identifiers
// ("abn") are checked with a word boundary to avoid false substring matches.
const BUSINESS_CONTEXT_TOKENS_SUBSTRING = [
  "invoice", "client", "supplier", "vendor",
  "subscription", "domain", "hosting", "software",
  "accountant", "accounting", "bookkeeper",
  "payroll", "contractor", "freelance",
];

// These require word-boundary matching to avoid false substring hits
// (e.g. "abn" inside "cabinet" does not exist but "ato" inside "patong" does).
const BUSINESS_CONTEXT_TOKENS_WORD = ["abn", "asic", "ato"];

function hasBusinessContext(combined: string): boolean {
  if (BUSINESS_CONTEXT_TOKENS_SUBSTRING.some((t) => combined.includes(t))) return true;
  if (BUSINESS_CONTEXT_TOKENS_WORD.some((t) => new RegExp(`(?:^|[^a-z])${t}(?:[^a-z]|$)`).test(combined))) return true;
  return false;
}

function detect(
  tx: { normalizedMerchant: string; description: string },
): RawMatch | null {
  const merchant = merchantText(tx);

  // Skip if this is a clearly-business variant (fee/merchant/payout suffix).
  if (BUSINESS_PAYMENT_MARKERS.some((m) => merchant.includes(m))) return null;

  const entry = AMBIGUOUS_PROCESSORS.find(({ name }) => matchesMerchant(merchant, name));
  if (!entry) return null;

  const combined  = combinedText(tx);
  const bizCtx    = hasBusinessContext(combined);
  const confidence = bizCtx ? "MEDIUM" : "LOW";

  return {
    category:   CATEGORIES.UNCATEGORISED,
    confidence,
    canUpgrade: false,
    signals:    { ambiguousPayment: entry.name, what: entry.what },
  };
}

function explain(
  match: RawMatch,
  tx: { normalizedMerchant: string; description: string },
  userType?: string | null,
): Explanation {
  const what      = match.signals.what as string;
  const isBiz     = userType === "contractor" || userType === "sole_trader";
  const context   = isBiz ? "your business" : "your work";
  const isBnpl    = (what as string).includes("buy-now-pay-later");

  if (match.confidence === "MEDIUM") {
    return {
      reason: `${tx.normalizedMerchant} is ${what}. The description suggests a possible business payment — review and confirm if it was for ${context} before claiming.`,
      confidenceReason: "Business-context keywords were found in the description, but the payment platform itself is often used for personal transactions. Review before claiming.",
      mixedUse: true,
    };
  }

  if (isBnpl) {
    return {
      reason: `${tx.normalizedMerchant} is ${what}. The underlying purchase may be deductible — review what was bought and whether it was for ${context}.`,
      confidenceReason: `${tx.normalizedMerchant} payments appear in bank statements as a single charge regardless of what was purchased. Check your ${tx.normalizedMerchant} account for the item details before claiming.`,
      mixedUse: true,
    };
  }

  return {
    reason: `${tx.normalizedMerchant} is ${what}. This could be a personal transfer or a business payment — review the transaction and confirm if it was for ${context} before claiming.`,
    confidenceReason: `${tx.normalizedMerchant} is used for both personal and business payments. No business context was found in the description — confirm before claiming.`,
    mixedUse: true,
  };
}

export const detectAmbiguousPayment: Rule = { priority: 11, detect, explain };
