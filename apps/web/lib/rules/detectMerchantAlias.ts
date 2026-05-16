// Hard merchant alias override — priority 10 (highest), runs before all other rules.
//
// Forces a match for well-known business merchants regardless of user type.
// This bypasses the forUserTypes restriction in merchants.ts / detectFallback,
// ensuring these merchants are always surfaced for review — even for employees
// who may have a side business or be reimbursed separately.
//
// Matching uses the same word-boundary logic as matchesMerchant():
//   names ≤ 4 chars require word boundaries; longer names use substring.
// All entries return MEDIUM confidence with canUpgrade=true so contractors and
// sole traders receive a +1 lift to HIGH via adjustConfidence (DELTAS in userTypeLayer).

import type { Rule, RawMatch, Explanation, Confidence } from "./types";
import { CATEGORIES } from "./categories";
import { merchantText, matchesMerchant } from "./shared";
import { findMerchantAliasMatch, FUZZY_ALIAS_GROUPS } from "./merchantMatcher";

type AliasEntry = {
  category:   string;
  confidence: Confidence;
  what:       string;
};

const ALIAS_MAP: [string, AliasEntry][] = [

  // ── Marketing & Advertising ────────────────────────────────────────────────
  ["google ads",      { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an online advertising platform" }],
  ["google adwords",  { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an online advertising platform" }],
  ["meta ads",        { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "a social media advertising platform" }],
  ["facebook ads",    { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "a social media advertising platform" }],
  ["instagram ads",   { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "a social media advertising platform" }],
  ["linkedin ads",    { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "a professional network advertising platform" }],
  ["tiktok ads",      { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "a social media advertising platform" }],
  ["x ads",           { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "a social media advertising platform" }],
  ["twitter ads",     { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "a social media advertising platform" }],
  ["youtube ads",     { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an online advertising platform" }],
  ["pinterest ads",   { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "a social media advertising platform" }],
  ["snapchat ads",    { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "a social media advertising platform" }],
  ["reddit ads",      { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an online advertising platform" }],
  ["bing ads",        { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an online advertising platform" }],
  ["microsoft ads",   { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an online advertising platform" }],
  ["mailchimp",       { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an email marketing platform" }],
  ["klaviyo",         { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an email and SMS marketing platform" }],
  ["activecampaign",  { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "a marketing automation and CRM platform" }],
  ["brevo",           { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an email marketing platform" }],
  ["convertkit",      { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an email marketing platform for creators" }],
  ["sendgrid",        { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an email delivery platform" }],
  ["semrush",         { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an SEO and digital marketing platform" }],
  ["ahrefs",          { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an SEO analytics platform" }],
  ["hotjar",          { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "a website analytics and heatmap tool" }],

  // ── Accounting & Business ──────────────────────────────────────────────────
  ["xero",            { category: CATEGORIES.ACCOUNTING, confidence: "MEDIUM", what: "cloud accounting software" }],
  ["myob",            { category: CATEGORIES.ACCOUNTING, confidence: "MEDIUM", what: "accounting and payroll software" }],
  ["quickbooks",      { category: CATEGORIES.ACCOUNTING, confidence: "MEDIUM", what: "accounting and invoicing software" }],
  ["quick books",     { category: CATEGORIES.ACCOUNTING, confidence: "MEDIUM", what: "accounting and invoicing software" }],
  ["intuit",          { category: CATEGORIES.ACCOUNTING, confidence: "MEDIUM", what: "accounting software (QuickBooks)" }],
  ["reckon",          { category: CATEGORIES.ACCOUNTING, confidence: "MEDIUM", what: "accounting software" }],
  ["freshbooks",      { category: CATEGORIES.ACCOUNTING, confidence: "MEDIUM", what: "invoicing and accounting software" }],
  ["invoice2go",      { category: CATEGORIES.ACCOUNTING, confidence: "MEDIUM", what: "mobile invoicing software" }],
  ["hnry",            { category: CATEGORIES.ACCOUNTING, confidence: "MEDIUM", what: "a contractor tax and invoicing service" }],

  // ── Website & Domains ──────────────────────────────────────────────────────
  // NOTE: squarespace must precede square so "Squarespace" doesn't match the shorter key first.
  ["shopify",         { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "an ecommerce platform" }],
  ["godaddy",         { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a domain registrar and web host" }],
  ["crazy domains",   { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a domain registrar" }],
  ["namecheap",       { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a domain registrar" }],
  ["domain.com.au",   { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "an Australian domain registrar" }],
  ["squarespace",     { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a website builder and hosting platform" }],
  ["wix",             { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a website builder" }],
  ["webflow",         { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a no-code website design platform" }],
  ["vercel",          { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a cloud platform for web deployments" }],
  ["netlify",         { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a web hosting and deployment platform" }],
  ["heroku",          { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a cloud application platform" }],
  ["hostinger",       { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a web hosting and domain service" }],
  ["render",          { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a cloud hosting platform" }],
  ["railway",         { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a cloud infrastructure platform" }],
  ["digitalocean",    { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a cloud hosting provider" }],

  // ── Payment Processing ─────────────────────────────────────────────────────
  // PayPal fee variants — checked before generic "paypal" to return the right category.
  ["paypal fee",       { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a payment processing fee" }],
  ["paypal merchant",  { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a payment processing service" }],
  ["paypal australia", { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a payment processing service" }],
  ["paypal au",        { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a payment processing service" }],
  // Square — squarespace entry above must remain earlier in the list (longer key wins via first-match).
  ["squareup",         { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a payment processing and POS platform" }],
  ["square payments",  { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a payment processing platform" }],
  ["square pos",       { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a point of sale system" }],
  ["square au",        { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a payment processing platform" }],
  ["square up",        { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a payment processing and POS platform" }],
  ["square",           { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a payment processing and POS platform" }],
  ["stripe",           { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a payment processing platform" }],
  ["airwallex",        { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a global business payment platform" }],
  ["tyro",             { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "an Australian business payment terminal provider" }],
  ["wise",             { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "an international business payment platform" }],

  // ── Equipment — trade & tool retailers ────────────────────────────────────
  ["sydney tools",    { category: CATEGORIES.EQUIPMENT,  confidence: "MEDIUM", what: "a trade tools and equipment retailer" }],
  ["sydneytools",     { category: CATEGORIES.EQUIPMENT,  confidence: "MEDIUM", what: "a trade tools and equipment retailer" }],

  // ── Apple Services ────────────────────────────────────────────────────────
  // Canonical name produced by normalizeMerchant for APPLE.COM/* descriptors.
  ["apple services",  { category: CATEGORIES.SOFTWARE,   confidence: "MEDIUM", what: "Apple service subscriptions (iCloud, Apple One, App Store)" }],

];

function detect(tx: { normalizedMerchant: string; description: string }, _userType?: string | null): RawMatch | null {
  // ── Priority 1: fuzzy match on the raw bank descriptor ───────────────────
  // Runs before the exact ALIAS_MAP check so that the real underlying merchant
  // (e.g. Klaviyo in "SHOPIFY*KLAVIYO", OpenAI in "STRIPE*OPENAI") wins even
  // when the display normalizer has already lost it to terminal-code stripping.
  const fuzzyResult = findMerchantAliasMatch(tx.description, FUZZY_ALIAS_GROUPS);
  if (fuzzyResult) {
    if (process.env.NODE_ENV === "development") {
      console.log("[Kashio Engine] Merchant match", {
        raw:          tx.description,
        normalized:   fuzzyResult.normalizedMerchant,
        matchedAlias: fuzzyResult.matchedAlias,
        category:     fuzzyResult.category,
        matchSource:  fuzzyResult.matchSource,
      });
    }
    return {
      category:   fuzzyResult.category,
      confidence: fuzzyResult.confidence,
      canUpgrade: true,
      signals: {
        aliasMatch:    fuzzyResult.matchedAlias,
        what:          fuzzyResult.what,
        canonicalName: fuzzyResult.name,
        matchSource:   "merchant_alias_fuzzy",
      },
    };
  }

  // ── Priority 2: exact ALIAS_MAP check on the display-normalised merchant ──
  const merchant = merchantText(tx);
  for (const [name, entry] of ALIAS_MAP) {
    if (matchesMerchant(merchant, name)) {
      return {
        category:   entry.category,
        confidence: entry.confidence,
        canUpgrade: true,
        signals:    { aliasMatch: name, what: entry.what },
      };
    }
  }
  return null;
}

function explain(match: RawMatch, tx: { normalizedMerchant: string }, userType?: string | null): Explanation {
  const isBusiness  = userType === "contractor" || userType === "sole_trader";
  const context     = isBusiness ? "your business" : "your work";
  const what        = match.signals.what as string;
  // Fuzzy matches supply a canonical brand name (e.g. "Klaviyo") to avoid
  // surfacing the messy display-normalised merchant (e.g. "Shopify") in the UI.
  const displayName = (match.signals.canonicalName as string | undefined) ?? tx.normalizedMerchant;
  return {
    reason:           `${displayName} is ${what}. If this was for ${context}, it may be deductible — confirm before claiming.`,
    confidenceReason: `Recognised ${match.category.toLowerCase()} provider. Confirm it was a work or business expense before claiming.`,
    mixedUse:         true,
  };
}

export const detectMerchantAlias: Rule = { priority: 10, detect, explain };
