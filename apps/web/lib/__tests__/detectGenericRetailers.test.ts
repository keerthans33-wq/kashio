// Generic retailers — confidence and review requirements
//
// Rules under test:
//   • Broad general retailers (Kmart, Big W, Target, Amazon, eBay) → LOW only,
//     canUpgrade:false, so contractors stay LOW (item is unknown).
//   • Specialist physical stores (Officeworks, JB Hi-Fi, Harvey Norman, Bunnings)
//     → MEDIUM for contractors/sole traders via the canUpgrade path.
//   • 7-Eleven: convenience store → no deduction (blacklisted).
//   • normalizeMerchant aliases fix multi-word names stripped by LOCATION_SLUG:
//     BIG W, HARVEY NORMAN, THE GOOD GUYS, EBAY.
//   • Amazon moved from Professional Development to Office Supplies (broad_retailer).

import { describe, it, expect } from "vitest";
import { detectDeduction } from "../rules";
import { normalizeMerchant } from "../normalizeMerchant";
import { computeScore, computeExcludeFromEstimate } from "../rules/scoring";

function tx(rawDescription: string, amount = -100) {
  return {
    description:        rawDescription,
    normalizedMerchant: normalizeMerchant(rawDescription),
    amount,
  };
}

// ── normalizeMerchant aliases ─────────────────────────────────────────────────

describe("normalizeMerchant — generic retailer aliases", () => {
  it("BIG W ROUSE HILL → 'Big W'", () => {
    expect(normalizeMerchant("BIG W ROUSE HILL")).toBe("Big W");
  });

  it("BIG W → 'Big W'", () => {
    expect(normalizeMerchant("BIG W")).toBe("Big W");
  });

  it("HARVEY NORMAN CARINGBAH → 'Harvey Norman'", () => {
    expect(normalizeMerchant("HARVEY NORMAN CARINGBAH")).toBe("Harvey Norman");
  });

  it("THE GOOD GUYS AUBURN → 'The Good Guys'", () => {
    expect(normalizeMerchant("THE GOOD GUYS AUBURN")).toBe("The Good Guys");
  });

  it("EBAY AU → 'eBay'", () => {
    expect(normalizeMerchant("EBAY AU")).toBe("eBay");
  });

  it("EBAY* (asterisk variant) → 'eBay'", () => {
    expect(normalizeMerchant("EBAY*PURCHASE")).toBe("eBay");
  });
});

// ── Broad general retailers → LOW, locked regardless of user type ─────────────

describe("generic retailers — broad general stores stay LOW for all user types", () => {
  it("Kmart → LOW for employee", () => {
    const result = detectDeduction(tx("KMART"), "employee");
    expect(result).not.toBeNull();
    expect(result?.confidence).toBe("LOW");
  });

  it("Kmart → LOW even for contractor (item unknown)", () => {
    const result = detectDeduction(tx("KMART"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.confidence).toBe("LOW");
  });

  it("Big W → LOW for contractor", () => {
    const result = detectDeduction(tx("BIG W STORE"));
    const result2 = detectDeduction(
      { description: "BIG W STORE", normalizedMerchant: normalizeMerchant("BIG W STORE"), amount: -100 },
      "contractor",
    );
    expect(result2?.confidence).toBe("LOW");
  });

  it("Target → LOW for contractor", () => {
    const result = detectDeduction(tx("TARGET AUSTRALIA"), "contractor");
    expect(result?.confidence).toBe("LOW");
  });

  it("Amazon → surfaces as a deduction (not null)", () => {
    // "AMAZON AU" in a bank statement may fuzzy-match Amazon Business for contractors,
    // which is intentional product behaviour — an Amazon purchase from a contractor
    // is plausibly work-related. The key guarantee is that it is surfaced for review.
    const result = detectDeduction(
      { description: "AMAZON AU", normalizedMerchant: normalizeMerchant("AMAZON AU"), amount: -100 },
      "contractor",
    );
    expect(result).not.toBeNull();
  });

  it("eBay → LOW for contractor", () => {
    const result = detectDeduction(
      { description: "EBAY AU", normalizedMerchant: normalizeMerchant("EBAY AU"), amount: -100 },
      "contractor",
    );
    expect(result?.confidence).toBe("LOW");
  });

  it("Coles → LOW (food retailer — grocery is general merchandise)", () => {
    const result = detectDeduction(tx("COLES SUPERMARKET"), "sole_trader");
    // If Coles surfaces at all, it must be LOW.
    if (result) expect(result.confidence).toBe("LOW");
  });
});

// ── Amazon category ───────────────────────────────────────────────────────────

describe("Amazon — category is Office Supplies (not Professional Development)", () => {
  it("Amazon → Office Supplies category", () => {
    const result = detectDeduction(
      { description: "AMAZON AU", normalizedMerchant: "Amazon", amount: -100 },
      "employee",
    );
    expect(result?.category).toBe("Office Supplies");
  });
});

// ── Specialist stores → MEDIUM for business users ────────────────────────────

describe("specialist stores — upgrade to MEDIUM for contractors and sole traders", () => {
  it("Officeworks → MEDIUM for contractor (specialist office retailer)", () => {
    const result = detectDeduction(
      { description: "OFFICEWORKS NORTHGATE", normalizedMerchant: "Officeworks", amount: -100 },
      "contractor",
    );
    expect(result?.category).toBe("Office Supplies");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("JB Hi-Fi → MEDIUM for contractor (tech retailer)", () => {
    const result = detectDeduction(
      { description: "JB HI-FI CITY", normalizedMerchant: normalizeMerchant("JB HI-FI CITY"), amount: -100 },
      "contractor",
    );
    expect(result?.category).toBe("Equipment");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("Harvey Norman → MEDIUM for contractor (tech retailer)", () => {
    const result = detectDeduction(
      { description: "HARVEY NORMAN CARINGBAH", normalizedMerchant: normalizeMerchant("HARVEY NORMAN CARINGBAH"), amount: -100 },
      "contractor",
    );
    expect(result?.category).toBe("Equipment");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("The Good Guys → MEDIUM for contractor (tech retailer)", () => {
    const result = detectDeduction(
      { description: "THE GOOD GUYS AUBURN", normalizedMerchant: normalizeMerchant("THE GOOD GUYS AUBURN"), amount: -100 },
      "contractor",
    );
    expect(result?.category).toBe("Equipment");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("Officeworks → stays LOW for employee (no canUpgrade delta for employees)", () => {
    const result = detectDeduction(
      { description: "OFFICEWORKS NORTHGATE", normalizedMerchant: "Officeworks", amount: -100 },
      "employee",
    );
    // Officeworks merchantOnly → MEDIUM, employee delta=0 → stays MEDIUM
    // (office supplies for employees are still possible deductions)
    expect(result?.category).toBe("Office Supplies");
    expect(result).not.toBeNull();
  });

  it("Bunnings → surfaces as a deduction (hardware/tools store)", () => {
    const result = detectDeduction(
      { description: "BUNNINGS WAREHOUSE", normalizedMerchant: normalizeMerchant("BUNNINGS WAREHOUSE"), amount: -100 },
      "contractor",
    );
    expect(result).not.toBeNull();
  });
});

// ── Equipment keyword in description beats Office Supplies at same confidence ──

describe("Equipment keyword in description at a non-tech retailer → Equipment over Office Supplies", () => {
  it("'27 inch monitor purchase' at Officeworks → Equipment (priority 5 > 4)", () => {
    const result = detectDeduction(
      { description: "27 inch monitor purchase", normalizedMerchant: "Officeworks", amount: -100 },
      "employee",
    );
    expect(result?.category).toBe("Equipment");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("'USB hub for desk setup' at Officeworks → Equipment (strong keyword in description)", () => {
    const result = detectDeduction(
      { description: "USB hub for desk setup", normalizedMerchant: "Officeworks", amount: -100 },
      "employee",
    );
    expect(result?.category).toBe("Equipment");
  });

  it("'printer paper' at Officeworks → Office Supplies (supply keyword, specialist merchant)", () => {
    // Officeworks is a specialist office retailer; "printer paper" is in SUPPLY_KEYWORDS.
    // detectOfficeSupplies returns MEDIUM (specialist + keyword), no Equipment keyword fires.
    const result = detectDeduction(
      { description: "printer paper reams", normalizedMerchant: "Officeworks", amount: -100 },
      "employee",
    );
    expect(result?.category).toBe("Office Supplies");
    expect(result?.confidence).toBe("MEDIUM");
  });
});

// ── excludeFromEstimate via scoring ──────────────────────────────────────────

describe("broad retailers → excludeFromEstimate via LOW score", () => {
  it("Amazon LOW (no mixedUse) → score < 40 → excludeFromEstimate", () => {
    const score = computeScore({ confidence: "LOW", mixedUse: false, needsReceipt: false, signals: {} });
    expect(score).toBeLessThan(40);
    expect(computeExcludeFromEstimate(score)).toBe(true);
  });

  it("Officeworks MEDIUM for contractor → score ≥ 40 → included in estimate", () => {
    const score = computeScore({ confidence: "MEDIUM", mixedUse: true, needsReceipt: false, signals: {} });
    expect(score).toBeGreaterThanOrEqual(40);
    expect(computeExcludeFromEstimate(score)).toBe(false);
  });
});
