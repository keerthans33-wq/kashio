// Part 3 — App-store mediated charges and blended merchant strings
//
// Tests three descriptor classes:
//   1. Generic app-store charges (Apple Services, Google Play) → LOW / needs_context
//   2. Blended platform + known merchant (PAYPAL * FIGMA) → merchant category
//   3. extractMerchantTokens utility

import { describe, it, expect } from "vitest";
import { detectDeduction } from "../rules";
import { normalizeMerchant } from "../normalizeMerchant";
import { extractMerchantTokens } from "../rules/merchantMatcher";

function tx(rawDescription: string, amount = -50) {
  return {
    description:        rawDescription,
    normalizedMerchant: normalizeMerchant(rawDescription),
    amount,
  };
}

// ─── extractMerchantTokens ────────────────────────────────────────────────────
describe("extractMerchantTokens", () => {
  it("returns empty for APPLE.COM/BILL (all tokens are platform/payment noise)", () => {
    expect(extractMerchantTokens("APPLE.COM/BILL")).toEqual([]);
  });

  it("returns empty for APPLE SERVICES", () => {
    expect(extractMerchantTokens("APPLE SERVICES")).toEqual([]);
  });

  it("returns empty for GOOGLE PLAY", () => {
    expect(extractMerchantTokens("GOOGLE PLAY")).toEqual([]);
  });

  it("returns empty for GOOGLE PLAY STORE", () => {
    expect(extractMerchantTokens("GOOGLE PLAY STORE")).toEqual([]);
  });

  it("returns merchant token for PAYPAL * FIGMA", () => {
    expect(extractMerchantTokens("PAYPAL * FIGMA")).toEqual(["figma"]);
  });

  it("returns merchant token for STRIPE*OPENAI", () => {
    expect(extractMerchantTokens("STRIPE*OPENAI")).toEqual(["openai"]);
  });

  it("returns merchant token for STRIPE * CHATGPT", () => {
    expect(extractMerchantTokens("STRIPE * CHATGPT")).toEqual(["chatgpt"]);
  });

  it("returns merchant token for SHOPIFY*KLAVIYO", () => {
    expect(extractMerchantTokens("SHOPIFY*KLAVIYO")).toEqual(["klaviyo"]);
  });

  it("returns merchant token for PAYPAL * ADOBE", () => {
    expect(extractMerchantTokens("PAYPAL * ADOBE")).toEqual(["adobe"]);
  });
});

// ─── Generic app-store charges — MEDIUM for employees, HIGH for contractors ───
describe("detectDeduction — generic app-store charges (needs_context)", () => {

  it("APPLE.COM/BILL → Software & Subscriptions MEDIUM for employee", () => {
    const result = detectDeduction(tx("APPLE.COM/BILL"), "employee");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("APPLE SERVICES → Software & Subscriptions MEDIUM for employee", () => {
    const result = detectDeduction(tx("APPLE SERVICES"), "employee");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("GOOGLE PLAY → Software & Subscriptions MEDIUM for employee", () => {
    const result = detectDeduction(tx("GOOGLE PLAY"), "employee");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("GOOGLE PLAY STORE → Software & Subscriptions MEDIUM for employee", () => {
    const result = detectDeduction(tx("GOOGLE PLAY STORE"), "employee");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("APPLE.COM/BILL → HIGH for contractor (app-store subscriptions are treated as work tools)", () => {
    const result = detectDeduction(tx("APPLE.COM/BILL"), "contractor");
    expect(result?.confidence).toBe("HIGH");
  });

  it("APPLE.COM/BILL reason mentions reviewing the receipt", () => {
    const result = detectDeduction(tx("APPLE.COM/BILL"), "employee");
    expect(result?.reason).toMatch(/review/i);
  });

  it("GOOGLE PLAY reason mentions reviewing the receipt", () => {
    const result = detectDeduction(tx("GOOGLE PLAY"), "sole_trader");
    expect(result?.reason).toMatch(/review/i);
  });
});

// ─── Blended descriptors — known merchant wins over platform ─────────────────
describe("detectDeduction — blended platform + merchant (merchant wins)", () => {

  it("PAYPAL * FIGMA → Software & Subscriptions (Figma over PayPal)", () => {
    const result = detectDeduction(tx("PAYPAL * FIGMA"), "employee");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("PAYPAL * CANVA → Software & Subscriptions (Canva over PayPal)", () => {
    const result = detectDeduction(tx("PAYPAL * CANVA"), "employee");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("PAYPAL * ADOBE → Software & Subscriptions (Adobe over PayPal)", () => {
    const result = detectDeduction(tx("PAYPAL * ADOBE"), "employee");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("STRIPE*OPENAI → Software & Subscriptions (OpenAI over Stripe)", () => {
    const result = detectDeduction(tx("STRIPE*OPENAI"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("STRIPE * CHATGPT → Software & Subscriptions (ChatGPT over Stripe)", () => {
    const result = detectDeduction(tx("STRIPE * CHATGPT"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("SHOPIFY*KLAVIYO → Marketing & Advertising (Klaviyo over Shopify)", () => {
    const result = detectDeduction(tx("SHOPIFY*KLAVIYO"), "sole_trader");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Marketing & Advertising");
  });

  it("SQUARE*INVOICE → Payment Processing (surfaces)", () => {
    const result = detectDeduction(tx("SQUARE*INVOICE"), "sole_trader");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Payment Processing");
  });
});

// ─── Non-regression: existing platform-only charges must not be reclassified ─
describe("detectDeduction — platform-only non-regression", () => {

  it("STRIPE PAYMENTS stays Payment Processing", () => {
    const result = detectDeduction(tx("STRIPE PAYMENTS"), "sole_trader");
    expect(result?.category).toBe("Payment Processing");
  });

  it("SHOPIFY MONTHLY PLAN stays Website & Domains", () => {
    const result = detectDeduction(tx("SHOPIFY MONTHLY PLAN"), "sole_trader");
    expect(result?.category).toBe("Website & Domains");
  });

  it("PAYPAL*FEE stays Payment Processing", () => {
    const result = detectDeduction(tx("PAYPAL*FEE"), "employee");
    expect(result?.category).toBe("Payment Processing");
  });
});
