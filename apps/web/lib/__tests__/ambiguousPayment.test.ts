import { describe, it, expect } from "vitest";
import { detectDeduction } from "../rules";
import { normalizeMerchant } from "../normalizeMerchant";
import { getPersonalExpenseBlockReason } from "../rules/blacklist";

function tx(description: string, amount = -120) {
  return { description, normalizedMerchant: normalizeMerchant(description), amount };
}

// ── normalizeMerchant sanity ────────────────────────────────────────────────

describe("normalizeMerchant — PayPal variants", () => {
  it("PAYPAL AU normalises to PayPal (not PayPal Fee)", () => {
    expect(normalizeMerchant("PAYPAL AU")).toBe("PayPal");
  });
  it("PAYPAL*AU normalises to PayPal", () => {
    expect(normalizeMerchant("PAYPAL*AU")).toBe("PayPal");
  });
  it("PAYPAL AUSTRALIA PTY LTD normalises to PayPal", () => {
    expect(normalizeMerchant("PAYPAL AUSTRALIA PTY LTD")).toBe("PayPal");
  });
  it("PAYPAL*FEES still normalises to PayPal Fee", () => {
    expect(normalizeMerchant("PAYPAL*FEES")).toBe("PayPal Fee");
  });
  it("PAYPAL*MERCHANT still normalises to PayPal Fee", () => {
    expect(normalizeMerchant("PAYPAL*MERCHANT")).toBe("PayPal Fee");
  });
});

// ── Ambiguous payment processors → LOW Uncategorised ───────────────────────

describe("detectAmbiguousPayment — ambiguous processors become LOW Uncategorised", () => {
  it("Wise alone → LOW Uncategorised (not Payment Processing)", () => {
    const result = detectDeduction(tx("WISE AUSTRALIA PTY LTD"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Uncategorised Possible Deduction");
    expect(result?.confidence).toBe("LOW");
  });

  it("WISE BUSINESS → LOW Uncategorised (not Payment Processing)", () => {
    const result = detectDeduction(tx("WISE BUSINESS"), "contractor");
    expect(result?.category).toBe("Uncategorised Possible Deduction");
    expect(result?.confidence).toBe("LOW");
  });

  it("Transfer to Wise → null (blacklisted P2P) or LOW (if parsed as Wise)", () => {
    // "TRANSFER TO WISE" — LOCATION_SLUG strips "WISE" → normalizedMerchant = "Transfer To"
    // detectAmbiguousPayment won't fire (merchant is "transfer to" not "wise").
    // The description is checked by blacklist TRANSFER_TO_REGEX → blocked as personal_transfer.
    const result = getPersonalExpenseBlockReason(
      { description: "TRANSFER TO WISE", normalizedMerchant: normalizeMerchant("TRANSFER TO WISE"), amount: -200 },
    );
    expect(result).toBe("personal_transfer");
  });

  it("AFTERPAY consumer purchase → LOW Uncategorised (not Payment Processing)", () => {
    const result = detectDeduction(tx("AFTERPAY"), "employee");
    expect(result?.category).toBe("Uncategorised Possible Deduction");
    expect(result?.confidence).toBe("LOW");
  });

  it("PayPal AU → LOW Uncategorised (not Payment Processing)", () => {
    const result = detectDeduction(tx("PAYPAL AU"), "sole_trader");
    expect(result?.category).toBe("Uncategorised Possible Deduction");
    expect(result?.confidence).toBe("LOW");
  });

  it("PayPal Australia Pty Ltd → LOW Uncategorised", () => {
    const result = detectDeduction(tx("PAYPAL AUSTRALIA PTY LTD"), "contractor");
    expect(result?.category).toBe("Uncategorised Possible Deduction");
    expect(result?.confidence).toBe("LOW");
  });

  it("ZIP CO purchase → LOW Uncategorised (not Payment Processing)", () => {
    const result = detectDeduction(tx("ZIP CO PURCHASE SYDNEY"), "employee");
    expect(result?.category).toBe("Uncategorised Possible Deduction");
    expect(result?.confidence).toBe("LOW");
  });

  it("ZIP PAY → LOW Uncategorised", () => {
    const result = detectDeduction(tx("ZIP PAY"), "contractor");
    expect(result?.category).toBe("Uncategorised Possible Deduction");
    expect(result?.confidence).toBe("LOW");
  });

  it("HUMM → LOW Uncategorised", () => {
    const result = detectDeduction(tx("HUMM"), "employee");
    expect(result?.category).toBe("Uncategorised Possible Deduction");
    expect(result?.confidence).toBe("LOW");
  });

  it("LAYBUY → LOW Uncategorised", () => {
    const result = detectDeduction(tx("LAYBUY"), "contractor");
    expect(result?.category).toBe("Uncategorised Possible Deduction");
    expect(result?.confidence).toBe("LOW");
  });
});

// ── Business context upgrade → MEDIUM Uncategorised ────────────────────────

describe("detectAmbiguousPayment — business context upgrades to MEDIUM", () => {
  it("Wise payment with 'invoice' in description → MEDIUM Uncategorised", () => {
    const t = { description: "WISE INTERNATIONAL INVOICE 1234", normalizedMerchant: "Wise", amount: -450 };
    const result = detectDeduction(t, "contractor");
    expect(result?.category).toBe("Uncategorised Possible Deduction");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("Wise payment with 'supplier' in description → MEDIUM", () => {
    const t = { description: "WISE SUPPLIER PAYMENT", normalizedMerchant: "Wise", amount: -800 };
    const result = detectDeduction(t, "sole_trader");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("Afterpay with 'subscription' in description → MEDIUM Uncategorised", () => {
    const t = { description: "AFTERPAY SUBSCRIPTION SOFTWARE", normalizedMerchant: "Afterpay", amount: -29 };
    const result = detectDeduction(t, "contractor");
    expect(result?.category).toBe("Uncategorised Possible Deduction");
    expect(result?.confidence).toBe("MEDIUM");
  });
});

// ── Clearly-business variants still → Payment Processing ───────────────────

describe("detectAmbiguousPayment — business variants still go to Payment Processing", () => {
  it("Stripe → Payment Processing (contractors may get HIGH via adjustConfidence)", () => {
    const result = detectDeduction(tx("STRIPE PAYMENTS"), "contractor");
    expect(result?.category).toBe("Payment Processing");
    expect(result?.confidence).not.toBeNull();
  });

  it("AFTERPAY MERCHANT FEE → Payment Processing (sole_trader may get HIGH via adjustConfidence)", () => {
    const result = detectDeduction(
      { description: "AFTERPAY MERCHANT FEE", normalizedMerchant: "Afterpay Merchant Fee", amount: -15 },
      "sole_trader",
    );
    expect(result?.category).toBe("Payment Processing");
  });

  it("Afterpay Merchant → Payment Processing", () => {
    const result = detectDeduction(
      { description: "AFTERPAY MERCHANT", normalizedMerchant: "Afterpay Merchant Fee", amount: -8 },
      "sole_trader",
    );
    expect(result?.category).toBe("Payment Processing");
  });

  it("PAYPAL*FEES → Payment Processing MEDIUM (fee variant preserved)", () => {
    const result = detectDeduction(
      { description: "PAYPAL*FEES", normalizedMerchant: normalizeMerchant("PAYPAL*FEES"), amount: -3.5 },
      "contractor",
    );
    expect(result?.category).toBe("Payment Processing");
  });

  it("Square → Payment Processing MEDIUM", () => {
    const result = detectDeduction(tx("SQUARE PAYMENTS"), "sole_trader");
    expect(result?.category).toBe("Payment Processing");
  });

  it("ZIP MERCHANT → Payment Processing MEDIUM", () => {
    const result = detectDeduction(
      { description: "ZIP MERCHANT FEE", normalizedMerchant: "Zip Merchant", amount: -5 },
      "sole_trader",
    );
    expect(result?.category).toBe("Payment Processing");
  });
});

// ── Blacklist: hard blocks ──────────────────────────────────────────────────

describe("blacklist — new hard blocks", () => {
  it("international transaction fee → blocked", () => {
    const reason = getPersonalExpenseBlockReason(
      { description: "INTERNATIONAL TRANSACTION FEE", normalizedMerchant: "International Transaction Fee", amount: -3.5 },
    );
    expect(reason).not.toBeNull();
  });

  it("foreign transaction fee → blocked", () => {
    const reason = getPersonalExpenseBlockReason(
      { description: "FOREIGN TRANSACTION FEE USD VISA", normalizedMerchant: "Foreign Transaction Fee", amount: -2 },
    );
    expect(reason).not.toBeNull();
  });

  it("insufficient funds fee → blocked", () => {
    const reason = getPersonalExpenseBlockReason(
      { description: "INSUFFICIENT FUNDS FEE REF 12345", normalizedMerchant: "Insufficient Funds Fee", amount: -15 },
    );
    expect(reason).not.toBeNull();
  });

  it("dishonour fee → blocked", () => {
    const reason = getPersonalExpenseBlockReason(
      { description: "DISHONOUR FEE", normalizedMerchant: "Dishonour Fee", amount: -10 },
    );
    expect(reason).not.toBeNull();
  });

  it("Commbank App transfer → blocked", () => {
    const reason = getPersonalExpenseBlockReason(
      { description: "COMMBANK APP TRANSFER TO JOHN", normalizedMerchant: "Commbank App Transfer To John", amount: -50 },
    );
    expect(reason).not.toBeNull();
  });

  it("Mine and Pia_s share → blocked", () => {
    const reason = getPersonalExpenseBlockReason(
      { description: "Mine and Pia_s share dinner", normalizedMerchant: "Mine And", amount: -45 },
    );
    expect(reason).not.toBeNull();
  });
});

// ── Blacklist: soft blocks ──────────────────────────────────────────────────

describe("blacklist — new soft blocks", () => {
  it("Transfer To John Smith → blocked (no biz context)", () => {
    const reason = getPersonalExpenseBlockReason(
      { description: "Transfer To John Smith", normalizedMerchant: "Transfer To", amount: -200 },
    );
    expect(reason).toBe("personal_transfer");
  });

  it("Transfer To Jane (no context) → blocked", () => {
    const reason = getPersonalExpenseBlockReason(
      { description: "TRANSFER TO JANE BLOGGS", normalizedMerchant: "Transfer To", amount: -80 },
    );
    expect(reason).toBe("personal_transfer");
  });

  it("Transfer To ATO with tax context → not blocked (rescued by 'ato')", () => {
    const reason = getPersonalExpenseBlockReason(
      { description: "Transfer To ATO tax payment", normalizedMerchant: "Transfer To", amount: -3500 },
    );
    expect(reason).toBeNull();
  });

  it("Rent payment (no commercial context) → blocked", () => {
    const reason = getPersonalExpenseBlockReason(
      { description: "RENT PAYMENT FORTNIGHTLY", normalizedMerchant: "Rent Payment Fortnightly", amount: -1400 },
    );
    expect(reason).toBe("rent");
  });

  it("Office rent → not blocked (rescued by 'office')", () => {
    const reason = getPersonalExpenseBlockReason(
      { description: "OFFICE RENT MONTHLY", normalizedMerchant: "Office Rent Monthly", amount: -2000 },
    );
    expect(reason).toBeNull();
  });

  it("Commercial rent → not blocked", () => {
    const reason = getPersonalExpenseBlockReason(
      { description: "COMMERCIAL RENT PAYMENT", normalizedMerchant: "Commercial Rent Payment", amount: -3500 },
    );
    expect(reason).toBeNull();
  });
});
