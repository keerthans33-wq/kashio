// High-confidence deductible merchants
//
// Tests that explicitly-recognised work tools return MEDIUM for employees and
// HIGH for contractors/sole traders (via adjustConfidence +1 delta), and that
// their scores are high enough to be included in estimated deduction totals
// (excludeFromEstimate = false requires score ≥ 40).
//
// Merchants under test (all pre-existing in ALIAS_MAP or newly added):
//   Software:      Canva, Dropbox, Mailgun, Anthropic, Claude AI, GoHighLevel
//   Website/Domain: Hostinger, CrazyDomains, Vercel
//   Accounting:    ASIC, ATO, keyword-only "accountant fee"
//   App stores:    Apple Services (APPLE.COM/BILL), Google Play

import { describe, it, expect } from "vitest";
import { detectDeduction } from "../rules";
import { normalizeMerchant } from "../normalizeMerchant";
import { computeScore, computeExcludeFromEstimate } from "../rules/scoring";

function tx(rawDescription: string, amount = -50) {
  return {
    description:        rawDescription,
    normalizedMerchant: normalizeMerchant(rawDescription),
    amount,
  };
}

function txNorm(description: string, normalizedMerchant: string, amount = -50) {
  return { description, normalizedMerchant, amount };
}

// ── Helper: verify that a result is included in the estimate ─────────────────
function isIncluded(result: ReturnType<typeof detectDeduction>): boolean {
  if (!result) return false;
  const score = computeScore({
    confidence:   result.confidence,
    mixedUse:     result.mixedUse ?? false,
    needsReceipt: result.needsReceipt ?? false,
    signals:      result.signals ?? {},
    source:       "engine",
  });
  return !computeExcludeFromEstimate(score);
}

// ── Canva ─────────────────────────────────────────────────────────────────────

describe("Canva — graphic design platform", () => {
  it("employee → Software MEDIUM", () => {
    const result = detectDeduction(txNorm("CANVA PTY LTD", "Canva"), "employee");
    expect(result?.category).toBe("Software & Subscriptions");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("contractor → Software HIGH", () => {
    const result = detectDeduction(txNorm("CANVA PTY LTD", "Canva"), "contractor");
    expect(result?.category).toBe("Software & Subscriptions");
    expect(result?.confidence).toBe("HIGH");
  });

  it("sole_trader → Software HIGH", () => {
    const result = detectDeduction(txNorm("CANVA PTY LTD", "Canva"), "sole_trader");
    expect(result?.confidence).toBe("HIGH");
  });

  it("contractor → included in estimate", () => {
    const result = detectDeduction(txNorm("CANVA PTY LTD", "Canva"), "contractor");
    expect(isIncluded(result)).toBe(true);
  });
});

// ── Dropbox ───────────────────────────────────────────────────────────────────

describe("Dropbox — cloud storage", () => {
  it("employee → Software MEDIUM", () => {
    const result = detectDeduction(tx("DROPBOX"), "employee");
    expect(result?.category).toBe("Software & Subscriptions");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("contractor → Software HIGH", () => {
    const result = detectDeduction(tx("DROPBOX"), "contractor");
    expect(result?.confidence).toBe("HIGH");
  });

  it("contractor → included in estimate", () => {
    expect(isIncluded(detectDeduction(tx("DROPBOX"), "contractor"))).toBe(true);
  });
});

// ── Mailgun ───────────────────────────────────────────────────────────────────

describe("Mailgun — email delivery API", () => {
  it("employee → Software MEDIUM", () => {
    const result = detectDeduction(tx("MAILGUN"), "employee");
    expect(result?.category).toBe("Software & Subscriptions");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("contractor → Software HIGH", () => {
    const result = detectDeduction(tx("MAILGUN TECHNOLOGIES"), "contractor");
    expect(result?.confidence).toBe("HIGH");
  });
});

// ── Anthropic / Claude AI ─────────────────────────────────────────────────────

describe("Anthropic — Claude AI subscription", () => {
  it("'ANTHROPIC' bare descriptor → Software MEDIUM for employee", () => {
    const result = detectDeduction(tx("ANTHROPIC"), "employee");
    expect(result?.category).toBe("Software & Subscriptions");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("contractor → Software HIGH", () => {
    const result = detectDeduction(tx("ANTHROPIC"), "contractor");
    expect(result?.confidence).toBe("HIGH");
  });

  it("'CLAUDE AI' descriptor → Software MEDIUM for employee", () => {
    const result = detectDeduction(tx("CLAUDE AI"), "employee");
    expect(result?.category).toBe("Software & Subscriptions");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("'CLAUDE AI' contractor → HIGH", () => {
    const result = detectDeduction(tx("CLAUDE AI"), "contractor");
    expect(result?.confidence).toBe("HIGH");
  });

  it("'CLAUDE.AI' billing descriptor → Software (dot normalises correctly)", () => {
    const result = detectDeduction(tx("CLAUDE.AI"), "employee");
    expect(result?.category).toBe("Software & Subscriptions");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("contractor → included in estimate", () => {
    expect(isIncluded(detectDeduction(tx("ANTHROPIC"), "contractor"))).toBe(true);
  });
});

// ── GoHighLevel ───────────────────────────────────────────────────────────────

describe("GoHighLevel — CRM and marketing automation", () => {
  it("'GOHIGHLEVEL' compact form → Software MEDIUM for employee", () => {
    const result = detectDeduction(tx("GOHIGHLEVEL"), "employee");
    expect(result?.category).toBe("Software & Subscriptions");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("contractor → HIGH", () => {
    const result = detectDeduction(tx("GOHIGHLEVEL"), "contractor");
    expect(result?.confidence).toBe("HIGH");
  });

  it("'GO HIGH LEVEL' spaced form normalises correctly → MEDIUM for employee", () => {
    // normalizeMerchant alias maps "GO HIGH LEVEL" → "GoHighLevel" before
    // LOCATION_SLUG can strip " HIGH LEVEL".
    const result = detectDeduction(tx("GO HIGH LEVEL MONTHLY"), "employee");
    expect(result?.category).toBe("Software & Subscriptions");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("'GHL' abbreviation normalises correctly → MEDIUM for employee", () => {
    const result = detectDeduction(tx("GHL SUBSCRIPTION"), "employee");
    expect(result?.category).toBe("Software & Subscriptions");
    expect(result?.confidence).toBe("MEDIUM");
  });
});

// ── Hostinger ─────────────────────────────────────────────────────────────────

describe("Hostinger — web hosting", () => {
  it("employee → Website & Domains MEDIUM", () => {
    const result = detectDeduction(tx("HOSTINGER"), "employee");
    expect(result?.category).toBe("Website & Domains");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("contractor → Website & Domains HIGH", () => {
    const result = detectDeduction(tx("HOSTINGER"), "contractor");
    expect(result?.confidence).toBe("HIGH");
  });

  it("contractor → included in estimate", () => {
    expect(isIncluded(detectDeduction(tx("HOSTINGER"), "contractor"))).toBe(true);
  });
});

// ── CrazyDomains ─────────────────────────────────────────────────────────────

describe("CrazyDomains — domain registrar", () => {
  it("employee → Website & Domains MEDIUM", () => {
    const result = detectDeduction(tx("CRAZY DOMAINS"));
    const result2 = detectDeduction(txNorm("CRAZY DOMAINS AU", normalizeMerchant("CRAZY DOMAINS AU")), "employee");
    expect(result2?.category).toBe("Website & Domains");
    expect(result2?.confidence).toBe("MEDIUM");
  });

  it("sole_trader → Website & Domains HIGH", () => {
    const result = detectDeduction(txNorm("CRAZY DOMAINS AU", normalizeMerchant("CRAZY DOMAINS AU")), "sole_trader");
    expect(result?.confidence).toBe("HIGH");
  });
});

// ── ASIC ─────────────────────────────────────────────────────────────────────

describe("ASIC — business registration fees", () => {
  it("employee → Accounting & Business MEDIUM", () => {
    const result = detectDeduction(tx("ASIC"), "employee");
    expect(result?.category).toBe("Accounting & Business");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("contractor → Accounting & Business HIGH", () => {
    const result = detectDeduction(tx("ASIC ANNUAL FEE"), "contractor");
    expect(result?.category).toBe("Accounting & Business");
    expect(result?.confidence).toBe("HIGH");
  });

  it("sole_trader → included in estimate", () => {
    expect(isIncluded(detectDeduction(tx("ASIC"), "sole_trader"))).toBe(true);
  });
});

// ── ATO ───────────────────────────────────────────────────────────────────────

describe("ATO — Australian Taxation Office fees", () => {
  it("bare 'ATO' → Accounting & Business MEDIUM for employee", () => {
    const result = detectDeduction(tx("ATO"), "employee");
    expect(result?.category).toBe("Accounting & Business");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("contractor → Accounting & Business HIGH", () => {
    const result = detectDeduction(tx("ATO"), "contractor");
    expect(result?.confidence).toBe("HIGH");
  });

  it("'ATO PAYMENT' descriptor → Accounting & Business", () => {
    const result = detectDeduction(tx("ATO PAYMENT"), "sole_trader");
    expect(result?.category).toBe("Accounting & Business");
  });
});

// ── Accounting keywords (unknown merchant) ────────────────────────────────────

describe("accounting keywords — unknown merchant surfaces as Accounting & Business", () => {
  it("'accountant fee' description → Accounting & Business for contractor", () => {
    const result = detectDeduction(
      { description: "accountant fee invoice", normalizedMerchant: "John Smith", amount: -300 },
      "contractor",
    );
    expect(result?.category).toBe("Accounting & Business");
  });

  it("'bookkeeping monthly' description → Accounting & Business", () => {
    const result = detectDeduction(
      { description: "bookkeeping monthly service", normalizedMerchant: "Jane Doe Services", amount: -200 },
      "sole_trader",
    );
    expect(result?.category).toBe("Accounting & Business");
  });

  it("'tax agent' description → Accounting & Business", () => {
    const result = detectDeduction(
      { description: "tax agent preparation fee", normalizedMerchant: "Smith Tax", amount: -400 },
      "employee",
    );
    expect(result?.category).toBe("Accounting & Business");
  });
});

// ── Apple Services / Google Play — now MEDIUM ─────────────────────────────────

describe("Apple Services and Google Play — MEDIUM for employees, HIGH for contractors", () => {
  it("APPLE.COM/BILL → MEDIUM for employee", () => {
    const result = detectDeduction(tx("APPLE.COM/BILL"), "employee");
    expect(result?.category).toBe("Software & Subscriptions");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("APPLE.COM/BILL → HIGH for contractor", () => {
    const result = detectDeduction(tx("APPLE.COM/BILL"), "contractor");
    expect(result?.confidence).toBe("HIGH");
  });

  it("GOOGLE PLAY → MEDIUM for employee", () => {
    const result = detectDeduction(tx("GOOGLE PLAY"), "employee");
    expect(result?.category).toBe("Software & Subscriptions");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("GOOGLE PLAY → HIGH for sole_trader", () => {
    const result = detectDeduction(tx("GOOGLE PLAY"), "sole_trader");
    expect(result?.confidence).toBe("HIGH");
  });

  it("APPLE.COM/BILL reason still mentions reviewing the receipt", () => {
    const result = detectDeduction(tx("APPLE.COM/BILL"), "employee");
    expect(result?.reason).toMatch(/review/i);
  });

  it("contractor Apple Services → included in estimate", () => {
    expect(isIncluded(detectDeduction(tx("APPLE.COM/BILL"), "contractor"))).toBe(true);
  });
});

// ── Vercel (regression guard for existing WEBSITE_DOMAINS entries) ────────────

describe("Vercel — existing WEBSITE_DOMAINS entry not regressed", () => {
  it("employee → Website & Domains MEDIUM", () => {
    const result = detectDeduction(tx("VERCEL"), "employee");
    expect(result?.category).toBe("Website & Domains");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("sole_trader → Website & Domains HIGH", () => {
    const result = detectDeduction(tx("VERCEL"), "sole_trader");
    expect(result?.confidence).toBe("HIGH");
  });
});
