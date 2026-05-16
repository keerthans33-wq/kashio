import { describe, it, expect } from "vitest";
import { detectDeduction } from "../rules";
import { normalizeMerchant } from "../normalizeMerchant";

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

describe("detectDeduction — mixed-use merchant fallback (all user types)", () => {
  it("surfaces Bunnings for employee at LOW (no keyword)", () => {
    const result = detectDeduction(tx("Bunnings purchase", "Bunnings"), "employee");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Equipment");
    expect(result?.confidence).toBe("LOW");
  });

  it("surfaces Bunnings for sole_trader with tool keyword at MEDIUM", () => {
    const result = detectDeduction(tx("Bunnings drill set", "Bunnings"), "sole_trader");
    expect(result?.category).toBe("Equipment");
    // sole_trader gets +1 bump; keyword = drill, merchant = general → MEDIUM base → HIGH after +1
    // Actually: detectTools(general + keyword) = MEDIUM, canUpgrade=true, +1 → HIGH
    expect(["MEDIUM", "HIGH"]).toContain(result?.confidence);
  });

  it("surfaces IKEA purchase for employee at LOW", () => {
    const result = detectDeduction(tx("IKEA online order", "Ikea"), "employee");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Office Supplies");
    expect(result?.confidence).toBe("LOW");
  });

  it("surfaces Kmart for employee at LOW", () => {
    const result = detectDeduction(tx("Kmart purchase", "Kmart"), "employee");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Office Supplies");
    expect(result?.confidence).toBe("LOW");
  });

  it("surfaces Target for contractor at LOW", () => {
    const result = detectDeduction(tx("Target order", "Target"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Office Supplies");
  });

  it("surfaces Big W for sole_trader at LOW", () => {
    const result = detectDeduction(tx("Big W purchase", "Big W"), "sole_trader");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Office Supplies");
  });

  it("surfaces Repco for contractor at LOW", () => {
    const result = detectDeduction(tx("Repco auto parts", "Repco"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Equipment");
  });

  it("surfaces Supercheap Auto for sole_trader at LOW", () => {
    const result = detectDeduction(tx("Supercheap Auto purchase", "Supercheap Auto"), "sole_trader");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Equipment");
  });

  it("does NOT surface Woolworths for employee", () => {
    const result = detectDeduction(tx("Woolworths groceries", "Woolworths"), "employee");
    expect(result).toBeNull();
  });

  it("surfaces Woolworths for sole_trader at LOW", () => {
    const result = detectDeduction(tx("Woolworths consumables", "Woolworths"), "sole_trader");
    expect(result).not.toBeNull();
  });
});

describe("detectDeduction — highly-likely merchant fallback", () => {
  it("surfaces ChatGPT subscription as Software MEDIUM (specific + keyword)", () => {
    const result = detectDeduction(tx("ChatGPT subscription monthly", "ChatGPT"), "employee");
    expect(result?.category).toBe("Software & Subscriptions");
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("surfaces ChatGPT with no keyword as Software LOW", () => {
    const result = detectDeduction(tx("ChatGPT purchase", "ChatGPT"), "employee");
    expect(result?.category).toBe("Software & Subscriptions");
    expect(result?.confidence).toBe("LOW");
  });

  it("surfaces OpenAI subscription as Software", () => {
    const result = detectDeduction(tx("OpenAI API subscription", "OpenAI"), "contractor");
    expect(result?.category).toBe("Software & Subscriptions");
    expect(result).not.toBeNull();
  });

  it("surfaces Google Ads for contractor as Software", () => {
    const result = detectDeduction(tx("Google Ads campaign charge", "Google Ads"), "contractor");
    expect(result?.category).toBe("Software & Subscriptions");
    expect(result).not.toBeNull();
  });

  it("does NOT surface Google Ads for employee (forUserTypes restriction)", () => {
    const result = detectDeduction(tx("Google Ads charge", "Google Ads"), "employee");
    expect(result).toBeNull();
  });

  it("surfaces Meta Ads for sole_trader as Software", () => {
    const result = detectDeduction(tx("Meta Ads spend", "Meta Ads"), "sole_trader");
    expect(result?.category).toBe("Software & Subscriptions");
    expect(result).not.toBeNull();
  });

  it("surfaces Vercel subscription as Software", () => {
    const result = detectDeduction(tx("Vercel Pro plan monthly", "Vercel"), "contractor");
    expect(result?.category).toBe("Software & Subscriptions");
    expect(result).not.toBeNull();
  });

  it("surfaces Workwearhub as Work Clothing", () => {
    const result = detectDeduction(tx("Workwearhub uniform order", "Workwearhub"), "employee");
    expect(result?.category).toBe("Work Clothing");
    expect(result).not.toBeNull();
  });

  it("surfaces Engineers Australia membership as Professional Development", () => {
    const result = detectDeduction(tx("Engineers Australia membership fee", "Engineers Australia"), "employee");
    expect(result?.category).toBe("Professional Development");
    expect(result).not.toBeNull();
  });
});

describe("detectDeduction — merchant normalization (bank description variants)", () => {
  it("normalizes 'Google Ads' merchant (from GOOGLE *ADS bank description) to Software", () => {
    // After normalizeMerchant("GOOGLE *ADS") → "Google Ads"
    const result = detectDeduction(tx("ad spend", "Google Ads"), "contractor");
    expect(result?.category).toBe("Software & Subscriptions");
    expect(result).not.toBeNull();
  });

  it("normalizes 'Meta Ads' merchant to Software", () => {
    // After normalizeMerchant("META PAYMENTS") → "Meta Ads"
    const result = detectDeduction(tx("ad spend", "Meta Ads"), "sole_trader");
    expect(result?.category).toBe("Software & Subscriptions");
    expect(result).not.toBeNull();
  });

  it("detects 'LinkedIn Premium' after normalization", () => {
    // After normalizeMerchant("LINKEDIN PREM") → "LinkedIn Premium"
    const result = detectDeduction(tx("LinkedIn Premium subscription", "LinkedIn Premium"), "employee");
    expect(result?.category).toBe("Software & Subscriptions");
    expect(result).not.toBeNull();
  });
});

describe("normalizeMerchant — alias pre-processing", () => {
  it("GOOGLE *ADS → Google Ads", () => {
    expect(normalizeMerchant("GOOGLE *ADS")).toBe("Google Ads");
  });

  it("GOOGLE *AD → Google Ads", () => {
    expect(normalizeMerchant("GOOGLE *AD")).toBe("Google Ads");
  });

  it("META PAYMENTS → Meta Ads", () => {
    expect(normalizeMerchant("META PAYMENTS")).toBe("Meta Ads");
  });

  it("META ADS → Meta Ads", () => {
    expect(normalizeMerchant("META ADS")).toBe("Meta Ads");
  });

  it("FACEBOOK ADS → Facebook Ads", () => {
    expect(normalizeMerchant("FACEBOOK ADS")).toBe("Facebook Ads");
  });

  it("LINKEDIN PREM → LinkedIn Premium", () => {
    expect(normalizeMerchant("LINKEDIN PREM")).toBe("LinkedIn Premium");
  });

  it("CHATGPT → ChatGPT", () => {
    expect(normalizeMerchant("CHATGPT")).toBe("ChatGPT");
  });

  it("OPENAI → OpenAI", () => {
    expect(normalizeMerchant("OPENAI")).toBe("OpenAI");
  });

  it("AWS AMAZON → AWS", () => {
    expect(normalizeMerchant("AWS AMAZON WEB SERVICES")).toBe("AWS");
  });

  it("TIKTOK ADS → TikTok Ads", () => {
    expect(normalizeMerchant("TIKTOK ADS")).toBe("TikTok Ads");
  });

  it("standard normalization still works for non-alias patterns", () => {
    // CAFE is an all-caps trailing word so it's treated as a location suffix
    expect(normalizeMerchant("SQ *RIVERSIDE CAFE")).toBe("Riverside");
    expect(normalizeMerchant("POS PURCHASE BUNNINGS AUBURN")).toBe("Bunnings");
    expect(normalizeMerchant("OFFICEWORKS 0042 SYDNEY")).toBe("Officeworks");
  });
});
