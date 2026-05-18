import { describe, it, expect } from "vitest";
import { detectDeduction } from "../rules";
import { normalizeMerchant } from "../normalizeMerchant";

function tx(description: string, amount = -30) {
  return { description, normalizedMerchant: normalizeMerchant(description), amount };
}

// ── Uber help-centre URL — must be Work Travel, not Software & Subscriptions ─

describe("Uber help-centre URL descriptor", () => {
  it("UBER HELP.UBER.COM → Work Travel (not Software & Subscriptions)", () => {
    const result = detectDeduction(tx("UBER HELP.UBER.COM"), "employee");
    expect(result?.category).toBe("Work Travel");
    expect(result?.category).not.toBe("Software & Subscriptions");
  });

  it("UBER * HELP.UBER.C → Work Travel (not Software & Subscriptions)", () => {
    const result = detectDeduction(tx("UBER * HELP.UBER.C"), "employee");
    expect(result?.category).toBe("Work Travel");
    expect(result?.category).not.toBe("Software & Subscriptions");
  });

  it("UBER HELP.UBER.COM → LOW confidence (reviewRequired=true for employees)", () => {
    const result = detectDeduction(tx("UBER HELP.UBER.COM"), "employee");
    expect(result?.confidence).toBe("LOW");
  });
});

// ── Uber rideshare — Work Travel, reviewRequired ──────────────────────────

describe("Uber rideshare → Work Travel", () => {
  it("UBER *TRIP → Work Travel", () => {
    const result = detectDeduction(tx("UBER *TRIP"), "employee");
    expect(result?.category).toBe("Work Travel");
  });

  it("UBER BV → Work Travel", () => {
    const result = detectDeduction(tx("UBER BV"), "employee");
    expect(result?.category).toBe("Work Travel");
  });

  it("Uber (plain) → Work Travel LOW for employee", () => {
    const result = detectDeduction(
      { description: "UBER", normalizedMerchant: "Uber", amount: -25 },
      "employee",
    );
    expect(result?.category).toBe("Work Travel");
    expect(result?.confidence).toBe("LOW");
  });
});

// ── Strong context keywords → MEDIUM (included in estimate) ──────────────

describe("Uber with strong context → MEDIUM for contractor", () => {
  it("airport keyword → MEDIUM (contractor)", () => {
    const result = detectDeduction(tx("UBER TRIP TO AIRPORT"), "contractor");
    expect(result?.category).toBe("Work Travel");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("client meeting keyword → MEDIUM (contractor)", () => {
    const result = detectDeduction(
      { description: "UBER CLIENT MEETING CBD", normalizedMerchant: "Uber", amount: -28 },
      "contractor",
    );
    expect(result?.category).toBe("Work Travel");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("conference keyword → MEDIUM (contractor)", () => {
    const result = detectDeduction(tx("UBER CONFERENCE TRIP"), "contractor");
    expect(result?.category).toBe("Work Travel");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("work trip keyword → MEDIUM (contractor)", () => {
    const result = detectDeduction(
      { description: "UBER WORK TRIP SYDNEY", normalizedMerchant: "Uber", amount: -45 },
      "contractor",
    );
    expect(result?.category).toBe("Work Travel");
    expect(result?.confidence).toBe("MEDIUM");
  });
});

// ── Uber Eats — Meals (not Work Travel), excluded from estimate ───────────

describe("Uber Eats → Meals (not Work Travel)", () => {
  it("UBER EATS (contractor) → Meals LOW", () => {
    const result = detectDeduction(tx("UBER EATS"), "contractor");
    expect(result?.category).toBe("Meals");
    expect(result?.category).not.toBe("Work Travel");
  });

  it("UBER* EATS (contractor) → Meals LOW", () => {
    const result = detectDeduction(tx("UBER* EATS"), "contractor");
    expect(result?.category).toBe("Meals");
  });

  it("UBER EATS (employee) → null (meals suppressed for employees)", () => {
    const result = detectDeduction(tx("UBER EATS"), "employee");
    expect(result).toBeNull();
  });

  it("UBER EATS normalizeMerchant → 'Uber Eats' (not 'Uber')", () => {
    expect(normalizeMerchant("UBER EATS")).toBe("Uber Eats");
    expect(normalizeMerchant("UBER* EATS")).toBe("Uber Eats");
  });
});

// ── Taxis — Work Travel, reviewRequired ──────────────────────────────────

describe("Taxi services → Work Travel", () => {
  it("13CABS → Work Travel", () => {
    const result = detectDeduction(tx("13CABS"), "employee");
    expect(result?.category).toBe("Work Travel");
  });

  it("13 CABS → Work Travel (space-separated form)", () => {
    const result = detectDeduction(tx("13 CABS"), "employee");
    expect(result?.category).toBe("Work Travel");
  });

  it("13 CABS SYDNEY → Work Travel (with city suffix)", () => {
    const result = detectDeduction(tx("13 CABS SYDNEY"), "employee");
    expect(result?.category).toBe("Work Travel");
  });

  it("13 CABS normalizeMerchant → '13cabs'", () => {
    expect(normalizeMerchant("13 CABS")).toBe("13cabs");
    expect(normalizeMerchant("13 CAB")).toBe("13cabs");
    expect(normalizeMerchant("13 CABS SYDNEY")).toBe("13cabs");
  });

  it("taxi keyword → Work Travel LOW (unknown merchant)", () => {
    const result = detectDeduction(
      { description: "CITY TAXI SERVICE", normalizedMerchant: "City Taxi Service", amount: -22 },
      "employee",
    );
    expect(result?.category).toBe("Work Travel");
  });
});

// ── Other rideshare — Work Travel ─────────────────────────────────────────

describe("Other rideshare → Work Travel", () => {
  it("DiDi → Work Travel", () => {
    const result = detectDeduction(
      { description: "DIDI MOBILITY", normalizedMerchant: "Didi", amount: -18 },
      "employee",
    );
    expect(result?.category).toBe("Work Travel");
  });

  it("Ola → Work Travel", () => {
    const result = detectDeduction(
      { description: "OLA CABS", normalizedMerchant: "Ola", amount: -22 },
      "employee",
    );
    expect(result?.category).toBe("Work Travel");
  });
});
