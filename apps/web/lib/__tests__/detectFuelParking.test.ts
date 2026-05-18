import { describe, it, expect } from "vitest";
import { detectDeduction } from "../rules";
import { normalizeMerchant } from "../normalizeMerchant";
import { computeScore, computeExcludeFromEstimate } from "../rules/scoring";

function tx(description: string, amount = -80) {
  return { description, normalizedMerchant: normalizeMerchant(description), amount };
}

// ── Fuel merchants → Work Travel, MEDIUM for contractors ─────────────────
// adjustConfidence caps all WORK_TRAVEL at LOW for employees (by design —
// commutes and genuine work trips are indistinguishable). Use contractor to
// verify the MEDIUM base confidence from detectTravel.

describe("Fuel merchants → Work Travel MEDIUM (contractor)", () => {
  it("Ampol → Work Travel MEDIUM", () => {
    const result = detectDeduction(tx("AMPOL FUEL"), "contractor");
    expect(result?.category).toBe("Work Travel");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("Caltex → Work Travel MEDIUM", () => {
    const result = detectDeduction(tx("CALTEX WOOLWORTHS"), "contractor");
    expect(result?.category).toBe("Work Travel");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("BP → Work Travel MEDIUM", () => {
    const result = detectDeduction(tx("BP SERVICE STATION"), "contractor");
    expect(result?.category).toBe("Work Travel");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("Shell → Work Travel MEDIUM", () => {
    const result = detectDeduction(tx("SHELL COLES EXPRESS"), "contractor");
    expect(result?.category).toBe("Work Travel");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("7-Eleven with fuel keyword → Work Travel MEDIUM", () => {
    const result = detectDeduction(tx("7-ELEVEN FUEL PURCHASE"), "contractor");
    expect(result?.category).toBe("Work Travel");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("United Petroleum → Work Travel MEDIUM", () => {
    const result = detectDeduction(tx("UNITED PETROLEUM"), "contractor");
    expect(result?.category).toBe("Work Travel");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("EG Ampol → normalizes to Ampol → Work Travel MEDIUM", () => {
    expect(normalizeMerchant("EG AMPOL FUEL")).toBe("Ampol");
    const result = detectDeduction(tx("EG AMPOL FUEL"), "contractor");
    expect(result?.category).toBe("Work Travel");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("Mobil → Work Travel MEDIUM", () => {
    const result = detectDeduction(tx("MOBIL SERVICE STATION"), "contractor");
    expect(result?.category).toBe("Work Travel");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("Liberty fuel → Work Travel MEDIUM", () => {
    const result = detectDeduction(tx("LIBERTY OIL"), "contractor");
    expect(result?.category).toBe("Work Travel");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("Puma Energy → Work Travel MEDIUM", () => {
    expect(normalizeMerchant("PUMA ENERGY FUEL")).toBe("Puma Energy");
    const result = detectDeduction(tx("PUMA ENERGY FUEL"), "contractor");
    expect(result?.category).toBe("Work Travel");
    expect(result?.confidence).toBe("MEDIUM");
  });
});

// ── Fuel merchants → LOW for employees (commuting risk) ──────────────────

describe("Fuel merchants → Work Travel LOW (employee)", () => {
  it("Ampol → Work Travel LOW for employee", () => {
    const result = detectDeduction(tx("AMPOL FUEL"), "employee");
    expect(result?.category).toBe("Work Travel");
    expect(result?.confidence).toBe("LOW");
  });

  it("Caltex → Work Travel LOW for employee", () => {
    const result = detectDeduction(tx("CALTEX WOOLWORTHS"), "employee");
    expect(result?.category).toBe("Work Travel");
    expect(result?.confidence).toBe("LOW");
  });
});

// ── commutingRisk signal → excludeFromEstimate via scoring ───────────────
// excludeFromEstimate is computed downstream (importPipeline), not on the
// detectDeduction result. Test the math directly via computeScore.

describe("commutingRisk scoring → excludeFromEstimate", () => {
  it("MEDIUM + commutingRisk + mixedUse → score 35 → excludeFromEstimate", () => {
    const score = computeScore({
      confidence:   "MEDIUM",
      signals:      { commutingRisk: true },
      mixedUse:     true,
      needsReceipt: false,
      source:       "engine",
    });
    expect(score).toBe(35);
    expect(computeExcludeFromEstimate(score)).toBe(true);
  });

  it("LOW + commutingRisk + mixedUse → excludeFromEstimate (floors at 10)", () => {
    const score = computeScore({
      confidence:   "LOW",
      signals:      { commutingRisk: true },
      mixedUse:     true,
      needsReceipt: false,
      source:       "engine",
    });
    // 28 - 20 - 5 = 3 → clamped to 10
    expect(score).toBe(10);
    expect(computeExcludeFromEstimate(score)).toBe(true);
  });
});

// ── Parking merchants → Work Travel, MEDIUM for contractors ──────────────

describe("Parking merchants → Work Travel MEDIUM (contractor)", () => {
  it("Wilson Parking → Work Travel MEDIUM", () => {
    const result = detectDeduction(tx("WILSON PARKING SYDNEY"), "contractor");
    expect(result?.category).toBe("Work Travel");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("Secure Parking → Work Travel MEDIUM", () => {
    const result = detectDeduction(tx("SECURE PARKING CITY"), "contractor");
    expect(result?.category).toBe("Work Travel");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("CPP Parking → Work Travel MEDIUM", () => {
    const result = detectDeduction(tx("CPP PARKING MELBOURNE"), "contractor");
    expect(result?.category).toBe("Work Travel");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("EasyPark → Work Travel MEDIUM", () => {
    const result = detectDeduction(tx("EASYPARK"), "contractor");
    expect(result?.category).toBe("Work Travel");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("PayStay → Work Travel MEDIUM", () => {
    const result = detectDeduction(tx("PAYSTAY PARKING"), "contractor");
    expect(result?.category).toBe("Work Travel");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("City of Perth Parking → Work Travel MEDIUM", () => {
    const result = detectDeduction(tx("CITY OF PERTH PARKING"), "contractor");
    expect(result?.category).toBe("Work Travel");
    expect(result?.confidence).toBe("MEDIUM");
  });
});

// ── Parking normalizeMerchant ─────────────────────────────────────────────

describe("Parking normalizeMerchant", () => {
  it("WILSON PARKING SYDNEY → Wilson Parking", () => {
    expect(normalizeMerchant("WILSON PARKING SYDNEY")).toBe("Wilson Parking");
  });

  it("SECURE PARKING CITY → Secure Parking", () => {
    expect(normalizeMerchant("SECURE PARKING CITY")).toBe("Secure Parking");
  });

  it("CPP PARKING MELBOURNE → CPP Parking", () => {
    expect(normalizeMerchant("CPP PARKING MELBOURNE")).toBe("CPP Parking");
  });

  it("CITY OF PERTH PARKING → City of Perth Parking", () => {
    expect(normalizeMerchant("CITY OF PERTH PARKING")).toBe("City of Perth Parking");
  });
});

// ── mixedUse=true on fuel and parking results ─────────────────────────────

describe("Fuel and parking → mixedUse", () => {
  it("Ampol mixedUse=true (contractor)", () => {
    const result = detectDeduction(tx("AMPOL FUEL"), "contractor");
    expect(result?.mixedUse).toBe(true);
  });

  it("Wilson Parking mixedUse=true (contractor)", () => {
    const result = detectDeduction(tx("WILSON PARKING SYDNEY"), "contractor");
    expect(result?.mixedUse).toBe(true);
  });
});
