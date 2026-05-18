// Removes common bank noise from Australian transaction descriptions
// and returns a clean, readable merchant name.
//
// Pipeline (applied in order):
//   -1. Leet-speak repair   — "G0OGLE" → "GOOGLE", "INST@GRAM" → "INSTAGRAM"
//   0.  Merchant alias map  — "GOOGLE *ADS" → "Google Ads" (before prefix stripping)
//   1.  Strip known prefixes — "SQ *COFFEE SHOP" → "COFFEE SHOP"
//   2.  Strip terminal codes — "OFFICEWORKS *AB12CD" → "OFFICEWORKS"
//   3.  Strip location suffix— "OFFICEWORKS SYDNEY NSW" → "OFFICEWORKS"
//   4.  Strip standalone IDs — "RENT 123456" → "RENT"
//   5.  Title-case the result
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

  // ── Google ─────────────────────────────────────────────────────────────────
  // GOOGLE* prefix would be stripped by PREFIXES, losing the product name.
  [/^GOOGLE\s*\*?\s*ADS?\b/i,                    "Google Ads"],
  // Leet-speak variant: GOOGLE ADW0RDS (zero instead of letter o)
  [/^GOOGLE\s*[-*._ ]?\s*ADW[0O]RDS?\b/i,        "Google Ads"],
  [/^GOOGLE\s*\*?\s*ADWORDS?\b/i,                "Google Ads"],
  [/^GOOGLE\s*\*?\s*AD\s+SERVICES?\b/i,          "Google Ads"],
  [/^GOOGLE\s*\*?\s*ANALYTICS?\b/i,              "Google Analytics"],
  [/^GOOGLE\s*\*?\s*STORAGE\b/i,                 "Google"],
  [/^GOOGLE\s*\*?\s*PLAY\b/i,                    "Google"],
  [/^GOOGLE\s*\*?\s*WORKSPACE\b/i,               "Google Workspace"],
  [/^GOOGLE\s*\*?\s*CLOUD\b/i,                   "Google Cloud"],
  [/^GOOGLE\s*\*?\s*ONE\b/i,                     "Google"],

  // ── Meta / Facebook / Instagram ────────────────────────────────────────────
  [/^META\s+(?:PAYMENTS?|ADS?|BUSINESS)\b/i,     "Meta Ads"],
  [/^FACEBOOK\s+ADS?\b/i,                        "Facebook Ads"],
  [/^INSTAGRAM\s+ADS?\b/i,                       "Meta Ads"],
  [/^INSTAGRAM\s+PROMOT/i,                       "Meta Ads"],

  // ── Microsoft / Bing ───────────────────────────────────────────────────────
  // MSFT abbreviation variants — must precede MICROSOFT entries.
  // MSFT-ADVERTISING/BING*AU uses hyphens/slashes that bypass PREFIXES.
  [/^MSFT\s*[\*\s]\s*AZURE\b/i,                  "Microsoft Azure"],
  [/^MSFT\s*[\*\s]\s*365\b/i,                    "Microsoft 365"],
  [/^MICROSOFT\s*[\*\s]\s*365\b/i,               "Microsoft 365"],
  [/^MSFT[-\s*\/]+(?:ADVERTISING|ADS?)\b/i,      "Microsoft Ads"],
  [/^MICROSOFT\s*[\*\s]\s*ADS?\b/i,              "Microsoft Ads"],
  [/^BING\s+ADS?\b/i,                            "Bing Ads"],
  [/^MICROSOFT\s+AZURE\b/i,                      "Microsoft Azure"],

  // ── TikTok ─────────────────────────────────────────────────────────────────
  [/^TIKTOK\s+(?:ADS?|FOR\s+BUSINESS)\b/i,       "TikTok Ads"],

  // ── Twitter / X ────────────────────────────────────────────────────────────
  [/^TWITTER\s+ADS?\b/i,                         "X Ads"],
  [/^X\s+ADS?\b/i,                               "X Ads"],
  [/^X\.COM\s+ADS?\b/i,                          "X Ads"],

  // ── LinkedIn ───────────────────────────────────────────────────────────────
  // LEARNING must precede PREM/ADS so the specific entry wins.
  [/^LINKEDIN\s+LEARNING\b/i,                    "LinkedIn Learning"],
  [/^LINKEDIN\s+PREM\b/i,                        "LinkedIn Premium"],
  [/^LINKEDIN\s+ADS?\b/i,                        "LinkedIn Ads"],

  // ── YouTube / Pinterest / Snapchat / Reddit ────────────────────────────────
  // YouTube Promote* descriptors (YOUTUBE PROMOTE*GOOG etc.) must be caught
  // before TERMINAL_CODE strips the product token.
  [/^YOUTUBE\s+ADS?\b/i,                         "YouTube Ads"],
  [/^YOUTUBE\s+PROMOT/i,                         "YouTube Ads"],
  [/^PINTEREST\s+ADS?\b/i,                       "Pinterest Ads"],
  // SNAP*ADS MANAGER — "SNAP" without "CHAT" must map to Snapchat Ads.
  [/^SNAP\s*\*?\s*ADS?\b/i,                      "Snapchat Ads"],
  [/^SNAPCHAT\s+ADS?\b/i,                        "Snapchat Ads"],
  [/^REDDIT\s+ADS?\b/i,                          "Reddit Ads"],

  // ── AI tools ───────────────────────────────────────────────────────────────
  [/^CHATGPT\b/i,                                "ChatGPT"],
  [/^OPENAI\b/i,                                 "OpenAI"],
  [/^ANTHROPIC\b/i,                              "Anthropic"],
  [/^MIDJOURNEY\b/i,                             "Midjourney"],
  [/^ELEVENLABS\b/i,                             "ElevenLabs"],
  [/^PERPLEXITY\b/i,                             "Perplexity"],

  // ── SEO / analytics tools ─────────────────────────────────────────────────
  // Hyphens, dots, and slashes in these descriptors prevent normal LOCATION_SLUG
  // stripping and ALIAS_MAP substring matching — resolve here first.
  [/^SCREAMING[\s-]*FROG\b/i,                    "Screaming Frog"],
  [/^SURFERSEO\b/i,                              "Surfer SEO"],
  [/^SURFER\s+SEO\b/i,                           "Surfer SEO"],
  [/^MS\s+CLARITY\b/i,                           "Microsoft Clarity"],
  [/^UBERSUGGEST\b/i,                            "Ubersuggest"],
  [/^MOZ\b/i,                                    "Moz"],
  [/^TABOOLA\b/i,                                "Taboola"],
  [/^OUTBRAIN\b/i,                               "Outbrain"],
  [/^ADROLL\b/i,                                 "Adroll"],
  [/^CRITEO\b/i,                                 "Criteo"],

  // ── CRM / support tools ───────────────────────────────────────────────────
  // ACTIVE-CAMPAIGN.COM has a hyphen that blocks ALIAS_MAP substring match.
  [/^ACTIVE[-\s]*CAMPAIGN\b/i,                   "ActiveCampaign"],
  [/^CONSTANTCONTACT\b/i,                        "Constant Contact"],
  // ZOHO*CRM — TERMINAL_CODE strips *CRM; re-resolve before that happens.
  [/^ZOHO\s*\*\s*CRM\b/i,                        "Zoho CRM"],
  [/^FRESHDESK\b/i,                              "Freshdesk"],
  [/^PIPEDRIVE\b/i,                              "Pipedrive"],

  // ── Payment / accounting edge cases ──────────────────────────────────────
  // EFTPOS AIR — must run before PREFIXES strips the EFTPOS token at step 1.
  [/^EFTPOS\s+AIR\b/i,                           "EFTPOS Air"],
  [/^AFTERPAY\s+MERCHANT\b/i,                    "Afterpay Merchant Fee"],
  [/^ZIP\s+(?:CO|PAY|MERCHANT)\b/i,              "Zip"],
  [/^ROUNDED\b/i,                                "Rounded"],
  [/^ZELLER\b/i,                                 "Zeller"],
  [/^SUMUP\b/i,                                  "SumUp"],

  // ── Hosting / DNS providers ───────────────────────────────────────────────
  // .COM / .COM.AU suffixes on these descriptors survive LOCATION_SLUG because
  // the dot is not a space; ALIAS_MAP substring still matches, but we resolve
  // here for cleaner display names.
  // CRAZY DOMAINS — LOCATION_SLUG strips " DOMAINS SYDNEY" → bare "Crazy".
  [/^CRAZY\s+DOMAINS\b/i,                        "Crazy Domains"],
  [/^HOSTGATOR\b/i,                              "Hostgator"],
  [/^BLUEHOST\b/i,                               "Bluehost"],
  [/^SITEGROUND\b/i,                             "Siteground"],
  [/^DNSIMPLE\b/i,                               "Dnsimple"],
  [/^KINSTA\b/i,                                 "Kinsta"],
  [/^WPENGINE\b/i,                               "WP Engine"],
  [/^WP\s+ENGINE\b/i,                            "WP Engine"],
  [/^CLOUDWAYS\b/i,                              "Cloudways"],
  [/^VENTRAIP\b/i,                               "VentraIP"],

  // ── Professional bodies / education ──────────────────────────────────────
  // LOCATION_SLUG strips trailing words like ASSEMBLY, INSTITUTE, MANAGEMENT
  // causing the display normaliser to lose the meaningful part of the name.
  [/^GENERAL\s+ASSEMBLY\b/i,                     "General Assembly"],
  [/^TAX\s+INSTITUTE\b/i,                        "Tax Institute"],
  [/^ACS\s+AUSTRALIA\b/i,                        "ACS Australia"],
  [/^PROJECT\s+MANAGEMENT\b/i,                   "Project Management Institute"],
  [/^CPA\s+AUSTRALIA\b/i,                        "CPA Australia"],
  [/^CHARTERED\s+ACCOUNTANTS\b/i,                "Chartered Accountants ANZ"],
  [/^CA\s+ANZ\b/i,                               "CA ANZ"],
  [/^ENGINEERS\s+AUSTRALIA\b/i,                  "Engineers Australia"],
  // COURSERA / UDEMY — standalone brand names, resolve before location stripping.
  [/^COURSERA\b/i,                               "Coursera"],
  [/^UDEMY\b/i,                                  "Udemy"],

  // ── Workwear / safety ─────────────────────────────────────────────────────
  // RSEA SAFETY #PERTH — TERMINAL_CODE strips #PERTH but LOCATION_SLUG then
  // strips SAFETY; resolve to canonical display name before either step fires.
  [/^RSEA\s+SAFETY\b/i,                          "RSEA Safety"],
  [/^TOTALLY[\s-]*WORKWEAR\b/i,                  "Totally Workwear"],
  [/^BLACKWOODS\b/i,                             "Blackwoods"],
  [/^HARD\s+YAKKA\b/i,                           "Hard Yakka"],
  // PUMA SAFETY / MONGREL BOOTS — LOCATION_SLUG strips SAFETY / BOOTS suffix.
  [/^PUMA\s+SAFETY\b/i,                          "Puma Safety"],
  [/^MONGREL\s+BOOTS?\b/i,                       "Mongrel Boots"],
  // SCRUBS AUSTRALIA — LOCATION_SLUG strips " AUSTRALIA".
  [/^SCRUBS\s+AUSTRALIA\b/i,                     "Scrubs Australia"],

  // ── Design / assets ───────────────────────────────────────────────────────
  // MOTION ARRAY — LOCATION_SLUG strips ARRAY suffix, leaving just "Motion".
  [/^MOTION\s+ARRAY\b/i,                         "Motion Array"],

  // ── Office / hardware retailers ───────────────────────────────────────────
  // BIG W OFFICE / OFFICE CHOICE / TOTAL TOOLS — second word is stripped by
  // LOCATION_SLUG when followed by a location suffix.
  [/^BIG\s+W\s+OFFICE\b/i,                       "Big W Office"],
  [/^OFFICE\s+CHOICE\b/i,                        "Office Choice"],
  // TOTAL TOOLS — LOCATION_SLUG strips TOOLS and SYDNEY TOOLS strips SYDNEY.
  [/^TOTAL\s+TOOLS?\b/i,                         "Total Tools"],

  // ── Hardware / tech retailers ─────────────────────────────────────────────
  // MSY TECHNOLOGY — LOCATION_SLUG strips TECHNOLOGY, leaving just "Msy".
  [/^MSY\s+TECH(?:NOLOGY)?\b/i,                  "MSY Technology"],

  // ── Accounting ─────────────────────────────────────────────────────────────
  [/^XERO\s+AU\b/i,                              "Xero"],
  [/^XERO\s+AUSTRALIA\b/i,                       "Xero"],

  // ── QuickBooks / Intuit ────────────────────────────────────────────────────
  // Must run before TERMINAL_CODE (Step 2) strips "*QUICKBOOKS" off "INTUIT*QUICKBOOKS".
  [/^INTUIT\s*\*\s*QUICKBOOKS?\b/i,              "QuickBooks"],
  [/^INTUIT\s*\*?\s*AU\b/i,                      "QuickBooks"],
  [/^QUICK[\s-]*BOOKS?\b/i,                      "QuickBooks"],

  // ── Sydney Tools ──────────────────────────────────────────────────────────
  // Must run before AU_CITIES (Step 3) strips "SYDNEY" and LOCATION_SLUG strips "TOOLS".
  [/^SYDNEY[\s-]*TOOLS?\b/i,                     "Sydney Tools"],

  // ── Creative / Adobe ───────────────────────────────────────────────────────
  [/^ADOBE\s*[\*\s]\s*CREATIVE\s*CLOUD\b/i,      "Adobe"],
  [/^ADOBE\s*\*\s*ACROBAT\b/i,                   "Adobe"],
  [/^ENVATO\s+PTY\b/i,                           "Envato"],

  // ── Cloud / hosting ────────────────────────────────────────────────────────
  [/^AWS\s+AMAZON\b/i,                           "AWS"],
  [/^AMAZON\s+WEB\s+SERVICES?\b/i,               "AWS"],
  // AMAZON BUSINESS — LOCATION_SLUG strips " BUSINESS" → bare "Amazon".
  [/^AMAZON\s+BUSINESS\b/i,                      "Amazon Business"],
  [/^GCP\b/i,                                    "Google Cloud"],
  [/^DIGITALOCEAN\b/i,                           "DigitalOcean"],

  // ── Payment processing ─────────────────────────────────────────────────────
  // PayPal fee aliases must run before PREFIXES (Step 1) strips "PAYPAL*" off "PAYPAL*FEE".
  [/^PAYPAL\s*\*?\s*FEE[S]?\b/i,                 "PayPal Fee"],
  [/^PAYPAL\s*\*?\s*MERCHANT\b/i,                "PayPal Fee"],
  // "PAYPAL AU" / "PAYPAL AUSTRALIA" are the Australian PayPal entity — they appear for both
  // consumer payments and merchant fees. Normalise to bare "PayPal" so detectAmbiguousPayment
  // can surface them at LOW confidence rather than auto-categorising as Payment Processing.
  [/^PAYPAL\s*\*?\s*AU\b/i,                      "PayPal"],
  [/^PAYPAL\s*AUSTRALIA\b/i,                     "PayPal"],
  [/^STRIPE\s+PAYMENTS?\b/i,                     "Stripe"],
  [/^STRIPE\s+TECHNOLOGY\b/i,                    "Stripe"],
  [/^AIRWALLEX\b/i,                              "Airwallex"],
  [/^WISE\s+BUSINESS\b/i,                        "Wise"],

  // ── Apple ──────────────────────────────────────────────────────────────────
  // Resolve APPLE.COM/* and the plain "APPLE SERVICES" descriptor before LOCATION_SLUG
  // can strip " SERVICES" (all-caps slug) and before PREFIXES touch anything.
  [/^APPLE\s+SERVICES?\b/i,                      "Apple Services"],
  [/^APPLE\.COM\b/i,                             "Apple Services"],

  // ── Sponsored / branded venues ────────────────────────────────────────────
  // Physical venues whose names begin with a telco or brand sponsor.
  // Must be caught before LOCATION_SLUG strips the venue word (e.g. "STADIUM",
  // "DOME"), which would leave only the sponsor name and cause false category
  // matches (e.g. "Optus" → Phone & Internet).
  [/^OPTUS\s+STADIUM\b/i,              "Optus Stadium"],
  [/^TELSTRA\s+DOME\b/i,              "Telstra Dome"],
  [/^TELSTRA\s+STADIUM\b/i,           "Telstra Stadium"],

  // ── Fuel brands ───────────────────────────────────────────────────────────
  // "EG AMPOL" — EG Group operates Ampol-branded fuel stations.
  // LOCATION_SLUG strips " AMPOL" → "EG"; resolve to Ampol first.
  [/^EG\s+AMPOL\b/i,                             "Ampol"],
  // "UNITED PETROLEUM" — LOCATION_SLUG strips " PETROLEUM" → "United".
  [/^UNITED\s+PETROLEUM\b/i,                     "United Petroleum"],
  // "PUMA ENERGY" — LOCATION_SLUG strips " ENERGY" → "Puma", losing brand context.
  [/^PUMA\s+ENERGY\b/i,                          "Puma Energy"],

  // ── Parking brands ────────────────────────────────────────────────────────
  // LOCATION_SLUG strips the "PARKING" suffix, losing the brand context.
  // Resolve to full display names before any stripping occurs.
  [/^WILSON\s+PARKING\b/i,                       "Wilson Parking"],
  [/^SECURE\s+PARKING\b/i,                       "Secure Parking"],
  [/^CPP\s+PARKING\b/i,                          "CPP Parking"],
  [/^CITY\s+OF\s+PERTH\s+PARKING\b/i,            "City of Perth Parking"],

  // ── Uber variants ─────────────────────────────────────────────────────────
  // "UBER EATS" must be resolved before LOCATION_SLUG strips "EATS" → "Uber",
  // which would lose the food-delivery context needed to avoid Work Travel.
  [/^UBER[\s*]+EATS?\b/i,                        "Uber Eats"],
  // "UBER HELP.UBER.COM" / "UBER * HELP.UBER.C" — Uber's help-centre URL appears
  // in bank statements. "HELP" (4 chars) triggers importantTokenMatch → "Help Scout".
  // Resolve to bare "Uber" before any fuzzy matching runs.
  [/^UBER\s*\*?\s*HELP\b/i,                      "Uber"],

  // ── Taxi services ─────────────────────────────────────────────────────────
  // "13 CABS" — LOCATION_SLUG strips "CABS" → "13" (not a recognisable merchant).
  // Must be caught before stripping so the canonical name is preserved.
  [/^13\s+CABS?\b/i,                             "13cabs"],

  // ── Company legal suffixes (≤2 chars, not caught by LOCATION_SLUG) ─────────
  [/^UBER\s+BV\b/i,                              "Uber"],
  [/^CANVA\s+PTY\b/i,                            "Canva"],
  [/^SHOPIFY\s+INC\b/i,                          "Shopify"],
  [/^WISTIA\s+INC\b/i,                           "Wistia"],
  [/^LOOM\s+INC\b/i,                             "Loom"],
  [/^ZAPIER\s+INC\b/i,                           "Zapier"],
];

// ---------------------------------------------------------------------------
// Step -1 — Leet-speak repair (applied before everything else)
// ---------------------------------------------------------------------------
// Repairs @ → a and 0 → o — the two substitutions reliably unambiguous in
// Australian bank merchant descriptors. Applied to the raw description before
// MERCHANT_ALIASES, so patterns like /^GOOGLE\s*ADS/i match "G0OGLE ADS" and
// /^INSTAGRAM\s+ADS/i matches "INST@GRAM ADS".
// Only @ and 0 are repaired here — the other leet digits (1, 3, 5, 8) are
// handled by normalizeMerchantFuzzy in the classification layer.
function repairLeetspeakDisplay(raw: string): string {
  return raw
    .replace(/@/g, "a")
    // Only repair 0→o when the zero is directly between two letters.
    // This preserves standalone reference codes like "0042" (preceded by a space)
    // while fixing leet-speak like "G0OGLE" (zero between G and O).
    .replace(/(?<=[a-zA-Z])0(?=[a-zA-Z])/g, "o");
}

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
  // -1. Leet-speak repair — must run before MERCHANT_ALIASES so regex patterns
  // designed for clean descriptors also match corrupted bank descriptions.
  let result = repairLeetspeakDisplay(description.trim());

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
