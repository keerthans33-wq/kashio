// Regression tests for leet-speak and corrupted-character bank descriptors.
//
// Each test asserts that the full pipeline (normalizeMerchant → detectDeduction)
// correctly classifies merchants whose bank descriptors contain substitutions
// like 0→o, @→a, 3→e, 1→i, 5→s, 8→b.
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

// ─── Marketing & Advertising — corrupted descriptors ────────────────────────

describe("Marketing — leet-speak corrupted descriptors", () => {

  it("G0OGLE ADS → Marketing & Advertising", () => {
    const r = detectDeduction(tx("G0OGLE ADS"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Marketing & Advertising");
  });

  it("G00GLE ADS (double zero) → Marketing & Advertising", () => {
    const r = detectDeduction(tx("G00GLE ADS"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Marketing & Advertising");
  });

  it("INST@GRAM ADS → Marketing & Advertising", () => {
    const r = detectDeduction(tx("INST@GRAM ADS"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Marketing & Advertising");
  });

  it("INST@GRAM PROMOTE → Marketing & Advertising", () => {
    const r = detectDeduction(tx("INST@GRAM PROMOTE"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Marketing & Advertising");
  });

  it("MICR0SOFT @DS → Marketing & Advertising", () => {
    const r = detectDeduction(tx("MICR0SOFT @DS"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Marketing & Advertising");
  });

  it("Y0UTUBE ADS → Marketing & Advertising", () => {
    const r = detectDeduction(tx("Y0UTUBE ADS"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Marketing & Advertising");
  });

  it("CRITE0 → Marketing & Advertising", () => {
    const r = detectDeduction(tx("CRITE0"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Marketing & Advertising");
  });

});

// ─── Software & Subscriptions — corrupted descriptors ───────────────────────

describe("Software — leet-speak corrupted descriptors", () => {

  it("@DOBE CREATIVE CLOUD → Software & Subscriptions", () => {
    const r = detectDeduction(tx("@DOBE CREATIVE CLOUD"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Software & Subscriptions");
  });

  it("MICR0S0FT @ZURE → Software & Subscriptions", () => {
    const r = detectDeduction(tx("MICR0S0FT @ZURE"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Software & Subscriptions");
  });

  it("B0LT.NEW → Software & Subscriptions", () => {
    const r = detectDeduction(tx("B0LT.NEW"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Software & Subscriptions");
  });

  it("CL0UDFLARE → Software & Subscriptions", () => {
    const r = detectDeduction(tx("CL0UDFLARE"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Software & Subscriptions");
  });

});

// ─── Website & Domains — corrupted descriptors ──────────────────────────────

describe("Website & Domains — leet-speak corrupted descriptors", () => {

  it("H0STINGER → Website & Domains", () => {
    const r = detectDeduction(tx("H0STINGER"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Website & Domains");
  });

  it("CRAZY DOMAINS SYDNEY → Website & Domains", () => {
    const r = detectDeduction(tx("CRAZY DOMAINS SYDNEY"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Website & Domains");
  });

  it("CRAZ Y D0MAINS → Website & Domains", () => {
    const r = detectDeduction(tx("CRAZY D0MAINS"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Website & Domains");
  });

});

// ─── Professional Development — corrupted descriptors ───────────────────────

describe("Professional Development — leet-speak corrupted descriptors", () => {

  it("COURS3RA → Professional Development", () => {
    const r = detectDeduction(tx("COURS3RA"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Professional Development");
  });

  it("COURSERA → Professional Development", () => {
    const r = detectDeduction(tx("COURSERA"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Professional Development");
  });

  it("UD3MY → Professional Development", () => {
    const r = detectDeduction(tx("UD3MY"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Professional Development");
  });

  it("UDEMY → Professional Development", () => {
    const r = detectDeduction(tx("UDEMY"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Professional Development");
  });

});

// ─── Work Clothing / PPE — corrupted descriptors ────────────────────────────

describe("Work Clothing — leet-speak corrupted descriptors", () => {

  it("RS3A SAFETY PERTH → Work Clothing", () => {
    const r = detectDeduction(tx("RS3A SAFETY PERTH"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Work Clothing");
  });

  it("PUM@ SAFETY → Work Clothing", () => {
    const r = detectDeduction(tx("PUM@ SAFETY"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Work Clothing");
  });

  it("T0TALLY WORKWEAR → Work Clothing", () => {
    const r = detectDeduction(tx("T0TALLY WORKWEAR"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Work Clothing");
  });

  it("M0NGREL BOOTS PERTH → Work Clothing", () => {
    const r = detectDeduction(tx("M0NGREL BOOTS PERTH"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Work Clothing");
  });

  it("SCRUBS AUSTRALIA SYDNEY → Work Clothing", () => {
    const r = detectDeduction(tx("SCRUBS AUSTRALIA SYDNEY"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Work Clothing");
  });

});

// ─── Equipment — corrupted descriptors ──────────────────────────────────────

describe("Equipment — leet-speak corrupted descriptors", () => {

  it("SC0RPTEC → Equipment", () => {
    const r = detectDeduction(tx("SC0RPTEC"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Equipment");
  });

  it("TOTAL TOOLS MOOROOKA → Equipment", () => {
    const r = detectDeduction(tx("TOTAL TOOLS MOOROOKA"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Equipment");
  });

});

// ─── LOCATION_SLUG stripping — second-word loss ─────────────────────────────

describe("LOCATION_SLUG — second word preserved by MERCHANT_ALIASES", () => {

  it("MONGREL BOOTS PERTH → Work Clothing (BOOTS not stripped)", () => {
    const normalised = normalizeMerchant("MONGREL BOOTS PERTH");
    expect(normalised).toBe("Mongrel Boots");
  });

  it("MOTION ARRAY SYDNEY → Software (ARRAY not stripped)", () => {
    const normalised = normalizeMerchant("MOTION ARRAY SYDNEY");
    expect(normalised).toBe("Motion Array");
    const r = detectDeduction(tx("MOTION ARRAY SYDNEY"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Software & Subscriptions");
  });

  it("PUMA SAFETY PERTH → Work Clothing (SAFETY not stripped)", () => {
    const normalised = normalizeMerchant("PUMA SAFETY PERTH");
    expect(normalised).toBe("Puma Safety");
  });

  it("BIG W OFFICE BUNBURY → Office Supplies (OFFICE not stripped)", () => {
    const normalised = normalizeMerchant("BIG W OFFICE BUNBURY");
    expect(normalised).toBe("Big W Office");
    const r = detectDeduction(tx("BIG W OFFICE BUNBURY"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Office Supplies");
  });

  it("OFFICE CHOICE PERTH → Office Supplies (CHOICE not stripped)", () => {
    const normalised = normalizeMerchant("OFFICE CHOICE PERTH");
    expect(normalised).toBe("Office Choice");
    const r = detectDeduction(tx("OFFICE CHOICE PERTH"), "contractor");
    expect(r).not.toBeNull();
    expect(r?.category).toBe("Office Supplies");
  });

  it("TOTALLY WORKWEAR WA → Work Clothing (WORKWEAR not stripped)", () => {
    const normalised = normalizeMerchant("TOTALLY WORKWEAR WA");
    expect(normalised).toBe("Totally Workwear");
  });

  it("TOTAL TOOLS MOOROOKA → Equipment (TOOLS not stripped)", () => {
    const normalised = normalizeMerchant("TOTAL TOOLS MOOROOKA");
    expect(normalised).toBe("Total Tools");
  });

  it("CRAZY DOMAINS SYDNEY → Website & Domains (DOMAINS not stripped)", () => {
    const normalised = normalizeMerchant("CRAZY DOMAINS SYDNEY");
    expect(normalised).toBe("Crazy Domains");
  });

});

// ─── Personal expenses — must remain hidden ──────────────────────────────────

describe("Personal expenses — must not be detected as deductions", () => {

  it("LOTTERYWEST → null", () => {
    expect(detectDeduction(tx("LOTTERYWEST"), "contractor")).toBeNull();
  });

  it("SPORTSBET → null", () => {
    expect(detectDeduction(tx("SPORTSBET"), "contractor")).toBeNull();
  });

  it("KFC → null", () => {
    expect(detectDeduction(tx("KFC"), "employee")).toBeNull();
  });

  it("UBER EATS → null", () => {
    expect(detectDeduction(tx("UBER EATS"), "employee")).toBeNull();
  });

  it("NETFLIX → null", () => {
    expect(detectDeduction(tx("NETFLIX"), "employee")).toBeNull();
  });

  it("CHEMIST WAREHOUSE → null", () => {
    expect(detectDeduction(tx("CHEMIST WAREHOUSE"), "employee")).toBeNull();
  });

  it("ATM WITHDRAWAL → null", () => {
    expect(detectDeduction(tx("ATM WITHDRAWAL"), "contractor")).toBeNull();
  });

  it("PATONG HEIGHTS PHUKET → null", () => {
    expect(detectDeduction(tx("PATONG HEIGHTS PHUKET"), "employee")).toBeNull();
  });

  it("ALDI STORES → null", () => {
    expect(detectDeduction(tx("ALDI STORES"), "contractor")).toBeNull();
  });

});
