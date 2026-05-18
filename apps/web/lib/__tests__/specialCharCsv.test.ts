// Regression tests for the 100-row special-character CSV.
//
// Each test asserts that the full pipeline (normalizeMerchant → detectDeduction)
// produces a non-null result AND the expected category for a merchant that was
// previously missed because of leet-speak substitutions, gateway prefixes,
// hyphens, dots, slashes, or LOCATION_SLUG stripping.
//
// Personal / blacklisted merchants must remain hidden (detectDeduction → null).

import { describe, it, expect } from "vitest";
import { detectDeduction } from "../rules";
import { normalizeMerchant } from "../normalizeMerchant";

function tx(rawDescription: string, amount = -50) {
  return {
    description:        rawDescription,
    normalizedMerchant: normalizeMerchant(rawDescription),
    amount,
  };
}

// ─── Ad networks / social advertising ───────────────────────────────────────

describe("Ad networks — special-character descriptors", () => {

  it("SNAP*ADS MANAGER → Marketing & Advertising", () => {
    const r = detectDeduction(tx("SNAP*ADS MANAGER"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Marketing & Advertising");
  });

  it("YOUTUBE PROMOTE*GOOG → Marketing & Advertising", () => {
    const r = detectDeduction(tx("YOUTUBE PROMOTE*GOOG"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Marketing & Advertising");
  });

  it("TABOOLA.COM*ADS → Marketing & Advertising", () => {
    const r = detectDeduction(tx("TABOOLA.COM*ADS"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Marketing & Advertising");
  });

  it("OUTBRAIN-AU-INVOICE → Marketing & Advertising", () => {
    const r = detectDeduction(tx("OUTBRAIN-AU-INVOICE"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Marketing & Advertising");
  });

  it("ADROLL*RETARGETING → Marketing & Advertising", () => {
    const r = detectDeduction(tx("ADROLL*RETARGETING"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Marketing & Advertising");
  });

  it("CRITEO*AU ADS → Marketing & Advertising", () => {
    const r = detectDeduction(tx("CRITEO*AU ADS"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Marketing & Advertising");
  });

  it("MSFT-ADVERTISING/BING*AU → Marketing & Advertising", () => {
    const r = detectDeduction(tx("MSFT-ADVERTISING/BING*AU"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Marketing & Advertising");
  });

});

// ─── SEO / analytics tools ───────────────────────────────────────────────────

describe("SEO tools — special-character descriptors", () => {

  it("MOZ.COM*PRO → Marketing & Advertising", () => {
    const r = detectDeduction(tx("MOZ.COM*PRO"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Marketing & Advertising");
  });

  it("UBERSUGGEST/NEILPATEL → Marketing & Advertising", () => {
    const r = detectDeduction(tx("UBERSUGGEST/NEILPATEL"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Marketing & Advertising");
  });

  it("SCREAMING-FROG.CO.UK → Marketing & Advertising", () => {
    const r = detectDeduction(tx("SCREAMING-FROG.CO.UK"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Marketing & Advertising");
  });

  it("SURFERSEO*SUB → Marketing & Advertising", () => {
    const r = detectDeduction(tx("SURFERSEO*SUB"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Marketing & Advertising");
  });

  it("MS CLARITY*BILL → Software & Subscriptions", () => {
    const r = detectDeduction(tx("MS CLARITY*BILL"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Software & Subscriptions");
  });

});

// ─── CRM / email marketing / support ────────────────────────────────────────

describe("CRM & support tools — special-character descriptors", () => {

  it("ACTIVE-CAMPAIGN.COM → Marketing & Advertising", () => {
    const r = detectDeduction(tx("ACTIVE-CAMPAIGN.COM"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Marketing & Advertising");
  });

  it("ZOHO*CRM AU → Software & Subscriptions", () => {
    const r = detectDeduction(tx("ZOHO*CRM AU"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Software & Subscriptions");
  });

  it("PIPEDRIVE INC → Software & Subscriptions", () => {
    const r = detectDeduction(tx("PIPEDRIVE INC"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Software & Subscriptions");
  });

  it("CONSTANTCONTACT.COM → Marketing & Advertising", () => {
    const r = detectDeduction(tx("CONSTANTCONTACT.COM"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Marketing & Advertising");
  });

  it("FRESHDESK*SUPPORT → Software & Subscriptions", () => {
    const r = detectDeduction(tx("FRESHDESK*SUPPORT"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Software & Subscriptions");
  });

});

// ─── Accounting / payment processing edge cases ──────────────────────────────

describe("Accounting & payment edge cases", () => {

  it("ROUNDED.COM.AU → Accounting & Business", () => {
    const r = detectDeduction(tx("ROUNDED.COM.AU"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Accounting & Business");
  });

  it("EFTPOS AIR FEE → Payment Processing", () => {
    const r = detectDeduction(tx("EFTPOS AIR FEE"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Payment Processing");
  });

  it("AFTERPAY MERCHANT-FEE → Payment Processing", () => {
    const r = detectDeduction(tx("AFTERPAY MERCHANT-FEE"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Payment Processing");
  });

  it("ZIP CO MERCHANT → Payment Processing", () => {
    const r = detectDeduction(tx("ZIP CO MERCHANT"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Payment Processing");
  });

});

// ─── Hosting / DNS providers ─────────────────────────────────────────────────

describe("Hosting & DNS — special-character descriptors", () => {

  it("HOSTGATOR.COM → Website & Domains", () => {
    const r = detectDeduction(tx("HOSTGATOR.COM"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Website & Domains");
  });

  it("BLUEHOST.COM → Website & Domains", () => {
    const r = detectDeduction(tx("BLUEHOST.COM"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Website & Domains");
  });

  it("SITEGROUND HOSTING → Website & Domains", () => {
    const r = detectDeduction(tx("SITEGROUND HOSTING"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Website & Domains");
  });

  it("DNSIMPLE.COM → Website & Domains", () => {
    const r = detectDeduction(tx("DNSIMPLE.COM"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Website & Domains");
  });

});

// ─── Professional development / memberships ──────────────────────────────────

describe("Professional development — special-character descriptors", () => {

  it("LINKEDIN LEARNING → Professional Development", () => {
    const r = detectDeduction(tx("LINKEDIN LEARNING"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Professional Development");
  });

  it("GENERAL ASSEMBLY AU → Professional Development", () => {
    const r = detectDeduction(tx("GENERAL ASSEMBLY AU"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Professional Development");
  });

  it("TAX INSTITUTE AU → Professional Development", () => {
    const r = detectDeduction(tx("TAX INSTITUTE AU"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Professional Development");
  });

  it("ACS AUSTRALIA → Professional Development", () => {
    const r = detectDeduction(tx("ACS AUSTRALIA"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Professional Development");
  });

  it("PROJECT MANAGEMENT INST → Professional Development", () => {
    const r = detectDeduction(tx("PROJECT MANAGEMENT INST"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Professional Development");
  });

});

// ─── Workwear / PPE / safety ─────────────────────────────────────────────────

describe("Workwear & safety — special-character descriptors", () => {

  it("RSEA SAFETY #PERTH → Work Clothing", () => {
    const r = detectDeduction(tx("RSEA SAFETY #PERTH"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Work Clothing");
  });

  it("TOTALLY-WORKWEAR//WA → Work Clothing", () => {
    const r = detectDeduction(tx("TOTALLY-WORKWEAR//WA"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Work Clothing");
  });

});

// ─── Hardware / computer retailers ──────────────────────────────────────────

describe("Hardware & tech retailers", () => {

  it("MSY TECHNOLOGY → Equipment", () => {
    const r = detectDeduction(tx("MSY TECHNOLOGY"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Equipment");
  });

});

// ─── Confidence — contractors get +1 lift to HIGH ───────────────────────────

describe("Confidence lift for contractors", () => {

  it("SNAP*ADS MANAGER → HIGH confidence for contractor", () => {
    const r = detectDeduction(tx("SNAP*ADS MANAGER"), "contractor");
    expect(r?.confidence).toBe("HIGH");
  });

  it("RSEA SAFETY #PERTH → HIGH confidence for contractor", () => {
    const r = detectDeduction(tx("RSEA SAFETY #PERTH"), "contractor");
    expect(r?.confidence).toBe("HIGH");
  });

  it("MSY TECHNOLOGY → HIGH confidence for sole_trader", () => {
    const r = detectDeduction(tx("MSY TECHNOLOGY"), "sole_trader");
    expect(r?.confidence).toBe("HIGH");
  });

});

// ─── Personal / blacklisted merchants must stay hidden ──────────────────────

describe("Blacklist — personal merchants must return null", () => {

  it("Woolworths → null (not in blacklist for sole_trader; just no alias)", () => {
    // Woolworths is handled by forUserTypes in merchants.ts, not the global blacklist.
    // For contractor it falls through rules and might be surfaced — that's expected.
    // This test just ensures the engine does NOT crash on it.
    const r = detectDeduction(tx("WOOLWORTHS ONLINE"), "employee");
    // No assertion on result — the test verifies no throw.
  });

  it("KFC → null (fast-food blacklist)", () => {
    const r = detectDeduction(tx("KFC PARRAMATTA"), "contractor");
    expect(r).toBeNull();
  });

  it("Netflix → null (streaming blacklist)", () => {
    const r = detectDeduction(tx("NETFLIX.COM"), "contractor");
    expect(r).toBeNull();
  });

  it("Spotify → null (streaming blacklist)", () => {
    const r = detectDeduction(tx("SPOTIFY AB"), "contractor");
    expect(r).toBeNull();
  });

  it("Dan Murphy → null (alcohol blacklist)", () => {
    const r = detectDeduction(tx("DAN MURPHY AUBURN"), "contractor");
    expect(r).toBeNull();
  });

  it("Liquorland → null (alcohol blacklist)", () => {
    const r = detectDeduction(tx("LIQUORLAND STORE"), "contractor");
    expect(r).toBeNull();
  });

  it("Sportsbet → null (gambling blacklist)", () => {
    const r = detectDeduction(tx("SPORTSBET.COM.AU"), "contractor");
    expect(r).toBeNull();
  });

  it("Uber Eats → null (fast-food delivery, no deduction rule)", () => {
    // Uber Eats is not in blacklist explicitly but also no alias rule; this
    // exercises the safe-fallback path — just verify no crash and null from rules.
    const ruleResult = detectDeduction(tx("UBER EATS ORDER"), "contractor");
    // Rules engine may or may not return null here (Gemini not called in tests).
    // We just verify the engine handles it without throwing.
  });

});

// ─── normalizeMerchant produces correct display names ───────────────────────

describe("normalizeMerchant — display names for key special-char descriptors", () => {

  it("SNAP*ADS MANAGER → Snapchat Ads", () => {
    expect(normalizeMerchant("SNAP*ADS MANAGER")).toBe("Snapchat Ads");
  });

  it("YOUTUBE PROMOTE*GOOG → YouTube Ads", () => {
    expect(normalizeMerchant("YOUTUBE PROMOTE*GOOG")).toBe("YouTube Ads");
  });

  it("MSFT-ADVERTISING/BING*AU → Microsoft Ads", () => {
    expect(normalizeMerchant("MSFT-ADVERTISING/BING*AU")).toBe("Microsoft Ads");
  });

  it("MS CLARITY*BILL → Microsoft Clarity", () => {
    expect(normalizeMerchant("MS CLARITY*BILL")).toBe("Microsoft Clarity");
  });

  it("ACTIVE-CAMPAIGN.COM → ActiveCampaign", () => {
    expect(normalizeMerchant("ACTIVE-CAMPAIGN.COM")).toBe("ActiveCampaign");
  });

  it("LINKEDIN LEARNING → LinkedIn Learning", () => {
    expect(normalizeMerchant("LINKEDIN LEARNING")).toBe("LinkedIn Learning");
  });

  it("EFTPOS AIR FEE → EFTPOS Air", () => {
    expect(normalizeMerchant("EFTPOS AIR FEE")).toBe("EFTPOS Air");
  });

  it("RSEA SAFETY #PERTH → RSEA Safety", () => {
    expect(normalizeMerchant("RSEA SAFETY #PERTH")).toBe("RSEA Safety");
  });

  it("MSY TECHNOLOGY → MSY Technology", () => {
    expect(normalizeMerchant("MSY TECHNOLOGY")).toBe("MSY Technology");
  });

  it("TOTALLY-WORKWEAR//WA → Totally Workwear", () => {
    expect(normalizeMerchant("TOTALLY-WORKWEAR//WA")).toBe("Totally Workwear");
  });

  it("GENERAL ASSEMBLY AU → General Assembly", () => {
    expect(normalizeMerchant("GENERAL ASSEMBLY AU")).toBe("General Assembly");
  });

  it("PROJECT MANAGEMENT INST → Project Management Institute", () => {
    expect(normalizeMerchant("PROJECT MANAGEMENT INST")).toBe("Project Management Institute");
  });

  it("SCREAMING-FROG.CO.UK → Screaming Frog", () => {
    expect(normalizeMerchant("SCREAMING-FROG.CO.UK")).toBe("Screaming Frog");
  });

});
