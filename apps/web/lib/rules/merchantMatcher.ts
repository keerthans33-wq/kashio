// Fuzzy merchant matching layer — runs before the exact ALIAS_MAP check.
//
// Purpose: catch bank descriptors that carry leet-speak substitutions,
// separator noise (*/-/_/.), gateway prefixes (PAYPAL*, STRIPE*, SHOPIFY*),
// or legal/location suffixes (PTY, INC, LABS) that cause the display normalizer
// to lose the real underlying merchant.
//
// The three exported helpers implement the matching spec verbatim.
// FUZZY_ALIAS_GROUPS is the data set; detectMerchantAlias.ts is the entry point.

import { CATEGORIES } from "./categories";
import type { Confidence } from "./types";

export type FuzzyAliasGroup = {
  name:       string;
  aliases:    string[];
  category:   string;
  what:       string;
  confidence: Confidence;
};

export type FuzzyMatch = FuzzyAliasGroup & {
  matchedAlias:       string;
  normalizedMerchant: string;
  matchSource:        "merchant_alias_fuzzy";
};

// ---------------------------------------------------------------------------
// Step 1 — Aggressive normalizer (matching only — NOT for display)
// ---------------------------------------------------------------------------
// Applies leet-speak substitutions and collapses every separator and noise
// token into a single lowercase string suitable for token comparison.
export function normalizeMerchantFuzzy(raw: string): string {
  return String(raw || "")
    .toLowerCase()
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/5/g, "s")
    .replace(/8/g, "b")
    .replace(/&/g, " and ")
    .replace(/\*/g, " ")
    .replace(/\//g, " ")
    .replace(/\\/g, " ")
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .replace(/\./g, " ")
    .replace(/#/g, " ")
    .replace(/\+/g, " ")
    .replace(/\|/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(au|aus|australia|pty|ltd|limited|inc|llc|co|com|billing|bill|charge|payment|payments|subscription|subs|online|digital|intl|ref|txn|id)\b/g, " ")
    .replace(/\b\d{2,}\b/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Step 2 — Tokenizer
// ---------------------------------------------------------------------------
export function tokenizeMerchant(normalized: string): string[] {
  return normalized
    .split(" ")
    .map(t => t.trim())
    .filter(Boolean)
    .filter(t => t.length > 1);
}

// ---------------------------------------------------------------------------
// Step 3 — Matcher
// ---------------------------------------------------------------------------
// Tries all four matching strategies in order; returns the first group that
// matches any of its aliases against the raw bank description.
//
// Strategies (applied in order, any one sufficient for a match):
//   exactIncludes      — one string contains the other after fuzzy normalisation
//   allAliasTokensPresent — every alias token appears in the input token set
//   compactMatch       — whitespace-collapsed alias is substring of collapsed input
//   importantTokenMatch — any alias token ≥4 chars appears in input tokens
export function findMerchantAliasMatch(
  rawDescription: string,
  aliasGroups: FuzzyAliasGroup[],
): FuzzyMatch | null {
  const normalized = normalizeMerchantFuzzy(rawDescription);
  const tokens     = tokenizeMerchant(normalized);

  for (const group of aliasGroups) {
    for (const alias of group.aliases) {
      const normalizedAlias = normalizeMerchantFuzzy(alias);
      const aliasTokens     = tokenizeMerchant(normalizedAlias);

      const exactIncludes =
        normalized.includes(normalizedAlias) ||
        normalizedAlias.includes(normalized);

      const allAliasTokensPresent =
        aliasTokens.length > 0 &&
        aliasTokens.every(token => tokens.includes(token));

      const importantTokenMatch =
        aliasTokens.some(token => token.length >= 4 && tokens.includes(token));

      const compactMatch =
        normalized.replace(/\s/g, "").includes(normalizedAlias.replace(/\s/g, ""));

      if (exactIncludes || allAliasTokensPresent || compactMatch || importantTokenMatch) {
        return {
          ...group,
          matchedAlias:       alias,
          normalizedMerchant: normalized,
          matchSource:        "merchant_alias_fuzzy",
        };
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Alias groups
// ---------------------------------------------------------------------------
// ORDER MATTERS:
//   • More specific/target merchants must come before their payment gateways
//     (Figma before PayPal, OpenAI before Stripe, Klaviyo before Shopify).
//   • All aliases here are distinctive brand tokens (6–9 chars) so
//     importantTokenMatch does not fire on common English words.
//
// Merchants already handled by MERCHANT_ALIASES regex in normalizeMerchant.ts
// (GOOGLE ADW0RDS → "Google Ads", MSFT*AZURE → "Microsoft Azure",
// APPLE.COM → "Apple Services") are intentionally omitted to avoid
// importantTokenMatch false-positives on generic tokens like "google" or "apple".
export const FUZZY_ALIAS_GROUPS: FuzzyAliasGroup[] = [

  // ── Gateway-behind merchants ──────────────────────────────────────────────
  // These must precede their gateway to win when both tokens appear.

  // Figma — PAYPAL * FIGMA has PAYPAL* stripped by the display normalizer;
  // fuzzy catches "figma" in the raw descriptor.
  {
    name:       "Figma",
    aliases:    ["figma"],
    category:   CATEGORIES.SOFTWARE,
    what:       "a design and prototyping tool",
    confidence: "MEDIUM",
  },

  // OpenAI — STRIPE*OPENAI loses OPENAI to terminal-code stripping.
  {
    name:       "OpenAI",
    aliases:    ["openai"],
    category:   CATEGORIES.SOFTWARE,
    what:       "an AI platform",
    confidence: "MEDIUM",
  },

  // Klaviyo — SHOPIFY*KLAVIYO loses KLAVIYO to terminal-code stripping.
  {
    name:       "Klaviyo",
    aliases:    ["klaviyo"],
    category:   CATEGORIES.MARKETING,
    what:       "an email and SMS marketing platform",
    confidence: "MEDIUM",
  },

  // ── Abbreviated / compound merchant names ─────────────────────────────────

  // Microsoft Azure — "azure" is a distinctive 5-char token that safely
  // identifies the service even when the descriptor uses the MSFT abbreviation.
  // The MSFT*AZURE pattern is also handled upstream in normalizeMerchant.ts;
  // this entry acts as a safety net for other MSFT*/AZURE variants.
  {
    name:       "Microsoft Azure",
    aliases:    ["microsoft azure", "msft azure", "azure"],
    category:   CATEGORIES.SOFTWARE,
    what:       "a cloud computing and infrastructure platform",
    confidence: "MEDIUM",
  },

  // ── Merchants with noise suffixes stripped by terminal-code or location rules ─

  // GitHub — GITHUB*INC has *INC stripped (3 chars ≥ 3) → "Github" (broad,
  // needs keyword for detectSoftware) → fuzzy lifts to MEDIUM.
  {
    name:       "GitHub",
    aliases:    ["github"],
    category:   CATEGORIES.SOFTWARE,
    what:       "a code hosting and collaboration platform",
    confidence: "MEDIUM",
  },

  // Notion — NOTION LABS has LABS stripped by LOCATION_SLUG → "Notion"
  // (specific merchant, but no subscription keyword → detectSoftware gives LOW).
  // Fuzzy lifts from LOW to MEDIUM.
  {
    name:       "Notion",
    aliases:    ["notion"],
    category:   CATEGORIES.SOFTWARE,
    what:       "a workspace and note-taking platform",
    confidence: "MEDIUM",
  },

  // Atlassian — ATLASSIAN PTY has PTY stripped → "Atlassian" (same issue as Notion).
  {
    name:       "Atlassian",
    aliases:    ["atlassian"],
    category:   CATEGORIES.SOFTWARE,
    what:       "a project management and team collaboration platform",
    confidence: "MEDIUM",
  },

  // ── Vercel safety net ─────────────────────────────────────────────────────
  // VERCEL-V0*AI already matches "vercel" via ALIAS_MAP (the *AI suffix is only
  // 2 chars and is not stripped by terminal-code logic). This entry provides a
  // fallback for other Vercel / v0 AI descriptor variants.
  {
    name:       "Vercel",
    aliases:    ["vercel", "vercel v0"],
    category:   CATEGORIES.WEBSITE_DOMAINS,
    what:       "a cloud platform for web deployments",
    confidence: "MEDIUM",
  },

  // ── AI / coding / startup tools ───────────────────────────────────────────
  // These tools are commonly billed via STRIPE* or PADDLE* gateway descriptors,
  // which causes TERMINAL_CODE to strip the product name, leaving only the
  // gateway. The fuzzy layer catches the real merchant from the raw descriptor.

  {
    name:       "Cursor",
    aliases:    ["cursor ai", "cursor"],
    category:   CATEGORIES.SOFTWARE,
    what:       "an AI-powered code editor",
    confidence: "MEDIUM",
  },
  {
    name:       "Replit",
    aliases:    ["replit"],
    category:   CATEGORIES.SOFTWARE,
    what:       "an online IDE and collaborative coding platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Lovable",
    aliases:    ["lovable dev", "lovable"],
    category:   CATEGORIES.SOFTWARE,
    what:       "an AI app-building platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Bolt",
    aliases:    ["bolt new", "bolt"],
    category:   CATEGORIES.SOFTWARE,
    what:       "an AI web-development platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Windsurf",
    aliases:    ["windsurf"],
    category:   CATEGORIES.SOFTWARE,
    what:       "an AI-powered code editor",
    confidence: "MEDIUM",
  },
  {
    name:       "Perplexity",
    aliases:    ["perplexity ai", "perplexity"],
    category:   CATEGORIES.SOFTWARE,
    what:       "an AI search and research tool",
    confidence: "MEDIUM",
  },
  {
    name:       "Groq",
    aliases:    ["groq"],
    category:   CATEGORIES.SOFTWARE,
    what:       "an AI inference platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Replicate",
    aliases:    ["replicate"],
    category:   CATEGORIES.SOFTWARE,
    what:       "an AI model hosting platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Mistral AI",
    aliases:    ["mistral ai", "mistral"],
    category:   CATEGORIES.SOFTWARE,
    what:       "an AI model platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Stability AI",
    aliases:    ["stability ai", "stability"],
    category:   CATEGORIES.SOFTWARE,
    what:       "an AI image generation platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Hugging Face",
    aliases:    ["hugging face", "huggingface"],
    category:   CATEGORIES.SOFTWARE,
    what:       "an AI model hub and platform",
    confidence: "MEDIUM",
  },

  // ── AI video / voice / image ──────────────────────────────────────────────

  // Pika Labs — "PIKA LABS" has LABS stripped by LOCATION_SLUG; fuzzy lifts
  // from a potential miss to MEDIUM via importantTokenMatch on "pika".
  {
    name:       "Pika",
    aliases:    ["pika labs", "pika"],
    category:   CATEGORIES.SOFTWARE,
    what:       "an AI video generation platform",
    confidence: "MEDIUM",
  },
  // ElevenLabs — "ELEVENLABS INC" may lose INC; also appears as STRIPE*ELEVENLABS.
  {
    name:       "ElevenLabs",
    aliases:    ["elevenlabs", "eleven labs"],
    category:   CATEGORIES.SOFTWARE,
    what:       "an AI voice synthesis platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Synthesia",
    aliases:    ["synthesia"],
    category:   CATEGORIES.SOFTWARE,
    what:       "an AI video creation platform",
    confidence: "MEDIUM",
  },
  {
    name:       "HeyGen",
    aliases:    ["heygen"],
    category:   CATEGORIES.SOFTWARE,
    what:       "an AI video generation platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Runway",
    aliases:    ["runwayml", "runway"],
    category:   CATEGORIES.SOFTWARE,
    what:       "an AI creative and video suite",
    confidence: "MEDIUM",
  },
  {
    name:       "Midjourney",
    aliases:    ["midjourney"],
    category:   CATEGORIES.SOFTWARE,
    what:       "an AI image generation platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Higgsfield",
    aliases:    ["higgsfield"],
    category:   CATEGORIES.SOFTWARE,
    what:       "an AI video generation platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Suno",
    aliases:    ["suno"],
    category:   CATEGORIES.SOFTWARE,
    what:       "an AI music generation platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Udio",
    aliases:    ["udio"],
    category:   CATEGORIES.SOFTWARE,
    what:       "an AI music generation platform",
    confidence: "MEDIUM",
  },

  // ── Developer / monitoring / infra ────────────────────────────────────────

  // Sentry — may appear as "SENTRY.IO" (dot not caught by display normalizer)
  // or as "STRIPE*SENTRY".
  {
    name:       "Sentry",
    aliases:    ["sentry io", "sentry"],
    category:   CATEGORIES.SOFTWARE,
    what:       "an application monitoring and error-tracking platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Datadog",
    aliases:    ["datadog"],
    category:   CATEGORIES.SOFTWARE,
    what:       "a cloud monitoring and observability platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Linear",
    aliases:    ["linear"],
    category:   CATEGORIES.SOFTWARE,
    what:       "a project and issue-tracking tool",
    confidence: "MEDIUM",
  },
  // Resend — commonly billed via STRIPE*RESEND; without fuzzy, Stripe wins.
  {
    name:       "Resend",
    aliases:    ["resend"],
    category:   CATEGORIES.SOFTWARE,
    what:       "a transactional email API platform",
    confidence: "MEDIUM",
  },
  // Clerk — commonly billed via STRIPE*CLERK.
  {
    name:       "Clerk",
    aliases:    ["clerk"],
    category:   CATEGORIES.SOFTWARE,
    what:       "an authentication and user management platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Twilio",
    aliases:    ["twilio"],
    category:   CATEGORIES.SOFTWARE,
    what:       "a cloud communications platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Mailgun",
    aliases:    ["mailgun"],
    category:   CATEGORIES.SOFTWARE,
    what:       "an email delivery API platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Supabase",
    aliases:    ["supabase"],
    category:   CATEGORIES.SOFTWARE,
    what:       "an open-source backend-as-a-service platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Cloudflare",
    aliases:    ["cloudflare"],
    category:   CATEGORIES.SOFTWARE,
    what:       "a cloud network and security platform",
    confidence: "MEDIUM",
  },

  // ── Website / no-code builders ────────────────────────────────────────────

  {
    name:       "Framer",
    aliases:    ["framer"],
    category:   CATEGORIES.WEBSITE_DOMAINS,
    what:       "a no-code website builder",
    confidence: "MEDIUM",
  },

  // ── Design / assets / content ─────────────────────────────────────────────
  // Multi-word merchants where LOCATION_SLUG strips the trailing word (SOUND,
  // ARRAY, MARKET) from the display name. Compact aliases (no spaces) let
  // compactMatch fire on the full raw descriptor without relying on
  // importantTokenMatch — which would false-positive on common tokens like
  // "creative" appearing in "Adobe Creative Cloud".

  {
    name:       "Epidemic Sound",
    // "epidemicsound" (compact) matches "EPIDEMIC SOUND" via compactMatch;
    // avoids importantTokenMatch on the common word "sound".
    aliases:    ["epidemicsound"],
    category:   CATEGORIES.SOFTWARE,
    what:       "a royalty-free music licensing platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Motion Array",
    // "motionarray" (compact) matches "MOTION ARRAY" via compactMatch.
    aliases:    ["motionarray"],
    category:   CATEGORIES.SOFTWARE,
    what:       "a motion graphics and video asset platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Creative Market",
    // "creativemarket" (compact) matches "CREATIVE MARKET" or "STRIPE*CREATIVEMARKET"
    // via compactMatch; avoids false-positive on "creative" in "Adobe Creative Cloud".
    aliases:    ["creativemarket"],
    category:   CATEGORIES.SOFTWARE,
    what:       "a digital design asset marketplace",
    confidence: "MEDIUM",
  },

];
