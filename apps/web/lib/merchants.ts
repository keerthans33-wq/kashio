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
    category:    CATEGORIES.OFFICE_SUPPLIES,
    description: "Furniture including desks, chairs, and shelving for home offices.",
  },
  "aeron": {
    category:      CATEGORIES.OFFICE_SUPPLIES,
    tier:          "specialist",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Ergonomic office chairs.",
  },
  "herman miller": {
    category:      CATEGORIES.OFFICE_SUPPLIES,
    tier:          "specialist",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Ergonomic office chairs and furniture.",
  },
  "steelcase": {
    category:      CATEGORIES.OFFICE_SUPPLIES,
    tier:          "specialist",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Office furniture and ergonomic chairs.",
  },
  "jasonl": {
    category:      CATEGORIES.OFFICE_SUPPLIES,
    tier:          "specialist",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Office furniture including desks and chairs.",
  },

  // ── Home energy (home office running costs — contractor/sole trader only) ──
  // Electricity used for a home office is deductible under the actual method.
  // tier "utility" flags these for the energy-bill keyword gate in detectOfficeSupplies.
  "agl": {
    category:      CATEGORIES.OFFICE_SUPPLIES,
    tier:          "utility",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Electricity and gas provider.",
  },
  "origin energy": {
    category:      CATEGORIES.OFFICE_SUPPLIES,
    tier:          "utility",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Electricity and gas provider.",
  },
  "energyaustralia": {
    category:      CATEGORIES.OFFICE_SUPPLIES,
    tier:          "utility",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Electricity and gas provider.",
  },
  "simply energy": {
    category:      CATEGORIES.OFFICE_SUPPLIES,
    tier:          "utility",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Electricity provider.",
  },
  "alinta energy": {
    category:      CATEGORIES.OFFICE_SUPPLIES,
    tier:          "utility",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Electricity and gas provider.",
  },
  "synergy": {
    category:      CATEGORIES.OFFICE_SUPPLIES,
    tier:          "utility",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Western Australian electricity provider.",
  },
  "ergon energy": {
    category:      CATEGORIES.OFFICE_SUPPLIES,
    tier:          "utility",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Queensland electricity provider.",
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
  // forUserTypes removed: any user can have work-related hardware/tool purchases.
  // Keyword is still required by detectTools to reach MEDIUM/HIGH confidence.
  "bunnings": {
    category:    CATEGORIES.EQUIPMENT,
    tier:        "general",
    description: "Hardware, tools, building materials, and home improvement products.",
  },
  "mitre 10": {
    category:    CATEGORIES.EQUIPMENT,
    tier:        "general",
    description: "Hardware and building supplies.",
  },
  "home hardware": {
    category:    CATEGORIES.EQUIPMENT,
    tier:        "general",
    description: "Hardware and building supplies.",
  },
  "hardings hardware": {
    category:    CATEGORIES.EQUIPMENT,
    tier:        "general",
    description: "Hardware and supplies.",
  },
  "total tools": {
    category:    CATEGORIES.EQUIPMENT,
    tier:        "trade_only",
    description: "Trade tools and equipment for professionals.",
  },
  "sydney tools": {
    category:    CATEGORIES.EQUIPMENT,
    tier:        "trade_only",
    description: "Trade tools and equipment for professionals.",
  },
  "tools warehouse": {
    category:    CATEGORIES.EQUIPMENT,
    tier:        "trade_only",
    description: "Power tools and hand tools for trade use.",
  },
  "tool kit depot": {
    category:    CATEGORIES.EQUIPMENT,
    tier:        "trade_only",
    description: "Trade tools and equipment.",
  },
  "blackwoods": {
    category:    CATEGORIES.EQUIPMENT,
    tier:        "trade_only",
    description: "Industrial and safety supplies for trade and business.",
  },
  "repco": {
    category:    CATEGORIES.EQUIPMENT,
    tier:        "general",
    description: "Auto parts and accessories. Work vehicle maintenance may be deductible.",
  },
  "supercheap auto": {
    category:    CATEGORIES.EQUIPMENT,
    tier:        "general",
    description: "Auto parts and accessories for work vehicle maintenance.",
  },

  // ── Consumer electronics & computers ──────────────────────────────────────
  "jb hi-fi": {
    category:    CATEGORIES.EQUIPMENT,
    tier:        "tech_retailer",
    description: "Consumer electronics, computers, and home entertainment.",
  },
  "jb hifi": {
    category:    CATEGORIES.EQUIPMENT,
    tier:        "tech_retailer",
    description: "Consumer electronics, computers, and home entertainment.",
  },
  "jbhifi": {
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
  "jaycar": {
    category:    CATEGORIES.EQUIPMENT,
    tier:        "tech_retailer",
    description: "Electronics components, tools, and accessories.",
  },
  "altronics": {
    category:    CATEGORIES.EQUIPMENT,
    tier:        "tech_retailer",
    description: "Electronics components and tech accessories.",
  },
  "msy technology": {
    category:    CATEGORIES.EQUIPMENT,
    tier:        "tech_retailer",
    description: "Computer hardware, laptops, and components.",
  },
  "ted's cameras": {
    category:    CATEGORIES.EQUIPMENT,
    tier:        "tech_retailer",
    description: "Cameras, lenses, and photography equipment.",
  },
  "camera house": {
    category:    CATEGORIES.EQUIPMENT,
    tier:        "tech_retailer",
    description: "Cameras and photography accessories.",
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
  "google": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "broad",
    description: "Google services: Workspace, Cloud, Ads, and productivity tools.",
  },
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
  "linkedin premium": {
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
  "belong": {
    category:    CATEGORIES.PHONE_INTERNET,
    description: "NBN and mobile plans (Telstra wholesale).",
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

  // ── Meals — food delivery ──────────────────────────────────────────────────
  // Uber Eats is food delivery, not rideshare — must not be Work Travel.
  // adjustConfidence suppresses this for employees (MEALS + employee → null).
  "uber eats": {
    category:    CATEGORIES.MEALS,
    description: "Food delivery service.",
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
  "mobil": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "fuel",
    description: "Fuel stations. Work-related driving is partially deductible.",
  },
  "liberty": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "fuel",
    description: "Independent fuel stations. Work-related driving is partially deductible.",
  },
  "7-eleven": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "convenience",
    description: "Convenience store and fuel. Only the fuel component is potentially deductible.",
  },

  // ── Parking ───────────────────────────────────────────────────────────────
  "wilson parking": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "parking",
    description: "Parking stations. Work-related parking may be deductible — not daily commute parking.",
  },
  "secure parking": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "parking",
    description: "Parking stations. Work-related parking may be deductible — not daily commute parking.",
  },
  "cpp parking": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "parking",
    description: "Parking stations (Care Park). Work-related parking may be deductible.",
  },
  "city of perth parking": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "parking",
    description: "City of Perth council parking. Work-related parking may be deductible.",
  },
  "easypark": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "parking",
    description: "Parking payment app. Work-related parking may be deductible.",
  },
  "paystay": {
    category:    CATEGORIES.WORK_TRAVEL,
    tier:        "parking",
    description: "Parking payment app. Work-related parking may be deductible.",
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

  // ── General retailers (mixed-use — always surfaced at LOW for review) ───────
  "kmart": {
    category:    CATEGORIES.OFFICE_SUPPLIES,
    description: "General merchandise retailer. Work-related office, stationery, or equipment purchases may qualify.",
  },
  "target": {
    category:    CATEGORIES.OFFICE_SUPPLIES,
    description: "General merchandise retailer. Work-related purchases may qualify.",
  },
  "big w": {
    category:    CATEGORIES.OFFICE_SUPPLIES,
    description: "General merchandise retailer. Work-related purchases may qualify.",
  },

  // ── Workwear specialists ──────────────────────────────────────────────────
  "workwearhub": {
    category:    CATEGORIES.WORK_CLOTHING,
    description: "Online workwear retailer. Hi-vis, safety clothing, and uniforms.",
  },
  "scrubs australia": {
    category:    CATEGORIES.WORK_CLOTHING,
    description: "Medical and healthcare workwear.",
  },
  "chemist warehouse": {
    category:    CATEGORIES.WORK_CLOTHING,
    description: "Pharmacy and health products. Safety or medical workwear may be deductible for eligible workers.",
  },

  // ── AI tools (software subscriptions) ────────────────────────────────────
  "chatgpt": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "AI assistant. Paid plans used for work tasks such as writing, research, or coding are potentially deductible.",
  },
  "openai": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "AI platform. API and subscription charges used for work or business are potentially deductible.",
  },
  "claude": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "AI assistant by Anthropic. Paid plans used for work tasks are potentially deductible.",
  },
  "anthropic": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "AI platform. API charges used for work or business development are potentially deductible.",
  },

  // ── Online advertising ────────────────────────────────────────────────────
  "google ads": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Google Ads online advertising platform. Ad spend and account fees are a deductible business expense.",
  },
  "meta ads": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Meta (Facebook/Instagram) advertising platform. Ad spend is a deductible business expense.",
  },
  "facebook ads": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Facebook advertising. Ad spend and management fees are deductible business expenses.",
  },
  "linkedin ads": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "LinkedIn advertising platform. Ad spend is a deductible business expense.",
  },
  "tiktok ads": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "TikTok advertising platform. Ad spend is a deductible business expense.",
  },

  // ── SEO & marketing tools ─────────────────────────────────────────────────
  "semrush": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "SEO and digital marketing platform. Subscription is a deductible business tool expense.",
  },
  "ahrefs": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "SEO toolset. Subscription is a deductible business tool expense.",
  },
  "klaviyo": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Email marketing and automation platform. Subscription is a deductible business expense.",
  },
  "gohighlevel": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "CRM and marketing automation platform. Subscription is a deductible business expense.",
  },

  // ── Hosting & infrastructure ───────────────────────────────────────────────
  "vercel": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Web hosting and deployment platform. Subscription is a deductible business expense.",
  },
  "supabase": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Backend-as-a-service platform. Subscription is a deductible business expense.",
  },

  // ── Domain registration ────────────────────────────────────────────────────
  "crazy domains": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Domain registration and hosting. Business domain costs are a deductible expense.",
  },
  "godaddy": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Domain registration and hosting. Business domain costs are a deductible expense.",
  },
  "domain.com.au": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Australian domain registration. Business domain costs are a deductible expense.",
  },
  "namecheap": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Domain registration and hosting. Business domain costs are a deductible expense.",
  },

  // ── Payment processing ─────────────────────────────────────────────────────
  "square": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Payment processing for small businesses. Transaction fees and subscription are deductible.",
  },

  // ── Professional memberships ───────────────────────────────────────────────
  "engineers australia": {
    category:    CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    description: "Professional engineering membership and CPD. Annual fees are a deductible professional expense.",
  },
  "tax institute": {
    category:    CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    description: "Tax Institute of Australia membership and CPD. Annual fees are a deductible professional expense.",
  },
  "ausimm": {
    category:    CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    description: "AusIMM (Australasian Institute of Mining and Metallurgy) membership and events.",
  },
  "aicd": {
    category:    CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    description: "Australian Institute of Company Directors membership and director courses.",
  },
  "general assembly": {
    category:    CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    description: "Tech and business skills bootcamps and workshops.",
  },
  "domestika": {
    category:    CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    description: "Online creative and professional skills courses.",
  },
  "masterclass": {
    category:    CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    description: "Online courses taught by industry experts. Work-related topics are potentially deductible.",
  },
  "edx": {
    category:    CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    description: "University-level online courses and professional certificates.",
  },
  "rmit": {
    category:    CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    description: "RMIT University short courses, programs, and professional development.",
  },

  // ── Advertising platforms ──────────────────────────────────────────────────
  "x ads": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "X (formerly Twitter) advertising platform. Ad spend is a deductible business expense.",
  },
  "twitter ads": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Twitter/X advertising platform. Ad spend is a deductible business expense.",
  },
  "youtube ads": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "YouTube advertising platform. Ad spend is a deductible business expense.",
  },
  "pinterest ads": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Pinterest advertising platform. Ad spend is a deductible business expense.",
  },
  "snapchat ads": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Snapchat advertising platform. Ad spend is a deductible business expense.",
  },
  "reddit ads": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Reddit advertising platform. Ad spend is a deductible business expense.",
  },
  "bing ads": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Microsoft/Bing advertising platform. Ad spend is a deductible business expense.",
  },
  "microsoft ads": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Microsoft Advertising (Bing Ads). Ad spend is a deductible business expense.",
  },

  // ── SEO / content tools ────────────────────────────────────────────────────
  "moz": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "SEO software for keyword research and link building.",
  },
  "ubersuggest": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "SEO and content planning tool.",
  },
  "screaming frog": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "SEO website crawler and audit tool.",
  },
  "surfer": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Surfer SEO — AI-powered content optimisation platform.",
  },
  "jasper": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    description:   "AI writing assistant for marketing and content creation.",
  },
  "copy ai": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    description:   "AI copywriting and content generation tool.",
  },
  "marketmuse": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "AI content strategy and SEO platform.",
  },

  // ── Analytics / tracking ───────────────────────────────────────────────────
  "google analytics": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Google Analytics — website traffic and user behaviour analytics.",
  },
  "hotjar": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Website heatmaps and user session recording.",
  },
  "mixpanel": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    description:   "Product analytics and user behaviour tracking platform.",
  },
  "amplitude": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    description:   "Digital analytics platform for product and growth teams.",
  },
  "segment": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    description:   "Customer data platform and analytics pipeline.",
  },
  "posthog": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    description:   "Open-source product analytics, session replay, and A/B testing.",
  },
  "fullstory": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    description:   "Digital experience analytics and session recording.",
  },
  "microsoft clarity": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    description:   "Microsoft Clarity — free website heatmap and session recording tool.",
  },

  // ── Email / CRM / automation ───────────────────────────────────────────────
  "activecampaign": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Email marketing and CRM automation platform.",
  },
  "zoho": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Zoho suite — CRM, accounting, and business productivity tools.",
  },
  "pipedrive": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "CRM and sales pipeline management software.",
  },
  "calendly": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    description:   "Scheduling and appointment booking platform.",
  },
  "jotform": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    description:   "Online form builder and data collection platform.",
  },
  "zapier": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    description:   "Workflow automation platform — connects apps and automates tasks.",
  },
  "make": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    description:   "Make (formerly Integromat) — visual workflow automation platform.",
  },
  "convertkit": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Email marketing platform for creators and small businesses.",
  },
  "brevo": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Brevo (formerly Sendinblue) — email marketing and CRM platform.",
  },
  "constant contact": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Email marketing and digital marketing platform.",
  },

  // ── Accounting / bookkeeping ───────────────────────────────────────────────
  "reckon": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Accounting software for small businesses and bookkeepers.",
  },
  "freshbooks": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Invoicing, accounting, and expense tracking for small businesses.",
  },
  "wave": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Wave — free invoicing and accounting software for small businesses.",
  },
  "invoice2go": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Mobile invoicing and business management app.",
  },
  "rounded": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Rounded — invoicing and tax tracking for Australian freelancers.",
  },
  "hnry": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Hnry — automated tax and invoicing service for contractors.",
  },

  // ── Payment processing ─────────────────────────────────────────────────────
  "tyro": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Tyro — Australian EFTPOS and payment terminal for businesses.",
  },
  "airwallex": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Airwallex — global payments, FX, and business accounts.",
  },
  "wise": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Wise — international business transfers and multi-currency accounts.",
  },

  // ── Website / app builders ─────────────────────────────────────────────────
  "wix": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Wix — website builder for small businesses.",
  },
  "squarespace": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Squarespace — website builder and e-commerce platform.",
  },
  "wordpress": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "WordPress.com hosting and website subscription.",
  },
  "webflow": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    description:   "Webflow — no-code website design and CMS platform.",
  },

  // ── Hosting / infrastructure ───────────────────────────────────────────────
  "netlify": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    description:   "Netlify — web hosting and deployment platform.",
  },
  "hostinger": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Hostinger — web hosting and domain services.",
  },
  "hostgator": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "HostGator — web hosting for small businesses.",
  },
  "bluehost": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "Bluehost — web hosting for small businesses.",
  },
  "siteground": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "SiteGround — web hosting and managed WordPress hosting.",
  },
  "firebase": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    description:   "Firebase — Google's backend-as-a-service for app development.",
  },
  "render": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    description:   "Render — cloud platform for deploying web services.",
  },
  "railway": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    description:   "Railway — infrastructure platform for developers.",
  },
  "heroku": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    description:   "Heroku — cloud platform for deploying and running apps.",
  },
  "microsoft azure": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    description:   "Microsoft Azure — cloud computing and infrastructure services.",
  },
  "dnsimple": {
    category:      CATEGORIES.SOFTWARE,
    tier:          "specific",
    forUserTypes:  ["contractor", "sole_trader"],
    description:   "DNSimple — domain management and DNS hosting.",
  },

  // ── AI / creative / design tools ──────────────────────────────────────────
  "midjourney": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Midjourney — AI image generation tool. Used for design and creative work.",
  },
  "envato": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Envato — creative asset marketplace (themes, templates, stock).",
  },
  "runway": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Runway — AI video generation and editing platform.",
  },
  "elevenlabs": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "ElevenLabs — AI voice generation and text-to-speech platform.",
  },
  "descript": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Descript — AI-powered audio and video editing platform.",
  },
  "veed": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Veed.io — online video editing and production platform.",
  },
  "perplexity": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Perplexity AI — AI-powered research and search assistant.",
  },
  "epidemic sound": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Epidemic Sound — royalty-free music subscription for creators.",
  },
  "artlist": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Artlist — royalty-free music and SFX subscription for video creators.",
  },
  "motion array": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Motion Array — video templates, transitions, and stock footage.",
  },
  "freepik": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Freepik — stock photos, vectors, and design assets.",
  },
  "shutterstock": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Shutterstock — stock photography and video licensing.",
  },
  "istock": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "iStockphoto — stock photography and video by Getty Images.",
  },

  // ── Developer / team tools ─────────────────────────────────────────────────
  "gitlab": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "GitLab — DevOps platform for code hosting and CI/CD.",
  },
  "bitbucket": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Bitbucket — code hosting and collaboration platform by Atlassian.",
  },
  "lucidchart": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description: "Lucidchart — visual collaboration and diagramming platform.",
  },
  "docusign": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "specific",
    description:   "DocuSign — electronic signature and contract management platform.",
  },
  "nordvpn": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "broad",
    description: "NordVPN — virtual private network service. Work use may be deductible.",
  },
  "expressvpn": {
    category:    CATEGORIES.SOFTWARE,
    tier:        "broad",
    description: "ExpressVPN — virtual private network service. Work use may be deductible.",
  },

  // ── Workwear / PPE specialists ─────────────────────────────────────────────
  "rsea safety": {
    category:    CATEGORIES.WORK_CLOTHING,
    description: "RSEA Safety — PPE, safety workwear, and equipment for Australian workplaces.",
  },
  "kinggee": {
    category:    CATEGORIES.WORK_CLOTHING,
    description: "KingGee — trade workwear brand. Pants, shirts, and protective clothing.",
  },
  "steel blue": {
    category:    CATEGORIES.WORK_CLOTHING,
    description: "Steel Blue — Australian safety boot brand.",
  },
  "mongrel boots": {
    category:    CATEGORIES.WORK_CLOTHING,
    description: "Mongrel Boots — safety and work boots.",
  },
  "redback boots": {
    category:    CATEGORIES.WORK_CLOTHING,
    description: "Redback Boots — Australian safety and work boots.",
  },
  "puma safety": {
    category:    CATEGORIES.WORK_CLOTHING,
    description: "Puma Safety — safety footwear for industrial and trade workers.",
  },

};

