// Removes common bank noise from Australian transaction descriptions
// and returns a clean, readable merchant name.
//
// Pipeline (applied in order):
//   0. Merchant alias map   — "GOOGLE *ADS" → "Google Ads" (before prefix stripping)
//   1. Strip known prefixes — "SQ *COFFEE SHOP" → "COFFEE SHOP"
//   2. Strip terminal codes — "OFFICEWORKS *AB12CD" → "OFFICEWORKS"
//   3. Strip location suffix— "OFFICEWORKS SYDNEY NSW" → "OFFICEWORKS"
//   4. Strip standalone IDs — "RENT 123456" → "RENT"
//   5. Title-case the result
//
// Examples:
//   "SQ *RIVERSIDE CAFE"           → "Riverside Cafe"
//   "PAYPAL *ADOBEINC"             → "Adobeinc"      (Basiq resolves these better)
//   "POS PURCHASE BUNNINGS AUBURN"  → "Bunnings"
//   "OFFICEWORKS 0042 SYDNEY"       → "Officeworks"
//   "AMZN*AB12CD SEATTLE"           → "Amzn"
//   "DIRECT DEBIT 123456 RENT"      → "Direct Debit Rent"
//   "GOOGLE *ADS"                   → "Google Ads"
//   "META PAYMENTS"                 → "Meta Ads"
//   "LINKEDIN PREM"                 → "LinkedIn Premium"

// ---------------------------------------------------------------------------
// Step 0 — Merchant alias map (runs before prefix stripping)
// ---------------------------------------------------------------------------
// Some bank descriptions contain a product name after a prefix that would
// otherwise be stripped (e.g. "GOOGLE *ADS" → "ADS" without this step).
// Each entry: [pattern to match against the raw description, canonical name].
// Applied case-insensitively; first match wins.
const MERCHANT_ALIASES: [RegExp, string][] = [
  // Google products — GOOGLE* prefix would be stripped, losing the product name
  [/^GOOGLE\s*\*\s*ADS?\b/i,                   "Google Ads"],
  [/^GOOGLE\s*\*\s*STORAGE\b/i,                 "Google"],
  [/^GOOGLE\s*\*\s*PLAY\b/i,                    "Google"],
  // Meta / Facebook advertising
  [/^META\s+(?:PAYMENTS?|ADS?)\b/i,             "Meta Ads"],
  [/^FACEBOOK\s+ADS?\b/i,                       "Facebook Ads"],
  // TikTok advertising
  [/^TIKTOK\s+(?:ADS?|FOR\s+BUSINESS)\b/i,      "TikTok Ads"],
  // LinkedIn Premium — "PREM" suffix would be stripped as location noise
  [/^LINKEDIN\s+PREM\b/i,                        "LinkedIn Premium"],
  // AI tools
  [/^CHATGPT\b/i,                                "ChatGPT"],
  [/^OPENAI\b/i,                                 "OpenAI"],
  // AWS — drop the verbose form before location stripping removes too much
  [/^AWS\s+AMAZON\b/i,                           "AWS"],
  // Microsoft 365 standalone billing description
  [/^MICROSOFT\s*[\*\s]\s*365\b/i,               "Microsoft 365"],
  // Xero — location suffixes like "XERO AU SYDNEY" already handled by LOCATION_SLUG,
  // but catch "XERO AUSTRALIA" etc. which might not be all-caps in the slug regex
  [/^XERO\s+AU\b/i,                              "Xero"],
  // Adobe Creative Cloud — alias so normalisation doesn't produce "Adobe Creative Cloud"
  // as a separate string from the "adobe" merchant key
  [/^ADOBE\s*[\*\s]\s*CREATIVE\s*CLOUD\b/i,      "Adobe"],
  // Common company legal suffixes that banks append but stripping pipeline doesn't catch
  // (≤2 chars don't trigger LOCATION_SLUG which requires ≥3 chars)
  [/^UBER\s+BV\b/i,                               "Uber"],
  [/^CANVA\s+PTY\b/i,                             "Canva"],
];

// ---------------------------------------------------------------------------
// Step 1 — Strip known prefixes
// ---------------------------------------------------------------------------
// Each entry is matched case-insensitively at the start of the string.
// Order matters: longer/more-specific prefixes should come first.
const PREFIXES = [
  // Square reader
  /^SQ\s*\*/i,
  // PayPal merchant charges
  /^PAYPAL\s*\*/i,
  // Generic POS / card-terminal noise
  /^POS\s+PURCHASE\s+/i,
  /^POS\s+/i,
  // Visa/Mastercard payWave and contactless labels
  /^VISA\s+PURCHASE\s+/i,
  /^VISA\s+DEBIT\s+/i,
  /^VISA\s+/i,
  /^MC\s+/i,
  // Commonwealth Bank / NAB tap-and-pay prefix
  /^EFTPOS\s+/i,
  // Direct debit / recurring billing noise (keep the merchant name after the label)
  /^DIRECT\s+DEBIT\s+/i,
  /^DD\s+BPAY\s+/i,
  /^BPAY\s+/i,
  // Apple Pay / Google Pay labelling
  /^APL\*\s*/i,
  /^GOOGLE\s*\*/i,
];

// ---------------------------------------------------------------------------
// Step 2 — Strip terminal / authorisation codes
// ---------------------------------------------------------------------------
// Matches *AB12CD, #1234, or standalone codes glued to a merchant name.
const TERMINAL_CODE = /[*#]\s*[A-Z0-9]{3,}/gi;

// ---------------------------------------------------------------------------
// Step 3 — Strip location suffixes
// ---------------------------------------------------------------------------
// Australian state abbreviations and capital city names that banks append.
// Matched as whole words so "DARWIN" in a brand name isn't stripped.
const AU_STATES   = /\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b/gi;
const AU_CITIES   = /\b(SYDNEY|MELBOURNE|BRISBANE|PERTH|ADELAIDE|HOBART|DARWIN|CANBERRA|GOLD COAST|NEWCASTLE|WOLLONGONG)\b/gi;
// Strip anything that looks like a suburb/postcode slug: "AUBURN", "PARRAMATTA 2150"
// Only strip if it follows a space and is ALL-CAPS (bank-appended, not brand name).
const LOCATION_SLUG = /\s+[A-Z][A-Z ]{2,}(?:\s+\d{4})?\s*$/;

// ---------------------------------------------------------------------------
// Step 4 — Strip standalone numeric sequences (transaction / reference IDs)
// ---------------------------------------------------------------------------
const DIGIT_SEQUENCE = /\b\d{3,}\b/g;

// Collapse multiple spaces after substitutions.
const EXTRA_SPACES = /\s{2,}/g;

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function normalizeMerchant(description: string): string {
  let result = description.trim();

  // 0. Merchant alias map — resolve known patterns before any stripping.
  for (const [pattern, canonical] of MERCHANT_ALIASES) {
    if (pattern.test(result)) return canonical;
  }

  // 1. Strip known prefixes (loop so stacked prefixes like "POS PURCHASE SQ *" are removed).
  let changed = true;
  while (changed) {
    changed = false;
    for (const prefix of PREFIXES) {
      const next = result.replace(prefix, "").trim();
      if (next !== result) { result = next; changed = true; }
    }
  }

  // 2. Strip terminal / auth codes.
  result = result.replace(TERMINAL_CODE, " ").trim();

  // 3. Strip location suffixes.
  result = result.replace(AU_STATES,    " ");
  result = result.replace(AU_CITIES,    " ");
  result = result.replace(LOCATION_SLUG, "");

  // 4. Strip standalone numeric IDs.
  result = result.replace(DIGIT_SEQUENCE, " ");

  // 5. Collapse whitespace and title-case.
  result = result.replace(EXTRA_SPACES, " ").trim();
  result = toTitleCase(result);

  // Fall back to raw description if everything was stripped.
  return result || toTitleCase(description.trim());
}
