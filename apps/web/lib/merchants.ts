// Australian merchant knowledge base.
// Used as reference data for rules, explanations, and future matching logic.
// Each entry maps a normalised merchant name to its category and a short description.

import { CATEGORIES } from "./rules/categories";

export type MerchantEntry = {
  category:    string;
  description: string;
  // Optional sub-group within the category, used by rules that distinguish tiers.
  // travel:    "transport" | "fuel" | "convenience"
  // equipment: "trade_only" | "general" | "tech_retailer"
  // software:  "specific" | "broad"
  // office:    "specialist"
  tier?: string;
  // If set, this merchant is only included for the listed user types.
  // Omit to include for all user types.
  forUserTypes?: string[];
};

// Returns merchant names for a given category, optionally filtered by tier and/or user type.
export function getMerchantsForCategory(category: string, tier?: string, userType?: string | null): string[] {
  return Object.entries(MERCHANTS)
    .filter(([, entry]) => {
      if (entry.category !== category) return false;
      if (tier !== undefined && entry.tier !== tier) return false;
      if (userType && entry.forUserTypes && !entry.forUserTypes.includes(userType)) return false;
      return true;
    })
    .map(([name]) => name);
}

// Returns the merchant entry that best matches a normalizedMerchant string, or null.
// Uses the longest matching key to avoid short-name false positives.
// Short keys (≤4 chars) require a word boundary so "bp" doesn't match inside "ubp",
// "myob" doesn't match inside "myoband", etc. — mirrors the matchesMerchant() logic.
export function getMerchantInfo(normalizedMerchant: string): MerchantEntry | null {
  const lower = normalizedMerchant.toLowerCase();
  let bestKey: string | null = null;
  for (const key of Object.keys(MERCHANTS)) {
    const matched = key.length <= 4
      ? new RegExp(`(?:^|[^a-z0-9])${key}(?:[^a-z0-9]|$)`).test(lower)
      : lower.includes(key);
    if (matched && (bestKey === null || key.length > bestKey.length)) {
      bestKey = key;
    }
  }
  return bestKey ? MERCHANTS[bestKey] : null;
}

export const MERCHANTS: Record<string, MerchantEntry> = {

  // ── Office supplies & furniture ────────────────────────────────────────────
  // tier: "specialist" = dedicated office supply stores eligible for MEDIUM confidence
  // No tier = broad retailers; keyword alone gives LOW confidence
  "officeworks": {
    category:    CATEGORIES.OFFICE_SUPPLIES,
    tier:        "specialist",
    description: "Office supplies, stationery, printers, and tech accessories.",
  },
  "staples": {
    category:    CATEGORIES.OFFICE_SUPPLIES,
    tier:        "specialist",
    description: "Office supplies and stationery.",
  },
  "winc": {
    category:    CATEGORIES.OFFICE_SUPPLIES,
    tier:        "specialist",
    description: "Business office supplies and workplace products.",
  },
  "ergogroup": {
    category:    CATEGORIES.OFFICE_SUPPLIES,
    tier:        "specialist",
    description: "Ergonomic office furniture and accessories.",
  },
  "workspace commercial furniture": {
    category:    CATEGORIES.OFFICE_SUPPLIES,
    tier:        "specialist",
    description: "Commercial office desks, chairs, and fit-out products.",
  },
  "ikea": {
    category:      CATEGORIES.OFFICE_SUPPLIES,
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Furniture including desks, chairs, and shelving for home offices.",
  },
  "freedom furniture": {
    category:      CATEGORIES.OFFICE_SUPPLIES,
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Furniture including home office desks and chairs.",
  },
  "woolworths": {
    category:      CATEGORIES.OFFICE_SUPPLIES,
    forUserTypes:  ["sole_trader"],
    description:   "Supermarket. Mostly personal groceries. Small work consumables may qualify.",
  },
  "coles": {
    category:      CATEGORIES.OFFICE_SUPPLIES,
    forUserTypes:  ["sole_trader"],
    description:   "Supermarket. Mostly personal groceries. Small work consumables may qualify.",
  },

  // ── Hardware, tools & trade ────────────────────────────────────────────────
  "bunnings": {
    category:      CATEGORIES.EQUIPMENT,
    tier:          "general",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Hardware, tools, building materials, and home improvement products.",
  },
  "mitre 10": {
    category:      CATEGORIES.EQUIPMENT,
    tier:          "general",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Hardware and building supplies.",
  },
  "home hardware": {
    category:      CATEGORIES.EQUIPMENT,
    tier:          "general",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Hardware and building supplies.",
  },
  "hardings hardware": {
    category:      CATEGORIES.EQUIPMENT,
    tier:          "general",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Hardware and supplies.",
  },
  "total tools": {
    category:      CATEGORIES.EQUIPMENT,
    tier:          "trade_only",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Trade tools and equipment for professionals.",
  },
  "sydney tools": {
    category:      CATEGORIES.EQUIPMENT,
    tier:          "trade_only",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Trade tools and equipment for professionals.",
  },
  "tools warehouse": {
    category:      CATEGORIES.EQUIPMENT,
    tier:          "trade_only",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Power tools and hand tools for trade use.",
  },
  "tool kit depot": {
    category:      CATEGORIES.EQUIPMENT,
    tier:          "trade_only",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Trade tools and equipment.",
  },
  "blackwoods": {
    category:      CATEGORIES.EQUIPMENT,
    tier:          "trade_only",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Industrial and safety supplies for trade and business.",
  },

  // ── Consumer electronics & computers ──────────────────────────────────────
  "jb hi-fi": {
    category:    CATEGORIES.EQUIPMENT,
    tier:        "tech_retailer",
    description: "Consumer electronics, computers, and home entertainment.",
  },
  "harvey norman": {
    category:    CATEGORIES.EQUIPMENT,
    tier:        "tech_retailer",
    description: "Electronics, computers, furniture, and appliances.",
  },
  "the good guys": {
    category:    CATEGORIES.EQUIPMENT,
    tier:        "tech_retailer",
    description: "Consumer electronics and appliances.",
  },
  "bing lee": {
    category:    CATEGORIES.EQUIPMENT,
    tier:        "tech_retailer",
    description: "Electronics and home appliances.",
  },
  "apple": {
    category:    CATEGORIES.EQUIPMENT,
    tier:        "tech_retailer",
    description: "Computers, phones, tablets, and accessories.",
  },
  "dell": {
    category:    CATEGORIES.EQUIPMENT,
    tier:        "tech_retailer",
    description: "Laptops, desktops, monitors, and business IT equipment.",
  },
  "lenovo": {
    category:    CATEGORIES.EQUIPMENT,
    tier:        "tech_retailer",
    description: "Laptops, tablets, and business computers.",
  },
  "acer": {
    category:    CATEGORIES.EQUIPMENT,
    tier:        "tech_retailer",
    description: "Laptops, monitors, and computers.",
  },
  "hp": {
    category:    CATEGORIES.EQUIPMENT,
    tier:        "tech_retailer",
    description: "Computers, printers, and IT hardware.",
  },
  "samsung": {
    category:    CATEGORIES.EQUIPMENT,
    tier:        "tech_retailer",
    description: "Phones, tablets, monitors, and electronics.",
  },
  "logitech": {
    category:    CATEGORIES.EQUIPMENT,
    tier:        "tech_retailer",
    description: "Keyboards, mice, webcams, and peripherals.",
  },
  "kogan": {
    category:    CATEGORIES.EQUIPMENT,
    tier:        "tech_retailer",
    description: "Electronics, appliances, and accessories.",
  },
  "umart": {
    category:    CATEGORIES.EQUIPMENT,
    tier:        "tech_retailer",
    description: "PC components, computers, and tech accessories.",
  },
  "centre com": {
    category:    CATEGORIES.EQUIPMENT,
    tier:        "tech_retailer",
    description: "PC components and computer hardware.",
  },
  "mwave": {
    category:    CATEGORIES.EQUIPMENT,
    tier:        "tech_retailer",
    description: "Computer hardware and peripherals.",
  },
  "scorptec": {
    category:    CATEGORIES.EQUIPMENT,
    tier:        "tech_retailer",
    description: "PC components and computer hardware.",
  },
  "ple computers": {
    category:    CATEGORIES.EQUIPMENT,
    tier:        "tech_retailer",
    description: "Desktop PCs and computer components.",
  },
  "pccasegear": {
    category:    CATEGORIES.EQUIPMENT,
    tier:        "tech_retailer",
    description: "PC cases, components, and peripherals.",
  },

  // ── Software — specific (near-exclusively B2B, merchant alone is a reasonable signal) ──
  "google workspace": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Business productivity suite: Gmail, Drive, Docs, Meet.",
  },
  "notion": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Workspace and note-taking subscription.",
  },
  "slack": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Team messaging and collaboration platform.",
  },
  "figma": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Design and prototyping tool subscription.",
  },
  "atlassian": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Jira, Confluence, Trello — project management and team tools.",
  },
  "asana": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Project and task management platform.",
  },
  "hubspot": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "CRM, marketing, and sales platform.",
  },
  "salesforce": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Enterprise CRM and business platform.",
  },
  "xero": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Cloud accounting software. Popular with Australian small businesses.",
  },
  "myob": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Accounting and payroll software for Australian businesses.",
  },
  "quickbooks": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Accounting and invoicing software.",
  },
  "aws": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Amazon Web Services — cloud hosting and infrastructure.",
  },
  "amazon web services": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Cloud hosting, storage, and infrastructure.",
  },
  "google cloud": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Cloud computing and infrastructure services.",
  },
  "digitalocean": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Cloud hosting and infrastructure for developers.",
  },
  "cloudflare": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "DNS, CDN, and web security services.",
  },
  "mailchimp": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Email marketing and automation platform.",
  },
  "shopify": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "E-commerce platform for online stores.",
  },
  "loom": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Video recording and screen capture tool.",
  },
  "miro": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Online whiteboarding and collaboration tool.",
  },
  "monday.com": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Project management and workflow platform.",
  },
  "airtable": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Spreadsheet-database hybrid for organising work.",
  },
  "typeform": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Online forms, surveys, and data collection.",
  },
  "intercom": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Customer messaging and support platform.",
  },
  "zendesk": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Customer support and helpdesk software.",
  },
  "stripe": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Payment processing platform.",
  },
  "1password": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Password manager for individuals and teams.",
  },
  "lastpass": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Password management subscription.",
  },

  // ── Software — broad (significant personal-use overlap, require keyword) ──
  "adobe": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "broad",
    description: "Creative software: Photoshop, Illustrator, Acrobat, Premiere.",
  },
  "microsoft": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "broad",
    description: "Microsoft 365, Windows, Azure, and productivity tools.",
  },
  "dropbox": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "broad",
    description: "Cloud storage and file sharing.",
  },
  "zoom": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "broad",
    description: "Video conferencing platform.",
  },
  "canva": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "broad",
    description: "Graphic design platform with free and paid plans.",
  },
  "github": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "broad",
    description: "Code hosting and collaboration platform.",
  },
  "grammarly": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "broad",
    description: "AI writing assistant. Business plan required for work deduction.",
  },
  "linkedin": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "broad",
    description: "LinkedIn Premium — job search and professional networking subscription.",
  },

  // ── Phone & internet ───────────────────────────────────────────────────────
  "telstra": {
    category:    CATEGORIES.PHONE_INTERNET,
    description: "Australia's largest telco. Mobile, internet, and business plans.",
  },
  "optus": {
    category:    CATEGORIES.PHONE_INTERNET,
    description: "Mobile and internet provider.",
  },
  "vodafone": {
    category:    CATEGORIES.PHONE_INTERNET,
    description: "Mobile and broadband provider.",
  },
  "tpg": {
    category:    CATEGORIES.PHONE_INTERNET,
    description: "Internet and phone plans.",
  },
  "iinet": {
    category:    CATEGORIES.PHONE_INTERNET,
    description: "Broadband and phone provider.",
  },
  "internode": {
    category:    CATEGORIES.PHONE_INTERNET,
    description: "NBN and broadband provider.",
  },
  "aussie broadband": {
    category:    CATEGORIES.PHONE_INTERNET,
    description: "NBN and broadband provider.",
  },
  "dodo": {
    category:    CATEGORIES.PHONE_INTERNET,
    description: "Budget internet and mobile plans.",
  },
  "spintel": {
    category:    CATEGORIES.PHONE_INTERNET,
    description: "NBN and mobile plans.",
  },
  "amaysim": {
    category:    CATEGORIES.PHONE_INTERNET,
    description: "Mobile and SIM-only plans.",
  },
  "boost mobile": {
    category:    CATEGORIES.PHONE_INTERNET,
    description: "Prepaid and SIM-only mobile plans.",
  },
  "kogan mobile": {
    category:    CATEGORIES.PHONE_INTERNET,
    description: "Budget mobile plans.",
  },
  "exetel": {
    category:    CATEGORIES.PHONE_INTERNET,
    description: "NBN and mobile plans.",
  },
  "superloop": {
    category:    CATEGORIES.PHONE_INTERNET,
    description: "NBN broadband provider.",
  },
  "mate": {
    category:    CATEGORIES.PHONE_INTERNET,
    description: "NBN and mobile plans.",
  },
  "moose mobile": {
    category:    CATEGORIES.PHONE_INTERNET,
    description: "Budget SIM-only mobile plans.",
  },
  "circles.life": {
    category:    CATEGORIES.PHONE_INTERNET,
    description: "Digital mobile provider.",
  },

  // ── Work travel — flights ──────────────────────────────────────────────────
  "qantas": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "transport",
    description: "Domestic and international flights.",
  },
  "jetstar": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "transport",
    description: "Budget domestic and international flights.",
  },
  "virgin australia": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "transport",
    description: "Domestic and international flights.",
  },
  "rex airlines": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "transport",
    description: "Regional and domestic Australian flights.",
  },

  // ── Work travel — rideshare & taxis ────────────────────────────────────────
  "uber": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "transport",
    description: "Rideshare and taxi service.",
  },
  "ola": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "transport",
    description: "Rideshare service.",
  },
  "didi": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "transport",
    description: "Rideshare service.",
  },
  "13cabs": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "transport",
    description: "Taxi service.",
  },
  "ingogo": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "transport",
    description: "Taxi booking service.",
  },

  // ── Work travel — public transport ────────────────────────────────────────
  "opal": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "transport",
    description: "NSW public transport card (trains, buses, ferries, light rail).",
  },
  "myki": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "transport",
    description: "Victorian public transport card.",
  },
  "go card": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "transport",
    description: "Queensland public transport card.",
  },
  "metrocard": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "transport",
    description: "Adelaide Metro public transport card.",
  },
  "transperth": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "transport",
    description: "Perth public transport (buses, trains, ferries).",
  },
  "linkt": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "transport",
    description: "Toll road charges across Australian motorways.",
  },
  "airportlink": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "transport",
    description: "Airport rail link.",
  },

  // ── Work travel — car hire ─────────────────────────────────────────────────
  "avis": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "transport",
    description: "Car hire for business travel.",
  },
  "hertz": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "transport",
    description: "Car hire for business travel.",
  },
  "budget car rental": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "transport",
    description: "Car hire for business travel.",
  },
  "europcar": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "transport",
    description: "Car hire for business travel.",
  },
  "thrifty": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "transport",
    description: "Car hire for business travel.",
  },
  "goget": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "transport",
    description: "Car share service for short-term hire.",
  },

  // ── Work travel — accommodation ────────────────────────────────────────────
  "airbnb": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "accommodation",
    description: "Accommodation. Claimable when travel is for work purposes.",
  },
  "booking.com": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "accommodation",
    description: "Hotel and accommodation bookings for work travel.",
  },
  "hotels.com": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "accommodation",
    description: "Hotel bookings for work travel.",
  },

  // ── Fuel ──────────────────────────────────────────────────────────────────
  "shell": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "fuel",
    description: "Fuel stations. Work-related driving is partially deductible.",
  },
  "bp": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "fuel",
    description: "Fuel stations. Work-related driving is partially deductible.",
  },
  "caltex": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "fuel",
    description: "Fuel stations (rebranded Ampol). Work-related driving is partially deductible.",
  },
  "ampol": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "fuel",
    description: "Fuel stations. Work-related driving is partially deductible.",
  },
  "united petroleum": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "fuel",
    description: "Fuel stations. Work-related driving is partially deductible.",
  },
  "puma energy": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "fuel",
    description: "Fuel stations. Work-related driving is partially deductible.",
  },
  "7-eleven": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "convenience",
    description: "Convenience store and fuel. Only the fuel component is potentially deductible.",
  },

  // ── Work clothing ──────────────────────────────────────────────────────────
  "hard yakka": {
    category:    CATEGORIES.WORK_CLOTHING,
    description: "Workwear brand. Hi-vis, trade clothing, and safety gear.",
  },
  "king gee": {
    category:    CATEGORIES.WORK_CLOTHING,
    description: "Workwear brand. Trade clothing and protective gear.",
  },
  "bisley workwear": {
    category:    CATEGORIES.WORK_CLOTHING,
    description: "Workwear brand. Hi-vis, shirts, and protective clothing.",
  },
  "totally workwear": {
    category:    CATEGORIES.WORK_CLOTHING,
    description: "Specialist workwear retailer. Uniforms, PPE, and safety clothing.",
  },
  "safe-t-disposable": {
    category:    CATEGORIES.WORK_CLOTHING,
    description: "Disposable PPE and safety consumables.",
  },
  "safety world": {
    category:    CATEGORIES.WORK_CLOTHING,
    description: "Safety equipment, PPE, and workwear.",
  },
  "protector alsafe": {
    category:    CATEGORIES.WORK_CLOTHING,
    description: "Safety products and protective equipment for trade.",
  },

  // ── Professional development ───────────────────────────────────────────────
  "udemy": {
    category:    CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    description: "Online courses across tech, business, and creative fields.",
  },
  "coursera": {
    category:    CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    description: "University-level online courses and professional certificates.",
  },
  "linkedin learning": {
    category:    CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    description: "Professional skills courses in business, tech, and creative topics.",
  },
  "skillshare": {
    category:    CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    description: "Creative and professional skills courses.",
  },
  "pluralsight": {
    category:    CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    description: "Technology and developer skills platform.",
  },
  "a cloud guru": {
    category:    CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    description: "Cloud computing training and certification courses.",
  },
  "seek learning": {
    category:    CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    description: "Australian professional development courses and qualifications.",
  },
  "frontendmasters": {
    category:    CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    description: "Advanced web development training courses.",
  },
  "o'reilly": {
    category:    CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    description: "Technical books and online learning platform for developers.",
  },
  "cpa australia": {
    category:    CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    description: "CPA membership and professional development for accountants.",
  },
  "chartered accountants anz": {
    category:    CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    description: "CA ANZ membership and CPD for accountants.",
  },
  "australian institute of management": {
    category:    CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    description: "Business management and leadership courses.",
  },
  "tafe": {
    category:    CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    description: "Vocational training and qualification courses.",
  },
  "eventbrite": {
    category:    CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    description: "Event ticketing. May include work conferences, seminars, or industry events.",
  },
  "humanitix": {
    category:    CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    description: "Event ticketing. May include work conferences or professional events.",
  },
  "booktopia": {
    category:    CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    description: "Australian bookseller. Professional and technical books are deductible.",
  },
  "dymocks": {
    category:    CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    description: "Bookseller. Professional and technical books are deductible.",
  },
  "amazon": {
    category:    CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    description: "Online retailer. Professional books and work-related items may be deductible.",
  },
};
