import { describe, it, expect } from "vitest";
import { detectDeduction } from "../rules";
import { normalizeMerchant } from "../normalizeMerchant";

function tx(description: string, amount = -100) {
  return { description, normalizedMerchant: normalizeMerchant(description), amount };
}

// ── Positive cases — recognised telco merchants ────────────────────────────

describe("detectPhoneInternet — recognised telcos", () => {
  it("Telstra → Phone & Internet", () => {
    const result = detectDeduction(tx("TELSTRA"), "employee");
    expect(result?.category).toBe("Phone & Internet");
  });

  it("Telstra with billing keyword → MEDIUM", () => {
    const result = detectDeduction(tx("TELSTRA MOBILE PLAN"), "employee");
    expect(result?.category).toBe("Phone & Internet");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("Telstra Prepaid → Phone & Internet", () => {
    // normalizeMerchant strips PREPAID (LOCATION_SLUG) → "Telstra"; still matches
    const result = detectDeduction(tx("TELSTRA PREPAID"), "employee");
    expect(result?.category).toBe("Phone & Internet");
  });

  it("Dodo → Phone & Internet", () => {
    const result = detectDeduction(tx("DODO"), "employee");
    expect(result?.category).toBe("Phone & Internet");
  });

  it("Dodo internet plan → MEDIUM", () => {
    const result = detectDeduction(tx("DODO INTERNET PLAN"), "employee");
    expect(result?.category).toBe("Phone & Internet");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("Optus mobile plan → Phone & Internet", () => {
    const result = detectDeduction(tx("OPTUS MOBILE PLAN"), "employee");
    expect(result?.category).toBe("Phone & Internet");
  });

  it("Vodafone NBN → Phone & Internet", () => {
    const result = detectDeduction(tx("VODAFONE NBN BROADBAND"), "employee");
    expect(result?.category).toBe("Phone & Internet");
  });

  it("Superloop → Phone & Internet", () => {
    const result = detectDeduction(tx("SUPERLOOP"), "employee");
    expect(result?.category).toBe("Phone & Internet");
  });

  it("iiNet → Phone & Internet", () => {
    const result = detectDeduction(tx("IINET"), "employee");
    expect(result?.category).toBe("Phone & Internet");
  });

  it("Aussie Broadband → Phone & Internet", () => {
    const result = detectDeduction(tx("AUSSIE BROADBAND NBN"), "employee");
    expect(result?.category).toBe("Phone & Internet");
  });

  it("Belong → Phone & Internet", () => {
    const result = detectDeduction(tx("BELONG"), "employee");
    expect(result?.category).toBe("Phone & Internet");
  });
});

// ── Negative cases — venue names with telco sponsorship ───────────────────

describe("detectPhoneInternet — branded venues must NOT match", () => {
  it("Optus Stadium → not Phone & Internet", () => {
    const result = detectDeduction(tx("OPTUS STADIUM"), "employee");
    expect(result?.category).not.toBe("Phone & Internet");
  });

  it("Optus Stadium Perth → not Phone & Internet (realistic bank description)", () => {
    const result = detectDeduction(tx("OPTUS STADIUM PERTH"), "employee");
    expect(result?.category).not.toBe("Phone & Internet");
  });

  it("Optus Stadium Perth WA → not Phone & Internet (with state suffix)", () => {
    const result = detectDeduction(tx("OPTUS STADIUM PERTH WA"), "employee");
    expect(result?.category).not.toBe("Phone & Internet");
  });

  it("Telstra Dome → not Phone & Internet (historic Melbourne venue)", () => {
    const result = detectDeduction(tx("TELSTRA DOME"), "employee");
    expect(result?.category).not.toBe("Phone & Internet");
  });

  it("Telstra Stadium → not Phone & Internet (historic Sydney venue)", () => {
    const result = detectDeduction(tx("TELSTRA STADIUM"), "employee");
    expect(result?.category).not.toBe("Phone & Internet");
  });
});

// ── normalizeMerchant — branded venue display names ────────────────────────

describe("normalizeMerchant — branded venues get correct display name", () => {
  it("OPTUS STADIUM → 'Optus Stadium' (not 'Optus')", () => {
    expect(normalizeMerchant("OPTUS STADIUM")).toBe("Optus Stadium");
  });

  it("OPTUS STADIUM PERTH WA → 'Optus Stadium'", () => {
    expect(normalizeMerchant("OPTUS STADIUM PERTH WA")).toBe("Optus Stadium");
  });

  it("TELSTRA DOME → 'Telstra Dome'", () => {
    expect(normalizeMerchant("TELSTRA DOME")).toBe("Telstra Dome");
  });

  it("TELSTRA STADIUM → 'Telstra Stadium'", () => {
    expect(normalizeMerchant("TELSTRA STADIUM")).toBe("Telstra Stadium");
  });

  it("TELSTRA → 'Telstra' (plain telco description unchanged)", () => {
    expect(normalizeMerchant("TELSTRA")).toBe("Telstra");
  });
});
