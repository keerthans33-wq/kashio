import { describe, it, expect } from "vitest";
import { detectDeduction } from "../rules";
import { normalizeMerchant } from "../normalizeMerchant";
import { normalizeMerchantFuzzy, tokenizeMerchant, findMerchantAliasMatch, FUZZY_ALIAS_GROUPS } from "../rules/merchantMatcher";

// Helper: mirrors how the pipeline builds a TransactionInput from a raw bank descriptor.
function tx(rawDescription: string, amount = -50) {
  return {
    description:        rawDescription,
    normalizedMerchant: normalizeMerchant(rawDescription),
    amount,
  };
}

// ─── normalizeMerchantFuzzy ──────────────────────────────────────────────────
describe("normalizeMerchantFuzzy — leet-speak and separator handling", () => {
  it("replaces 0 → o", () => {
    expect(normalizeMerchantFuzzy("ADW0RDS")).toBe("adwords");
  });

  it("replaces * with space", () => {
    expect(normalizeMerchantFuzzy("MSFT*AZURE")).toBe("msft azure");
  });

  it("replaces / with space", () => {
    expect(normalizeMerchantFuzzy("APPLE.COM/BILL")).toBe("apple");
  });

  it("replaces - with space", () => {
    expect(normalizeMerchantFuzzy("VERCEL-V0*AI")).toBe("vercel vo ai");
  });

  it("removes noise words: pty, inc, au, com, bill, payment", () => {
    expect(normalizeMerchantFuzzy("ATLASSIAN PTY")).toBe("atlassian");
    expect(normalizeMerchantFuzzy("GITHUB INC")).toBe("github");
    expect(normalizeMerchantFuzzy("GOOGLE AU")).toBe("google");
    expect(normalizeMerchantFuzzy("STRIPE PAYMENT")).toBe("stripe");
  });

  it("collapses multiple spaces", () => {
    expect(normalizeMerchantFuzzy("PAYPAL  *  FIGMA")).toBe("paypal figma");
  });
});

// ─── tokenizeMerchant ────────────────────────────────────────────────────────
describe("tokenizeMerchant", () => {
  it("splits on spaces and filters single-char tokens", () => {
    expect(tokenizeMerchant("stripe openai")).toEqual(["stripe", "openai"]);
  });

  it("filters empty strings", () => {
    expect(tokenizeMerchant("  notion  ")).toEqual(["notion"]);
  });
});

// ─── findMerchantAliasMatch ──────────────────────────────────────────────────
describe("findMerchantAliasMatch — unit", () => {
  it("returns null when no group matches", () => {
    expect(findMerchantAliasMatch("WOOLWORTHS GROCERIES", FUZZY_ALIAS_GROUPS)).toBeNull();
  });

  it("matches via exactIncludes (figma inside paypal figma)", () => {
    const result = findMerchantAliasMatch("PAYPAL * FIGMA", FUZZY_ALIAS_GROUPS);
    expect(result).not.toBeNull();
    expect(result?.name).toBe("Figma");
    expect(result?.matchSource).toBe("merchant_alias_fuzzy");
  });

  it("matches Klaviyo via exactIncludes (klaviyo inside shopify klaviyo)", () => {
    const result = findMerchantAliasMatch("SHOPIFY*KLAVIYO", FUZZY_ALIAS_GROUPS);
    expect(result?.name).toBe("Klaviyo");
  });

  it("matches OpenAI via exactIncludes (openai inside stripe openai)", () => {
    const result = findMerchantAliasMatch("STRIPE*OPENAI", FUZZY_ALIAS_GROUPS);
    expect(result?.name).toBe("OpenAI");
  });

  it("matches GitHub after leet-speak + noise removal (github*inc → github)", () => {
    const result = findMerchantAliasMatch("GITHUB*INC", FUZZY_ALIAS_GROUPS);
    expect(result?.name).toBe("GitHub");
  });

  it("matches Notion via importantTokenMatch (notion in notion labs)", () => {
    const result = findMerchantAliasMatch("NOTION LABS", FUZZY_ALIAS_GROUPS);
    expect(result?.name).toBe("Notion");
  });

  it("matches Atlassian after pty noise removal", () => {
    const result = findMerchantAliasMatch("ATLASSIAN PTY", FUZZY_ALIAS_GROUPS);
    expect(result?.name).toBe("Atlassian");
  });

  it("matches Microsoft Azure via azure token", () => {
    const result = findMerchantAliasMatch("MSFT*AZURE", FUZZY_ALIAS_GROUPS);
    expect(result?.name).toBe("Microsoft Azure");
  });

  it("returns matchSource merchant_alias_fuzzy", () => {
    const result = findMerchantAliasMatch("GITHUB*INC", FUZZY_ALIAS_GROUPS);
    expect(result?.matchSource).toBe("merchant_alias_fuzzy");
  });
});

// ─── Full pipeline — 10 required regression cases ────────────────────────────
describe("detectDeduction — fuzzy merchant matching regression", () => {

  // 1. GOOGLE ADW0RDS-AU — leet-speak zero in ADWORDS, dash before AU
  it("GOOGLE ADW0RDS-AU → Marketing & Advertising", () => {
    const result = detectDeduction(tx("GOOGLE ADW0RDS-AU"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Marketing & Advertising");
  });

  // 2. MSFT*AZURE — MSFT abbreviation, AZURE lost to terminal-code stripping
  it("MSFT*AZURE → Software & Subscriptions", () => {
    const result = detectDeduction(tx("MSFT*AZURE"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  // 3. GITHUB*INC — INC stripped as terminal code; github is broad in merchants.ts (needs keyword)
  it("GITHUB*INC → Software & Subscriptions", () => {
    const result = detectDeduction(tx("GITHUB*INC"), "employee");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  // 4. NOTION LABS — LABS stripped by LOCATION_SLUG; without fuzzy: LOW via detectSoftware
  it("NOTION LABS → Software & Subscriptions MEDIUM (fuzzy lifts from LOW)", () => {
    const result = detectDeduction(tx("NOTION LABS"), "employee");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
    expect(result?.confidence).toBe("MEDIUM");
  });

  // 5. ATLASSIAN PTY — PTY stripped; same issue as Notion
  it("ATLASSIAN PTY → Software & Subscriptions MEDIUM (fuzzy lifts from LOW)", () => {
    const result = detectDeduction(tx("ATLASSIAN PTY"), "employee");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
    expect(result?.confidence).toBe("MEDIUM");
  });

  // 6. APPLE.COM/BILL — dot/slash noise; resolved via MERCHANT_ALIASES → "Apple Services" → ALIAS_MAP
  it("APPLE.COM/BILL → Software & Subscriptions", () => {
    const result = detectDeduction(tx("APPLE.COM/BILL"), "employee");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  // 7. PAYPAL * FIGMA — PAYPAL* prefix stripped by display normalizer; fuzzy finds figma
  it("PAYPAL * FIGMA → Software & Subscriptions (Figma wins over PayPal)", () => {
    const result = detectDeduction(tx("PAYPAL * FIGMA"), "employee");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  // 8. STRIPE*OPENAI — OPENAI lost to terminal-code stripping → currently "Stripe"; fuzzy finds openai
  it("STRIPE*OPENAI → Software & Subscriptions (OpenAI wins over Stripe)", () => {
    const result = detectDeduction(tx("STRIPE*OPENAI"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  // 9. SHOPIFY*KLAVIYO — KLAVIYO lost to terminal-code stripping → currently "Shopify"; fuzzy finds klaviyo
  it("SHOPIFY*KLAVIYO → Marketing & Advertising (Klaviyo wins over Shopify)", () => {
    const result = detectDeduction(tx("SHOPIFY*KLAVIYO"), "sole_trader");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Marketing & Advertising");
  });

  // 10. VERCEL-V0*AI — "AI" is 2 chars so terminal-code doesn't strip it; vercel matches ALIAS_MAP
  it("VERCEL-V0*AI → Website & Domains", () => {
    const result = detectDeduction(tx("VERCEL-V0*AI"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Website & Domains");
  });

});

// ─── normalizeMerchant — new MERCHANT_ALIASES ────────────────────────────────
describe("normalizeMerchant — leet-speak and abbreviation aliases", () => {
  it("GOOGLE ADW0RDS-AU → Google Ads (leet-speak 0→o)", () => {
    expect(normalizeMerchant("GOOGLE ADW0RDS-AU")).toBe("Google Ads");
  });

  it("GOOGLE ADW0RDS → Google Ads", () => {
    expect(normalizeMerchant("GOOGLE ADW0RDS")).toBe("Google Ads");
  });

  it("MSFT*AZURE → Microsoft Azure", () => {
    expect(normalizeMerchant("MSFT*AZURE")).toBe("Microsoft Azure");
  });

  it("MSFT AZURE → Microsoft Azure", () => {
    expect(normalizeMerchant("MSFT AZURE")).toBe("Microsoft Azure");
  });

  it("APPLE.COM/BILL → Apple Services", () => {
    expect(normalizeMerchant("APPLE.COM/BILL")).toBe("Apple Services");
  });

  it("APPLE.COM → Apple Services", () => {
    expect(normalizeMerchant("APPLE.COM")).toBe("Apple Services");
  });

  it("APPLE.COM/ITUNES → Apple Services", () => {
    expect(normalizeMerchant("APPLE.COM/ITUNES")).toBe("Apple Services");
  });
});

// ─── Non-regression: existing exact matches must not be broken ───────────────
describe("detectDeduction — existing matches must survive fuzzy change", () => {
  it("plain Stripe charge stays Payment Processing", () => {
    const result = detectDeduction(tx("STRIPE PAYMENTS"), "sole_trader");
    expect(result?.category).toBe("Payment Processing");
  });

  it("plain Shopify charge stays Website & Domains", () => {
    const result = detectDeduction(tx("SHOPIFY MONTHLY PLAN"), "sole_trader");
    expect(result?.category).toBe("Website & Domains");
  });

  it("PayPal Fee stays Payment Processing", () => {
    const result = detectDeduction(tx("PAYPAL*FEE"), "employee");
    expect(result?.category).toBe("Payment Processing");
  });

  it("Squarespace stays Website & Domains (not reclassified as Square)", () => {
    const result = detectDeduction(tx("SQUARESPACE ANNUAL PLAN"), "contractor");
    expect(result?.category).toBe("Website & Domains");
  });

  it("Google Ads (clean) stays Marketing & Advertising", () => {
    const result = detectDeduction(tx("GOOGLE *ADS"), "contractor");
    expect(result?.category).toBe("Marketing & Advertising");
  });

  it("Vercel (clean) stays Website & Domains", () => {
    const result = detectDeduction(tx("VERCEL PRO MONTHLY"), "contractor");
    expect(result?.category).toBe("Website & Domains");
  });

  it("Klaviyo (clean) stays Marketing & Advertising", () => {
    const result = detectDeduction(tx("KLAVIYO EMAIL MARKETING"), "contractor");
    expect(result?.category).toBe("Marketing & Advertising");
  });
});
