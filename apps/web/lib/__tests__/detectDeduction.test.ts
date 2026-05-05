import { describe, it, expect } from "vitest";
import { detectDeduction } from "../rules";

// Helper — all test amounts are debits (negative).
function tx(description: string, normalizedMerchant: string, amount = -50) {
  return { description, normalizedMerchant, amount };
}

describe("detectDeduction — Work Tools (Software & Equipment)", () => {
  it("detects Adobe with subscription keyword as SOFTWARE LOW (broad merchant)", () => {
    const result = detectDeduction(tx("Adobe Creative Cloud monthly subscription", "Adobe"), "employee");
    expect(result?.category).toBe("Software & Subscriptions");
    expect(result?.confidence).toBe("LOW");
  });

  it("detects Google with subscription keyword as SOFTWARE", () => {
    const result = detectDeduction(tx("Google Workspace monthly plan", "Google"), "contractor");
    expect(result?.category).toBe("Software & Subscriptions");
    expect(result).not.toBeNull();
  });

  it("detects Canva subscription as SOFTWARE LOW for employee", () => {
    const result = detectDeduction(tx("Canva pro plan annual", "Canva"), "employee");
    expect(result?.category).toBe("Software & Subscriptions");
    expect(result?.confidence).toBe("LOW");
  });

  it("detects Notion as SOFTWARE (specific merchant, requires keyword)", () => {
    const result = detectDeduction(tx("Notion subscription monthly", "Notion"), "employee");
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("detects Figma subscription as SOFTWARE", () => {
    const result = detectDeduction(tx("Figma annual plan renewal", "Figma"), "contractor");
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("detects GitHub subscription as SOFTWARE", () => {
    const result = detectDeduction(tx("GitHub pro plan monthly", "GitHub"), "employee");
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("detects Apple as Equipment (tech_retailer)", () => {
    const result = detectDeduction(tx("Apple MacBook Pro keyboard purchase", "Apple"), "employee");
    // keyboard is WEAK in detectWorkEquipment — should still fire
    expect(result?.category).toBe("Equipment");
  });

  it("detects JB Hi-Fi monitor purchase as Equipment", () => {
    const result = detectDeduction(tx("JB Hi-Fi 27in monitor purchase", "JB Hi-Fi"), "employee");
    expect(result?.category).toBe("Equipment");
  });

  it("detects Officeworks stationery as Office Supplies", () => {
    const result = detectDeduction(tx("Officeworks stationery purchase", "Officeworks"), "employee");
    expect(result?.category).toBe("Office Supplies");
    expect(result?.confidence).toBe("MEDIUM");
  });
});

describe("detectDeduction — Home Office", () => {
  it("detects office chair keyword from Officeworks as Office Supplies (contractor gets HIGH via +1 boost)", () => {
    const result = detectDeduction(tx("Officeworks office chair ergonomic", "Officeworks"), "contractor");
    expect(result?.category).toBe("Office Supplies");
    expect(result?.confidence).toBe("HIGH");
  });

  it("detects office chair keyword-only as Office Supplies LOW", () => {
    const result = detectDeduction(tx("office chair desk setup", "Unknown Store"), "sole_trader");
    expect(result?.category).toBe("Office Supplies");
    expect(result?.confidence).toBe("LOW");
  });

  it("detects electricity bill keyword as Office Supplies LOW for contractor", () => {
    const result = detectDeduction(tx("electricity bill home office", "Unknown Energy"), "contractor");
    expect(result?.category).toBe("Office Supplies");
    expect(result?.confidence).toBe("LOW");
  });

  it("does NOT detect electricity bill for employee (use WFH rate instead)", () => {
    const result = detectDeduction(tx("electricity bill home office", "Unknown Energy"), "employee");
    expect(result).toBeNull();
  });

  it("detects AGL electricity for sole_trader", () => {
    const result = detectDeduction(tx("AGL electricity bill", "AGL"), "sole_trader");
    expect(result?.category).toBe("Office Supplies");
  });

  it("detects monitor as Equipment", () => {
    const result = detectDeduction(tx("27 inch monitor purchase", "Officeworks"), "employee");
    expect(result?.category).toBe("Equipment");
  });

  it("detects keyboard as Equipment WEAK", () => {
    const result = detectDeduction(tx("mechanical keyboard for work", "JB Hi-Fi"), "employee");
    expect(result?.category).toBe("Equipment");
  });

  it("detects mouse as Equipment WEAK", () => {
    const result = detectDeduction(tx("Logitech mouse purchase", "JB Hi-Fi"), "employee");
    expect(result?.category).toBe("Equipment");
  });

  it("detects ergonomic mouse as Equipment LOW (weak keyword, tech retailer corroborates)", () => {
    const result = detectDeduction(tx("ergonomic mouse wrist support", "JB Hi-Fi"), "employee");
    expect(result?.category).toBe("Equipment");
    expect(result?.confidence).toBe("LOW");
  });
});

describe("detectDeduction — Travel", () => {
  it("detects Uber as Work Travel", () => {
    const result = detectDeduction(tx("Uber trip city", "Uber"), "employee");
    expect(result?.category).toBe("Work Travel");
  });

  it("detects DiDi as Work Travel", () => {
    const result = detectDeduction(tx("DiDi ride", "DiDi"), "employee");
    expect(result?.category).toBe("Work Travel");
  });

  it("detects parking keyword as Work Travel LOW", () => {
    const result = detectDeduction(tx("Wilson parking CBD", "Wilson Parking"), "employee");
    expect(result?.category).toBe("Work Travel");
  });

  it("detects toll keyword as Work Travel LOW", () => {
    const result = detectDeduction(tx("toll charge motorway", "Roads Corp"), "employee");
    expect(result?.category).toBe("Work Travel");
  });

  it("detects petrol keyword as Work Travel", () => {
    const result = detectDeduction(tx("petrol purchase fuel", "Local Servo"), "sole_trader");
    expect(result?.category).toBe("Work Travel");
  });
});

describe("detectDeduction — Education / Professional Development", () => {
  it("detects Udemy as Professional Development", () => {
    const result = detectDeduction(tx("Udemy course purchase", "Udemy"), "employee");
    expect(result?.category).toBe("Professional Development");
  });

  it("detects Coursera as Professional Development", () => {
    const result = detectDeduction(tx("Coursera subscription", "Coursera"), "employee");
    expect(result?.category).toBe("Professional Development");
  });

  it("detects LinkedIn Learning (no subscription keyword) as Professional Development", () => {
    const result = detectDeduction(tx("LinkedIn Learning course access", "LinkedIn Learning"), "employee");
    expect(result?.category).toBe("Professional Development");
  });

  it("detects 'course' keyword as Professional Development LOW (fallback)", () => {
    const result = detectDeduction(tx("online course payment", "Unknown Education Co"), "employee");
    expect(result?.category).toBe("Professional Development");
  });

  it("detects 'conference' keyword as Professional Development LOW (fallback)", () => {
    const result = detectDeduction(tx("tech conference registration", "Eventbrite"), "employee");
    expect(result?.category).toBe("Professional Development");
  });

  it("detects 'training' keyword as Professional Development LOW (fallback)", () => {
    const result = detectDeduction(tx("safety training course payment", "Training Org"), "employee");
    expect(result?.category).toBe("Professional Development");
  });
});

describe("detectDeduction — Phone & Internet", () => {
  it("detects Telstra with billing keyword as Phone & Internet MEDIUM", () => {
    const result = detectDeduction(tx("Telstra mobile plan monthly", "Telstra"), "employee");
    expect(result?.category).toBe("Phone & Internet");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("detects Optus mobile plan as Phone & Internet", () => {
    const result = detectDeduction(tx("Optus mobile plan", "Optus"), "employee");
    expect(result?.category).toBe("Phone & Internet");
  });

  it("detects Vodafone as Phone & Internet", () => {
    const result = detectDeduction(tx("Vodafone nbn broadband", "Vodafone"), "employee");
    expect(result?.category).toBe("Phone & Internet");
  });

  it("detects Aussie Broadband as Phone & Internet", () => {
    const result = detectDeduction(tx("Aussie Broadband nbn plan", "Aussie Broadband"), "employee");
    expect(result?.category).toBe("Phone & Internet");
  });

  it("detects TPG as Phone & Internet", () => {
    const result = detectDeduction(tx("TPG internet plan monthly", "TPG"), "employee");
    expect(result?.category).toBe("Phone & Internet");
  });
});

describe("detectDeduction — needsReceipt flag", () => {
  it("sets needsReceipt true for amounts over $82.50", () => {
    const result = detectDeduction(tx("Telstra mobile plan", "Telstra", -100), "employee");
    expect(result?.needsReceipt).toBe(true);
  });

  it("sets needsReceipt false for amounts at or below $82.50", () => {
    const result = detectDeduction(tx("Telstra mobile plan", "Telstra", -82.50), "employee");
    expect(result?.needsReceipt).toBe(false);
  });

  it("sets needsReceipt false for small amounts", () => {
    const result = detectDeduction(tx("Udemy course", "Udemy", -29.99), "employee");
    expect(result?.needsReceipt).toBe(false);
  });
});

describe("detectDeduction — exclusions", () => {
  it("returns null for positive (credit) transactions", () => {
    const result = detectDeduction({ description: "Adobe refund", normalizedMerchant: "Adobe", amount: 50 }, "employee");
    expect(result).toBeNull();
  });

  it("returns null for refund transactions", () => {
    const result = detectDeduction(tx("Udemy refund course", "Udemy"), "employee");
    expect(result).toBeNull();
  });
});
