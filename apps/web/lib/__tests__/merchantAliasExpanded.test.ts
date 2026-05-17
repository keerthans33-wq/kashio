// Tests for PART 2 merchant alias expansion — modern SaaS, AI, dev tools,
// app builders, and creator tools added to ALIAS_MAP and FUZZY_ALIAS_GROUPS.
//
// Each test uses the same tx() helper as merchantMatcher.test.ts so the full
// pipeline (normalizeMerchant → detectDeduction) is exercised end-to-end.

import { describe, it, expect } from "vitest";
import { detectDeduction } from "../rules";
import { normalizeMerchant } from "../normalizeMerchant";
import { findMerchantAliasMatch, FUZZY_ALIAS_GROUPS } from "../rules/merchantMatcher";

// Mirrors the pipeline helper from merchantMatcher.test.ts.
function tx(rawDescription: string, amount = -50) {
  return {
    description:        rawDescription,
    normalizedMerchant: normalizeMerchant(rawDescription),
    amount,
  };
}

// ─── AI / coding / startup tools ─────────────────────────────────────────────

describe("detectDeduction — AI / coding / startup tools", () => {

  it("Cursor AI → Software & Subscriptions", () => {
    const result = detectDeduction(tx("CURSOR AI"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
    expect(result?.confidence).toBe("HIGH"); // contractor gets +1 lift
  });

  it("STRIPE*CURSOR → Software & Subscriptions (Cursor wins over Stripe via fuzzy)", () => {
    const result = detectDeduction(tx("STRIPE*CURSOR"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Replit → Software & Subscriptions", () => {
    const result = detectDeduction(tx("REPLIT"), "sole_trader");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("REPLIT INC → Software & Subscriptions (INC stripped by LOCATION_SLUG)", () => {
    const result = detectDeduction(tx("REPLIT INC"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("STRIPE*REPLIT → Software & Subscriptions (Replit wins over Stripe via fuzzy)", () => {
    const result = detectDeduction(tx("STRIPE*REPLIT"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Lovable.dev → Software & Subscriptions", () => {
    const result = detectDeduction(tx("LOVABLE.DEV"), "sole_trader");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("LOVABLE DEV → Software & Subscriptions (DEV stripped by LOCATION_SLUG)", () => {
    const result = detectDeduction(tx("LOVABLE DEV"), "employee");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("STRIPE*LOVABLE → Software & Subscriptions (Lovable wins over Stripe via fuzzy)", () => {
    const result = detectDeduction(tx("STRIPE*LOVABLE"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Bolt.new → Software & Subscriptions", () => {
    const result = detectDeduction(tx("BOLT.NEW"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("BOLT NEW → Software & Subscriptions", () => {
    const result = detectDeduction(tx("BOLT NEW"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("STRIPE*BOLT → Software & Subscriptions (Bolt wins over Stripe via fuzzy)", () => {
    const result = detectDeduction(tx("STRIPE*BOLT"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Vercel-v0*AI → Website & Domains (existing regression — must not be broken)", () => {
    const result = detectDeduction(tx("VERCEL-V0*AI"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Website & Domains");
  });

  it("Windsurf → Software & Subscriptions", () => {
    const result = detectDeduction(tx("WINDSURF"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("WINDSURF INC → Software & Subscriptions (INC stripped)", () => {
    const result = detectDeduction(tx("WINDSURF INC"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("STRIPE*WINDSURF → Software & Subscriptions (Windsurf wins via fuzzy)", () => {
    const result = detectDeduction(tx("STRIPE*WINDSURF"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Perplexity AI → Software & Subscriptions", () => {
    const result = detectDeduction(tx("PERPLEXITY AI"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Perplexity (normalizeMerchant) → Software & Subscriptions", () => {
    // normalizeMerchant already resolves PERPLEXITY → "Perplexity"
    const result = detectDeduction(tx("PERPLEXITY SUBSCRIPTION"), "employee");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Tabnine → Software & Subscriptions", () => {
    const result = detectDeduction(tx("TABNINE PRO"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("GitHub Copilot → Software & Subscriptions", () => {
    const result = detectDeduction(tx("GITHUB COPILOT"), "employee");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Groq → Software & Subscriptions", () => {
    const result = detectDeduction(tx("GROQ"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Replicate → Software & Subscriptions", () => {
    const result = detectDeduction(tx("REPLICATE"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Mistral AI → Software & Subscriptions", () => {
    const result = detectDeduction(tx("MISTRAL AI"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Stability AI → Software & Subscriptions", () => {
    const result = detectDeduction(tx("STABILITY AI"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Hugging Face → Software & Subscriptions", () => {
    const result = detectDeduction(tx("HUGGING FACE"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Stackblitz → Software & Subscriptions", () => {
    const result = detectDeduction(tx("STACKBLITZ"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });
});

// ─── AI video / voice / image ─────────────────────────────────────────────────

describe("detectDeduction — AI video / voice / image tools", () => {

  it("Pika Labs → Software & Subscriptions (LABS stripped by LOCATION_SLUG)", () => {
    const result = detectDeduction(tx("PIKA LABS"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("STRIPE*PIKA → Software & Subscriptions (Pika wins over Stripe via fuzzy)", () => {
    const result = detectDeduction(tx("STRIPE*PIKA"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Synthesia → Software & Subscriptions", () => {
    const result = detectDeduction(tx("SYNTHESIA"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("STRIPE*SYNTHESIA → Software & Subscriptions (Synthesia wins over Stripe via fuzzy)", () => {
    const result = detectDeduction(tx("STRIPE*SYNTHESIA"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("HeyGen → Software & Subscriptions", () => {
    const result = detectDeduction(tx("HEYGEN"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("HEYGEN INC → Software & Subscriptions (INC stripped by LOCATION_SLUG)", () => {
    const result = detectDeduction(tx("HEYGEN INC"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("STRIPE*HEYGEN → Software & Subscriptions (HeyGen wins over Stripe via fuzzy)", () => {
    const result = detectDeduction(tx("STRIPE*HEYGEN"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Runway ML → Software & Subscriptions", () => {
    const result = detectDeduction(tx("RUNWAYML"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("ElevenLabs → Software & Subscriptions", () => {
    // normalizeMerchant resolves ELEVENLABS → "ElevenLabs"; ALIAS_MAP catches it.
    const result = detectDeduction(tx("ELEVENLABS"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("ELEVENLABS INC → Software & Subscriptions (INC stripped)", () => {
    const result = detectDeduction(tx("ELEVENLABS INC"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Descript → Software & Subscriptions", () => {
    const result = detectDeduction(tx("DESCRIPT"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("CapCut → Software & Subscriptions", () => {
    const result = detectDeduction(tx("CAPCUT"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Midjourney → Software & Subscriptions", () => {
    // normalizeMerchant resolves MIDJOURNEY → "Midjourney"; ALIAS_MAP catches it.
    const result = detectDeduction(tx("MIDJOURNEY"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Suno → Software & Subscriptions", () => {
    const result = detectDeduction(tx("SUNO"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Udio → Software & Subscriptions", () => {
    const result = detectDeduction(tx("UDIO"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Higgsfield → Software & Subscriptions", () => {
    const result = detectDeduction(tx("HIGGSFIELD"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });
});

// ─── Developer / monitoring / infra ──────────────────────────────────────────

describe("detectDeduction — developer / monitoring / infra tools", () => {

  it("Sentry.io → Software & Subscriptions", () => {
    const result = detectDeduction(tx("SENTRY.IO"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("STRIPE*SENTRY → Software & Subscriptions (Sentry wins over Stripe via fuzzy)", () => {
    const result = detectDeduction(tx("STRIPE*SENTRY"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Datadog → Software & Subscriptions", () => {
    const result = detectDeduction(tx("DATADOG"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("DATADOG INC → Software & Subscriptions (INC stripped)", () => {
    const result = detectDeduction(tx("DATADOG INC"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Linear → Software & Subscriptions", () => {
    const result = detectDeduction(tx("LINEAR"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("STRIPE*LINEAR → Software & Subscriptions (Linear wins over Stripe via fuzzy)", () => {
    const result = detectDeduction(tx("STRIPE*LINEAR"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Resend → Software & Subscriptions", () => {
    const result = detectDeduction(tx("RESEND"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("STRIPE*RESEND → Software & Subscriptions (Resend wins over Stripe via fuzzy)", () => {
    const result = detectDeduction(tx("STRIPE*RESEND"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Clerk → Software & Subscriptions", () => {
    const result = detectDeduction(tx("CLERK"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("STRIPE*CLERK → Software & Subscriptions (Clerk wins over Stripe via fuzzy)", () => {
    const result = detectDeduction(tx("STRIPE*CLERK"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Twilio → Software & Subscriptions", () => {
    const result = detectDeduction(tx("TWILIO"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("TWILIO INC → Software & Subscriptions (INC stripped)", () => {
    const result = detectDeduction(tx("TWILIO INC"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Mailgun → Software & Subscriptions", () => {
    const result = detectDeduction(tx("MAILGUN"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("STRIPE*MAILGUN → Software & Subscriptions (Mailgun wins over Stripe via fuzzy)", () => {
    const result = detectDeduction(tx("STRIPE*MAILGUN"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("GitLab → Software & Subscriptions", () => {
    const result = detectDeduction(tx("GITLAB"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Supabase → Software & Subscriptions", () => {
    const result = detectDeduction(tx("SUPABASE"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Cloudflare → Software & Subscriptions", () => {
    const result = detectDeduction(tx("CLOUDFLARE"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("AWS → Software & Subscriptions", () => {
    const result = detectDeduction(tx("AWS"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("AWS AMAZON WEB SERVICES → Software & Subscriptions (normalized to AWS)", () => {
    // normalizeMerchant already resolves "AWS AMAZON WEB SERVICES" → "AWS"
    const result = detectDeduction(tx("AWS AMAZON WEB SERVICES"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Google Cloud → Software & Subscriptions", () => {
    // normalizeMerchant already resolves GOOGLE*CLOUD → "Google Cloud"
    const result = detectDeduction(tx("GOOGLE*CLOUD PLATFORM"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Microsoft Azure → Software & Subscriptions", () => {
    // Covered by existing FUZZY_ALIAS_GROUPS; also now in ALIAS_MAP.
    const result = detectDeduction(tx("MSFT*AZURE"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Docker → Software & Subscriptions", () => {
    const result = detectDeduction(tx("DOCKER"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Jira → Software & Subscriptions", () => {
    const result = detectDeduction(tx("JIRA"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("MongoDB → Software & Subscriptions", () => {
    const result = detectDeduction(tx("MONGODB"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Redis → Software & Subscriptions", () => {
    const result = detectDeduction(tx("REDIS"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Upstash → Software & Subscriptions", () => {
    const result = detectDeduction(tx("UPSTASH"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Firebase → Software & Subscriptions", () => {
    const result = detectDeduction(tx("FIREBASE"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });
});

// ─── Website / ecommerce / no-code builders ───────────────────────────────────

describe("detectDeduction — website / ecommerce / no-code builders", () => {

  it("Shopify*Billing → Website & Domains (*BILLING stripped by TERMINAL_CODE → Shopify)", () => {
    const result = detectDeduction(tx("SHOPIFY*BILLING"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Website & Domains");
  });

  it("SHOPIFY BILLING → Website & Domains (BILLING stripped by LOCATION_SLUG → Shopify)", () => {
    const result = detectDeduction(tx("SHOPIFY BILLING"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Website & Domains");
  });

  it("Framer → Website & Domains", () => {
    const result = detectDeduction(tx("FRAMER"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Website & Domains");
  });

  it("FRAMER INC → Website & Domains (INC stripped)", () => {
    const result = detectDeduction(tx("FRAMER INC"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Website & Domains");
  });

  it("STRIPE*FRAMER → Website & Domains (Framer wins over Stripe via fuzzy)", () => {
    const result = detectDeduction(tx("STRIPE*FRAMER"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Website & Domains");
  });

  it("Carrd → Website & Domains", () => {
    const result = detectDeduction(tx("CARRD"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Website & Domains");
  });

  it("Webflow → Website & Domains", () => {
    const result = detectDeduction(tx("WEBFLOW"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Website & Domains");
  });

  it("WordPress → Website & Domains", () => {
    const result = detectDeduction(tx("WORDPRESS COM"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Website & Domains");
  });

  it("Bubble → Website & Domains", () => {
    const result = detectDeduction(tx("BUBBLE"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Website & Domains");
  });

  it("LemonSqueezy → Website & Domains", () => {
    const result = detectDeduction(tx("LEMONSQUEEZY"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Website & Domains");
  });

  it("Gumroad → Website & Domains", () => {
    const result = detectDeduction(tx("GUMROAD"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Website & Domains");
  });

  it("Paddle → Payment Processing", () => {
    const result = detectDeduction(tx("PADDLE"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Payment Processing");
  });
});

// ─── Design / assets / content ────────────────────────────────────────────────

describe("detectDeduction — design / assets / content tools", () => {

  it("Canva → Software & Subscriptions", () => {
    const result = detectDeduction(tx("CANVA"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Envato Elements → Software & Subscriptions", () => {
    const result = detectDeduction(tx("ENVATO ELEMENTS"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Envato → Software & Subscriptions", () => {
    // normalizeMerchant resolves ENVATO PTY → "Envato"
    const result = detectDeduction(tx("ENVATO PTY"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Shutterstock → Software & Subscriptions", () => {
    const result = detectDeduction(tx("SHUTTERSTOCK"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Epidemic Sound → Software & Subscriptions", () => {
    const result = detectDeduction(tx("EPIDEMIC SOUND"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Artlist → Software & Subscriptions", () => {
    const result = detectDeduction(tx("ARTLIST"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Motion Array → Software & Subscriptions", () => {
    const result = detectDeduction(tx("MOTION ARRAY"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Creative Market → Software & Subscriptions", () => {
    const result = detectDeduction(tx("CREATIVE MARKET"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });
});

// ─── Business productivity / communication ────────────────────────────────────

describe("detectDeduction — business productivity / communication tools", () => {

  it("Slack → Software & Subscriptions", () => {
    const result = detectDeduction(tx("SLACK"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Zoom → Software & Subscriptions", () => {
    const result = detectDeduction(tx("ZOOM"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Google Workspace → Software & Subscriptions", () => {
    // normalizeMerchant resolves GOOGLE*WORKSPACE → "Google Workspace"
    const result = detectDeduction(tx("GOOGLE*WORKSPACE"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Microsoft 365 → Software & Subscriptions", () => {
    // normalizeMerchant resolves MSFT*365 → "Microsoft 365"
    const result = detectDeduction(tx("MSFT*365"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Loom → Software & Subscriptions", () => {
    // normalizeMerchant resolves LOOM INC → "Loom"; ALIAS_MAP catches "loom".
    const result = detectDeduction(tx("LOOM INC"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Miro → Software & Subscriptions", () => {
    const result = detectDeduction(tx("MIRO"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Calendly → Software & Subscriptions", () => {
    const result = detectDeduction(tx("CALENDLY"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Zapier → Software & Subscriptions", () => {
    // normalizeMerchant resolves ZAPIER INC → "Zapier"; ALIAS_MAP catches "zapier".
    const result = detectDeduction(tx("ZAPIER INC"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Airtable → Software & Subscriptions", () => {
    const result = detectDeduction(tx("AIRTABLE"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("DocuSign → Software & Subscriptions", () => {
    const result = detectDeduction(tx("DOCUSIGN"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Typeform → Software & Subscriptions", () => {
    const result = detectDeduction(tx("TYPEFORM"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("NordVPN → Software & Subscriptions", () => {
    const result = detectDeduction(tx("NORDVPN"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("1Password → Software & Subscriptions", () => {
    const result = detectDeduction(tx("1PASSWORD"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Make (automation) → Software & Subscriptions", () => {
    const result = detectDeduction(tx("MAKE"), "contractor");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });
});

// ─── Confidence lift: contractors get HIGH (MEDIUM + adjustment) ──────────────

describe("detectDeduction — contractor HIGH confidence lift for new aliases", () => {

  it("Cursor AI contractor → HIGH confidence", () => {
    const result = detectDeduction(tx("CURSOR AI"), "contractor");
    expect(result?.confidence).toBe("HIGH");
  });

  it("Sentry.io contractor → HIGH confidence", () => {
    const result = detectDeduction(tx("SENTRY.IO"), "contractor");
    expect(result?.confidence).toBe("HIGH");
  });

  it("Linear contractor → HIGH confidence", () => {
    const result = detectDeduction(tx("LINEAR"), "contractor");
    expect(result?.confidence).toBe("HIGH");
  });

  it("Framer contractor → HIGH confidence", () => {
    const result = detectDeduction(tx("FRAMER"), "contractor");
    expect(result?.confidence).toBe("HIGH");
  });

  it("Shopify*Billing contractor → HIGH confidence", () => {
    const result = detectDeduction(tx("SHOPIFY*BILLING"), "contractor");
    expect(result?.confidence).toBe("HIGH");
  });

  it("Pika Labs employee → MEDIUM confidence (no user-type lift)", () => {
    const result = detectDeduction(tx("PIKA LABS"), "employee");
    expect(result?.confidence).toBe("MEDIUM");
  });
});

// ─── All user types regression ────────────────────────────────────────────────

describe("detectDeduction — new aliases fire for all user types", () => {

  it("Cursor fires for employee", () => {
    const result = detectDeduction(tx("CURSOR AI"), "employee");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Resend fires for employee", () => {
    const result = detectDeduction(tx("RESEND"), "employee");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Framer fires for sole_trader", () => {
    const result = detectDeduction(tx("FRAMER"), "sole_trader");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Website & Domains");
  });

  it("HeyGen fires for sole_trader", () => {
    const result = detectDeduction(tx("HEYGEN"), "sole_trader");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Twilio fires for employee", () => {
    const result = detectDeduction(tx("TWILIO"), "employee");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Mailgun fires for employee", () => {
    const result = detectDeduction(tx("MAILGUN"), "employee");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Datadog fires for employee", () => {
    const result = detectDeduction(tx("DATADOG"), "employee");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Software & Subscriptions");
  });

  it("Carrd fires for employee", () => {
    const result = detectDeduction(tx("CARRD"), "employee");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("Website & Domains");
  });
});

// ─── findMerchantAliasMatch unit tests for new FUZZY_ALIAS_GROUPS ─────────────

describe("findMerchantAliasMatch — new fuzzy groups", () => {

  it("matches Cursor in STRIPE*CURSOR", () => {
    const result = findMerchantAliasMatch("STRIPE*CURSOR", FUZZY_ALIAS_GROUPS);
    expect(result).not.toBeNull();
    expect(result?.name).toBe("Cursor");
    expect(result?.matchSource).toBe("merchant_alias_fuzzy");
  });

  it("matches Replit in STRIPE*REPLIT", () => {
    const result = findMerchantAliasMatch("STRIPE*REPLIT", FUZZY_ALIAS_GROUPS);
    expect(result?.name).toBe("Replit");
  });

  it("matches Pika in PIKA LABS (LABS is a noise suffix)", () => {
    const result = findMerchantAliasMatch("PIKA LABS", FUZZY_ALIAS_GROUPS);
    expect(result?.name).toBe("Pika");
  });

  it("matches ElevenLabs in ELEVENLABS INC", () => {
    const result = findMerchantAliasMatch("ELEVENLABS INC", FUZZY_ALIAS_GROUPS);
    expect(result?.name).toBe("ElevenLabs");
  });

  it("matches Sentry in STRIPE*SENTRY", () => {
    const result = findMerchantAliasMatch("STRIPE*SENTRY", FUZZY_ALIAS_GROUPS);
    expect(result?.name).toBe("Sentry");
  });

  it("matches Resend in STRIPE*RESEND", () => {
    const result = findMerchantAliasMatch("STRIPE*RESEND", FUZZY_ALIAS_GROUPS);
    expect(result?.name).toBe("Resend");
  });

  it("matches Clerk in STRIPE*CLERK", () => {
    const result = findMerchantAliasMatch("STRIPE*CLERK", FUZZY_ALIAS_GROUPS);
    expect(result?.name).toBe("Clerk");
  });

  it("matches Linear in STRIPE*LINEAR", () => {
    const result = findMerchantAliasMatch("STRIPE*LINEAR", FUZZY_ALIAS_GROUPS);
    expect(result?.name).toBe("Linear");
  });

  it("matches Framer in STRIPE*FRAMER", () => {
    const result = findMerchantAliasMatch("STRIPE*FRAMER", FUZZY_ALIAS_GROUPS);
    expect(result?.name).toBe("Framer");
  });

  it("matches HeyGen in STRIPE*HEYGEN", () => {
    const result = findMerchantAliasMatch("STRIPE*HEYGEN", FUZZY_ALIAS_GROUPS);
    expect(result?.name).toBe("HeyGen");
  });

  it("matches Twilio in TWILIO INC", () => {
    const result = findMerchantAliasMatch("TWILIO INC", FUZZY_ALIAS_GROUPS);
    expect(result?.name).toBe("Twilio");
  });

  it("matches Mailgun in STRIPE*MAILGUN", () => {
    const result = findMerchantAliasMatch("STRIPE*MAILGUN", FUZZY_ALIAS_GROUPS);
    expect(result?.name).toBe("Mailgun");
  });

  it("matches Windsurf in STRIPE*WINDSURF", () => {
    const result = findMerchantAliasMatch("STRIPE*WINDSURF", FUZZY_ALIAS_GROUPS);
    expect(result?.name).toBe("Windsurf");
  });

  it("matches Datadog in STRIPE*DATADOG", () => {
    const result = findMerchantAliasMatch("STRIPE*DATADOG", FUZZY_ALIAS_GROUPS);
    expect(result?.name).toBe("Datadog");
  });
});
