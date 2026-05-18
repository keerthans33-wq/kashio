// Fuzzy merchant matching layer — runs before the exact ALIAS_MAP check.
//
// Purpose: catch bank descriptors that carry leet-speak substitutions,
// separator noise (*/-/_/.), gateway prefixes (PAYPAL*, STRIPE*, SHOPIFY*),
// or legal/location suffixes (PTY, INC, LABS) that cause the display normalizer
// to lose the real underlying merchant.
//
// The exported helpers implement the matching spec verbatim.
// FUZZY_ALIAS_GROUPS is the data set; detectMerchantAlias.ts is the entry point.
// extractMerchantTokens is a utility for stripping platform/payment noise.

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
    .replace(/@/g, "a")
    .replace(/3/g, "e")
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
    .replace(/\b(au|aus|australia|pty|ltd|limited|inc|llc|co|com|billing|bill|charge|payment|payments|subscription|subs|online|digital|intl|international|ref|txn|id|transaction|invoice|inv|receipt|direct|debit|card|visa|mastercard)\b/g, " ")
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
// extractMerchantTokens — strips platform and payment noise, returns residual tokens
// ---------------------------------------------------------------------------
// Removes known payment-platform names (paypal, stripe, apple, google…) and
// generic payment/billing words, then splits on separators.
//
// Use cases:
//   • tokens.length === 0 → generic platform/app-store charge (no real merchant)
//   • tokens.length  >  0 → blended descriptor; residual tokens name the merchant
//
// Examples:
//   "PAYPAL * FIGMA"     → ["figma"]
//   "APPLE.COM/BILL"     → []
//   "STRIPE * CHATGPT"   → ["chatgpt"]
//   "SHOPIFY*KLAVIYO"    → ["klaviyo"]
export function extractMerchantTokens(description: string): string[] {
  return description
    .toLowerCase()
    .replace(/\b(paypal|stripe|shopify|square|squareup|wise|airwallex|apple|google|amazon|visa|mastercard|amex)\b/g, " ")
    .replace(/\b(payment|payments|billing|bill|fee|fees|charge|charges|invoice|subscription|subs|merchant|processing|payout|services|play|store|com|au|inc|pty|ltd)\b/g, " ")
    .replace(/[*/\-_.# 0-9]+/g, " ")
    .split(" ")
    .map(t => t.trim())
    .filter(t => t.length > 2);
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

  // ChatGPT — STRIPE * CHATGPT: CHATGPT is stripped by TERMINAL_CODE, leaving
  // only "Stripe" after display normalisation. Fuzzy catches "chatgpt" in the
  // raw descriptor and classifies it as Software, not Payment Processing.
  {
    name:       "ChatGPT",
    aliases:    ["chatgpt", "chat gpt"],
    category:   CATEGORIES.SOFTWARE,
    what:       "an AI chatbot by OpenAI",
    confidence: "MEDIUM",
  },

  // Adobe — PAYPAL * ADOBE: "adobe" is a distinctive 5-char token not in any
  // noise list. Fuzzy catches it before the gateway prefix wins.
  {
    name:       "Adobe",
    aliases:    ["adobe"],
    category:   CATEGORIES.SOFTWARE,
    what:       "a creative software platform",
    confidence: "MEDIUM",
  },

  // Canva — PAYPAL * CANVA is also handled upstream by PAYPAL* prefix stripping
  // in normalizeMerchant (→ "Canva" → ALIAS_MAP). This entry makes the fuzzy
  // layer authoritative for all gateway variants.
  {
    name:       "Canva",
    aliases:    ["canva"],
    category:   CATEGORIES.SOFTWARE,
    what:       "a graphic design and content creation platform",
    confidence: "MEDIUM",
  },

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

  // Microsoft Azure — "azure" is the distinctive token.
  // "msftazure" compact alias matches "MSFT*AZURE" via compactMatch without
  // triggering importantTokenMatch on the bare "msft" token, which would
  // false-positive on "MSFT-ADVERTISING/BING*AU" and similar descriptors.
  {
    name:       "Microsoft Azure",
    // "microsoft azure" (space-separated) is intentionally NOT an alias:
    // aliasTokens ["microsoft","azure"] → importantTokenMatch fires on "microsoft"
    // alone, which cross-fires on "MICR0SOFT @DS" (Microsoft Ads) → wrong category.
    // "azure" (5 chars) is distinctive enough for importantTokenMatch on its own.
    // "msftazure" compact matches "MSFT*AZURE" via compactMatch.
    aliases:    ["msftazure", "azure"],
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

  // ── Ad networks / social ad platforms ────────────────────────────────────
  // These appear with dots, hyphens, leet-speak, or gateway prefixes that prevent
  // the display normaliser from producing a clean merchant name.
  // Compact aliases (no spaces) are used to avoid importantTokenMatch false-positives
  // on short tokens like "ads" (3 chars) or "google" / "meta" (distinctive but risky
  // in isolation). compactMatch fires when the alias is a substring of the collapsed
  // normalized descriptor — so "googleads" matches "G0OGLE ADS" (after 0→o: "google
  // ads" → compact "googleads") without firing on "GOOGLE WORKSPACE" ("googleworkspace").

  {
    name:       "Google Ads",
    // Only compact form — "google adwords" (space-separated) would fire
    // importantTokenMatch on "google" alone, hitting GOOGLE PLAY / GOOGLE CLOUD.
    // "G0OGLE ADS" → normalizeMerchantFuzzy(0→o) → "google ads" → compact
    // "googleads" ✓.  "G0OGLE ADWORDS" is also caught: "googleadwords" ⊅ "googleads"
    // but MERCHANT_ALIASES handles adwords via the display normaliser first.
    aliases:    ["googleads"],
    category:   CATEGORIES.MARKETING,
    what:       "an online advertising platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Meta Ads",
    // "INST@GRAM ADS" → @→a → "instagram ads" → compact "instagramads" ✓.
    // "INSTAGRAM PROMOTE*AU" → compact "instagrampromote" ⊃ "instagrampromot" ✓.
    aliases:    ["metaads", "instagramads", "facebookads", "instagrampromot"],
    category:   CATEGORIES.MARKETING,
    what:       "a social media advertising platform",
    confidence: "MEDIUM",
  },
  {
    name:       "TikTok Ads",
    // "tiktok for business" (space-separated) would fire importantTokenMatch on
    // "business" alone, causing false positives on any descriptor with "business".
    aliases:    ["tiktokads", "tiktok ads"],
    category:   CATEGORIES.MARKETING,
    what:       "a social media advertising platform",
    confidence: "MEDIUM",
  },
  {
    name:       "LinkedIn Ads",
    // NOT "linkedin" alone — that would fire on LinkedIn Learning and LinkedIn Premium.
    // "linkedinads" compact is safe: only matches descriptors containing "linkedinads".
    aliases:    ["linkedinads"],
    category:   CATEGORIES.MARKETING,
    what:       "a professional network advertising platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Pinterest Ads",
    aliases:    ["pinterestads", "pinterest ads"],
    category:   CATEGORIES.MARKETING,
    what:       "a social media advertising platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Reddit Ads",
    aliases:    ["redditads", "reddit ads"],
    category:   CATEGORIES.MARKETING,
    what:       "an online advertising platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Snap Ads",
    // "SNAP*ADS MANAGER" — TERMINAL_CODE strips *ADS (3 chars ✓), leaving "SNAP
    // MANAGER" → LOCATION_SLUG strips MANAGER → display "Snap" which has no alias.
    // Fuzzy on raw: tokens ["snap","ads","manager"] — "snap ads" allTokensPresent ✓.
    aliases:    ["snap ads", "snapchat ads", "snap"],
    category:   CATEGORIES.MARKETING,
    what:       "a social media advertising platform",
    confidence: "MEDIUM",
  },
  {
    name:       "YouTube Ads",
    // "YOUTUBE PROMOTE*GOOG" — TERMINAL_CODE strips *GOOG, LOCATION_SLUG strips
    // PROMOTE → display "Youtube"; no alias for bare "youtube". Fuzzy catches it.
    aliases:    ["youtube promote", "youtube ads"],
    category:   CATEGORIES.MARKETING,
    what:       "an online advertising platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Taboola",
    // "TABOOLA.COM*ADS" — after stripping *ADS the display is "Taboola.Com".
    // ALIAS_MAP substring still finds "taboola" inside "taboola.com"; fuzzy
    // provides a belt-and-braces guarantee for any separator variant.
    aliases:    ["taboola"],
    category:   CATEGORIES.MARKETING,
    what:       "a content discovery and native advertising platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Outbrain",
    // "OUTBRAIN-AU-INVOICE" — hyphens survive all normaliser steps; fuzzy
    // strips them and strips "au"/"invoice" noise → token "outbrain" ✓.
    aliases:    ["outbrain"],
    category:   CATEGORIES.MARKETING,
    what:       "a content discovery and native advertising platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Adroll",
    // "ADROLL*RETARGETING" — TERMINAL_CODE strips *RETARGETING → "Adroll";
    // fuzzy also catches raw-descriptor variants.
    aliases:    ["adroll"],
    category:   CATEGORIES.MARKETING,
    what:       "a retargeting and digital advertising platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Criteo",
    // "CRITEO*AU ADS" — *AU (only 2 chars) not stripped by TERMINAL_CODE;
    // LOCATION_SLUG strips " AU ADS" → display "Criteo*"; ALIAS_MAP substring
    // still matches "criteo". Fuzzy provides additional coverage.
    aliases:    ["criteo"],
    category:   CATEGORIES.MARKETING,
    what:       "a commerce media and retargeting advertising platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Microsoft Ads",
    // "MSFT-ADVERTISING/BING*AU" — hyphens/slashes make display normaliser
    // produce "Msft-Advertising/Bing*Au"; MERCHANT_ALIASES resolves it, but
    // fuzzy provides raw-descriptor redundancy.
    // "msft advertising" is intentionally NOT included as a space-separated alias:
    // "msft" (4 chars) would fire importantTokenMatch on ANY MSFT* descriptor
    // (e.g. MSFT*365 → token "msft" → false-positive). Use compact form instead.
    aliases:    ["microsoft advertising", "msftadvertising", "bing ads", "bing"],
    category:   CATEGORIES.MARKETING,
    what:       "an online advertising platform",
    confidence: "MEDIUM",
  },

  // ── SEO / analytics tools ─────────────────────────────────────────────────

  {
    name:       "Moz",
    // "MOZ.COM*PRO" — TERMINAL_CODE strips *PRO → "MOZ.COM"; ALIAS_MAP "moz"
    // substring finds it. Fuzzy provides coverage for other separator variants.
    aliases:    ["moz pro", "moz"],
    category:   CATEGORIES.MARKETING,
    what:       "an SEO software platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Ubersuggest",
    // "UBERSUGGEST/NEILPATEL" — slash survives normalisers; ALIAS_MAP substring
    // still finds "ubersuggest". Fuzzy provides a redundant path.
    aliases:    ["ubersuggest", "neilpatel", "neil patel"],
    category:   CATEGORIES.MARKETING,
    what:       "an SEO and keyword research tool",
    confidence: "MEDIUM",
  },
  {
    name:       "Screaming Frog",
    // "SCREAMING-FROG.CO.UK" — hyphen blocks ALIAS_MAP substring match on
    // "screaming frog" (space ≠ hyphen). Fuzzy converts "-" and "." to spaces,
    // producing tokens ["screaming","frog","co","uk"] → allTokensPresent ✓.
    // "screamingfrog" compact also matches via compactMatch ✓.
    aliases:    ["screamingfrog", "screaming frog"],
    category:   CATEGORIES.MARKETING,
    what:       "an SEO crawling and auditing tool",
    confidence: "MEDIUM",
  },
  {
    name:       "Surfer SEO",
    // "SURFERSEO*SUB" — TERMINAL_CODE strips *SUB → "Surferseo"; ALIAS_MAP
    // "surferseo" matches. Fuzzy handles other variants.
    aliases:    ["surferseo", "surfer seo"],
    category:   CATEGORIES.MARKETING,
    what:       "an SEO content optimisation tool",
    confidence: "MEDIUM",
  },
  {
    name:       "Microsoft Clarity",
    // "MS CLARITY*BILL" — TERMINAL_CODE strips *BILL → "MS CLARITY";
    // LOCATION_SLUG then strips " CLARITY" → display "Ms" with no match.
    // MERCHANT_ALIASES resolves to "Microsoft Clarity" before that; fuzzy
    // also catches via aliasTokens ["ms","clarity"] both present ✓.
    aliases:    ["ms clarity", "microsoft clarity", "clarity"],
    category:   CATEGORIES.SOFTWARE,
    what:       "a website heatmap and analytics tool",
    confidence: "MEDIUM",
  },
  {
    name:       "SEMrush",
    aliases:    ["semrush"],
    category:   CATEGORIES.MARKETING,
    what:       "an SEO and digital marketing analytics platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Hotjar",
    aliases:    ["hotjar"],
    category:   CATEGORIES.MARKETING,
    what:       "a website analytics and heatmap tool",
    confidence: "MEDIUM",
  },
  {
    name:       "Mixpanel",
    aliases:    ["mixpanel"],
    category:   CATEGORIES.SOFTWARE,
    what:       "a product analytics platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Amplitude",
    aliases:    ["amplitude"],
    category:   CATEGORIES.SOFTWARE,
    what:       "a product analytics platform",
    confidence: "MEDIUM",
  },

  // ── CRM / email marketing / support ──────────────────────────────────────

  {
    name:       "ActiveCampaign",
    // "ACTIVE-CAMPAIGN.COM" — hyphen + ".com" mean display is "Active-Campaign.Com";
    // ALIAS_MAP "activecampaign" fails substring on that. Fuzzy converts "-" and "."
    // to spaces → "active campaign com" → strip "com" → compact "activecampaign" ✓.
    aliases:    ["activecampaign", "active campaign"],
    category:   CATEGORIES.MARKETING,
    what:       "a marketing automation and CRM platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Zoho",
    // "ZOHO*CRM AU" — TERMINAL_CODE strips *CRM → "ZOHO AU"; "au" stays in
    // display but ALIAS_MAP "zoho" substring finds it. Fuzzy adds redundancy.
    aliases:    ["zoho crm", "zoho"],
    category:   CATEGORIES.SOFTWARE,
    what:       "a cloud CRM and business software platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Pipedrive",
    // "PIPEDRIVE INC" — LOCATION_SLUG strips " INC" → "Pipedrive"; ALIAS_MAP ✓.
    // Fuzzy provides additional coverage for other variants.
    aliases:    ["pipedrive"],
    category:   CATEGORIES.SOFTWARE,
    what:       "a sales CRM and pipeline management tool",
    confidence: "MEDIUM",
  },
  {
    name:       "Constant Contact",
    // "CONSTANTCONTACT.COM" — ".COM" survives; ALIAS_MAP "constantcontact"
    // still matches via substring. Fuzzy compactMatch also fires ✓.
    aliases:    ["constantcontact", "constant contact"],
    category:   CATEGORIES.MARKETING,
    what:       "an email marketing platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Freshdesk",
    // "FRESHDESK*SUPPORT" — TERMINAL_CODE strips *SUPPORT → "Freshdesk" ✓.
    aliases:    ["freshdesk"],
    category:   CATEGORIES.SOFTWARE,
    what:       "a customer support and helpdesk platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Zendesk",
    aliases:    ["zendesk"],
    category:   CATEGORIES.SOFTWARE,
    what:       "a customer service and support platform",
    confidence: "MEDIUM",
  },
  {
    name:       "HubSpot",
    aliases:    ["hubspot"],
    category:   CATEGORIES.SOFTWARE,
    what:       "a CRM and marketing automation platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Salesforce",
    aliases:    ["salesforce"],
    category:   CATEGORIES.SOFTWARE,
    what:       "a CRM and business software platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Intercom",
    aliases:    ["intercom"],
    category:   CATEGORIES.SOFTWARE,
    what:       "a customer messaging and support platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Help Scout",
    aliases:    ["helpscout", "help scout"],
    category:   CATEGORIES.SOFTWARE,
    what:       "a customer support platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Drift",
    aliases:    ["drift"],
    category:   CATEGORIES.SOFTWARE,
    what:       "a conversational marketing and sales platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Klaviyo",
    aliases:    ["klaviyo"],
    category:   CATEGORIES.MARKETING,
    what:       "an email and SMS marketing platform",
    confidence: "MEDIUM",
  },

  // ── Accounting / payment edge cases ──────────────────────────────────────

  {
    name:       "Rounded",
    // "ROUNDED.COM.AU" — dots not converted by display normaliser; ALIAS_MAP
    // "rounded" substring still finds it. Fuzzy compactMatch also works ✓.
    aliases:    ["rounded"],
    category:   CATEGORIES.ACCOUNTING,
    what:       "an invoicing and income management tool for freelancers",
    confidence: "MEDIUM",
  },
  {
    name:       "EFTPOS Air",
    // "EFTPOS AIR FEE" — PREFIXES strips "EFTPOS " → "AIR FEE" → LOCATION_SLUG
    // strips " FEE" → display "Air" with no match. MERCHANT_ALIASES fires at
    // step 0 first, preserving "EFTPOS Air". Fuzzy also catches on raw tokens.
    aliases:    ["eftpos air"],
    category:   CATEGORIES.PAYMENT_PROCESSING,
    what:       "a wireless EFTPOS terminal service",
    confidence: "MEDIUM",
  },
  {
    name:       "Afterpay Merchant Fee",
    // "AFTERPAY MERCHANT-FEE" — hyphen not converted; ALIAS_MAP "afterpay merchant"
    // substring matches "afterpay merchant-fee" ✓. Fuzzy strips hyphen ✓.
    aliases:    ["afterpay merchant fee", "afterpay merchant"],
    category:   CATEGORIES.PAYMENT_PROCESSING,
    what:       "a buy-now-pay-later merchant processing fee",
    confidence: "MEDIUM",
  },
  {
    name:       "Zip",
    // "ZIP CO MERCHANT" — LOCATION_SLUG strips " MERCHANT" → "Zip Co";
    // ALIAS_MAP "zip co" substring matches ✓. Fuzzy catches other variants.
    aliases:    ["zip merchant", "zip co merchant", "zip co", "zip pay"],
    category:   CATEGORIES.PAYMENT_PROCESSING,
    what:       "a buy-now-pay-later payment service",
    confidence: "MEDIUM",
  },
  {
    name:       "Zeller",
    aliases:    ["zeller"],
    category:   CATEGORIES.PAYMENT_PROCESSING,
    what:       "an Australian business banking and payment platform",
    confidence: "MEDIUM",
  },
  {
    name:       "SumUp",
    aliases:    ["sumup"],
    category:   CATEGORIES.PAYMENT_PROCESSING,
    what:       "a card payment and POS platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Smartpay",
    aliases:    ["smartpay"],
    category:   CATEGORIES.PAYMENT_PROCESSING,
    what:       "a payment terminal service",
    confidence: "MEDIUM",
  },

  // ── Hosting / DNS / CDN ───────────────────────────────────────────────────

  {
    name:       "Hostgator",
    aliases:    ["hostgator"],
    category:   CATEGORIES.WEBSITE_DOMAINS,
    what:       "a web hosting provider",
    confidence: "MEDIUM",
  },
  {
    name:       "Bluehost",
    aliases:    ["bluehost"],
    category:   CATEGORIES.WEBSITE_DOMAINS,
    what:       "a web hosting provider",
    confidence: "MEDIUM",
  },
  {
    name:       "Siteground",
    aliases:    ["siteground"],
    category:   CATEGORIES.WEBSITE_DOMAINS,
    what:       "a web hosting provider",
    confidence: "MEDIUM",
  },
  {
    name:       "Dnsimple",
    aliases:    ["dnsimple"],
    category:   CATEGORIES.WEBSITE_DOMAINS,
    what:       "a domain registration and DNS management service",
    confidence: "MEDIUM",
  },
  {
    name:       "Dreamhost",
    aliases:    ["dreamhost"],
    category:   CATEGORIES.WEBSITE_DOMAINS,
    what:       "a web hosting provider",
    confidence: "MEDIUM",
  },
  {
    name:       "Hostinger",
    aliases:    ["hostinger"],
    category:   CATEGORIES.WEBSITE_DOMAINS,
    what:       "a web hosting and domain service",
    confidence: "MEDIUM",
  },
  {
    name:       "Kinsta",
    aliases:    ["kinsta"],
    category:   CATEGORIES.WEBSITE_DOMAINS,
    what:       "a managed WordPress hosting platform",
    confidence: "MEDIUM",
  },
  {
    name:       "WP Engine",
    aliases:    ["wpengine", "wp engine"],
    category:   CATEGORIES.WEBSITE_DOMAINS,
    what:       "a managed WordPress hosting platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Cloudways",
    aliases:    ["cloudways"],
    category:   CATEGORIES.WEBSITE_DOMAINS,
    what:       "a managed cloud hosting platform",
    confidence: "MEDIUM",
  },
  {
    name:       "VentraIP",
    aliases:    ["ventraip"],
    category:   CATEGORIES.WEBSITE_DOMAINS,
    what:       "an Australian web hosting and domain provider",
    confidence: "MEDIUM",
  },
  {
    name:       "Fly.io",
    aliases:    ["fly io", "flyio"],
    category:   CATEGORIES.WEBSITE_DOMAINS,
    what:       "a cloud application hosting platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Bunny CDN",
    aliases:    ["bunnycdn", "bunny cdn"],
    category:   CATEGORIES.SOFTWARE,
    what:       "a content delivery network",
    confidence: "MEDIUM",
  },
  {
    name:       "Fastly",
    aliases:    ["fastly"],
    category:   CATEGORIES.SOFTWARE,
    what:       "a content delivery network and edge cloud platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Akamai",
    aliases:    ["akamai"],
    category:   CATEGORIES.SOFTWARE,
    what:       "a content delivery and cloud security platform",
    confidence: "MEDIUM",
  },

  // ── Professional development / membership ─────────────────────────────────

  {
    name:       "LinkedIn Learning",
    // "LINKEDIN LEARNING" — LOCATION_SLUG strips " LEARNING" → display "Linkedin";
    // no bare "linkedin" alias exists. MERCHANT_ALIASES resolves first; fuzzy
    // also fires via compactMatch on "linkedinlearning".
    // NOT using "linkedin learning" space-separated: "linkedin" (8 chars) would
    // fire importantTokenMatch on ANY LinkedIn descriptor (Ads, Premium, etc.),
    // falsely categorising them as Professional Development.
    aliases:    ["linkedinlearning"],
    category:   CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    what:       "an online learning platform for professional skills",
    confidence: "MEDIUM",
  },
  {
    name:       "General Assembly",
    // "GENERAL ASSEMBLY AU" — MERCHANT_ALIASES resolves display name first;
    // compact alias avoids importantTokenMatch false-positive on "general" (7 chars).
    aliases:    ["generalassembly"],
    category:   CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    what:       "a tech and digital skills training provider",
    confidence: "MEDIUM",
  },
  {
    name:       "Tax Institute",
    // "TAX INSTITUTE AU" — LOCATION_SLUG strips " INSTITUTE AU" → "Tax".
    aliases:    ["tax institute"],
    category:   CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    what:       "a professional tax body offering education and membership",
    confidence: "MEDIUM",
  },
  {
    name:       "ACS Australia",
    // "ACS AUSTRALIA" — LOCATION_SLUG strips " AUSTRALIA" → "Acs" (3 chars);
    // ALIAS_MAP "acs" word-boundary matches. Fuzzy adds redundancy.
    aliases:    ["acs australia", "acs"],
    category:   CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    what:       "the Australian Computer Society professional membership",
    confidence: "MEDIUM",
  },
  {
    name:       "Project Management Institute",
    // "PROJECT MANAGEMENT INST" — LOCATION_SLUG strips " MANAGEMENT INST"
    // → display "Project" with no match. MERCHANT_ALIASES resolves to
    // "Project Management Institute"; fuzzy catches via allTokensPresent ✓.
    aliases:    ["project management inst", "project management institute", "pmi membership", "pmi"],
    category:   CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    what:       "a professional project management membership body",
    confidence: "MEDIUM",
  },
  {
    name:       "CPA Australia",
    aliases:    ["cpa australia"],
    category:   CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    what:       "a professional accounting membership body",
    confidence: "MEDIUM",
  },
  {
    name:       "CA ANZ",
    aliases:    ["ca anz", "chartered accountants anz", "chartered accountants"],
    category:   CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    what:       "the Chartered Accountants Australia and New Zealand membership",
    confidence: "MEDIUM",
  },
  {
    name:       "Engineers Australia",
    aliases:    ["engineers australia"],
    category:   CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    what:       "the Engineers Australia professional membership",
    confidence: "MEDIUM",
  },
  {
    name:       "AICD",
    aliases:    ["aicd"],
    category:   CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    what:       "the Australian Institute of Company Directors membership",
    confidence: "MEDIUM",
  },
  {
    name:       "AusIMM",
    aliases:    ["ausimm"],
    category:   CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    what:       "the Australasian Institute of Mining and Metallurgy membership",
    confidence: "MEDIUM",
  },
  {
    name:       "Pluralsight",
    aliases:    ["pluralsight"],
    category:   CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    what:       "a tech skills learning platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Domestika",
    aliases:    ["domestika"],
    category:   CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    what:       "an online creative skills learning platform",
    confidence: "MEDIUM",
  },
  {
    name:       "edX",
    aliases:    ["edx"],
    category:   CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    what:       "an online education platform",
    confidence: "MEDIUM",
  },
  {
    name:       "AHRI",
    aliases:    ["ahri"],
    category:   CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    what:       "the Australian HR Institute professional membership",
    confidence: "MEDIUM",
  },
  {
    name:       "Governance Institute",
    aliases:    ["governance institute"],
    category:   CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    what:       "a governance and risk professional membership body",
    confidence: "MEDIUM",
  },

  // ── Workwear / PPE / safety ───────────────────────────────────────────────

  {
    name:       "RSEA Safety",
    // "RSEA SAFETY #PERTH" — TERMINAL_CODE strips #PERTH; LOCATION_SLUG then
    // strips " SAFETY" → display "Rsea". MERCHANT_ALIASES resolves at step 0.
    // "rsea safety" space-separated is intentionally NOT used: "safety" (6 chars)
    // fires importantTokenMatch on any descriptor containing "safety" (e.g.
    // "safety training course") → false Work Clothing classification.
    // "rseasafety" compact matches via compactMatch; "rsea" (4 chars) is
    // sufficiently distinctive for the standalone-name case.
    aliases:    ["rseasafety", "rsea"],
    category:   CATEGORIES.WORK_CLOTHING,
    what:       "a safety and workwear retailer",
    confidence: "MEDIUM",
  },
  {
    name:       "Totally Workwear",
    // "TOTALLY-WORKWEAR//WA" — hyphen/slash survive normaliser; ALIAS_MAP
    // substring fails on "totally workwear" vs "totally-workwear". Fuzzy
    // converts separators → tokens include "totally" and "workwear" ✓.
    aliases:    ["totally workwear", "totallyworkwear"],
    category:   CATEGORIES.WORK_CLOTHING,
    what:       "a workwear and safety clothing retailer",
    confidence: "MEDIUM",
  },
  {
    name:       "Worklocker",
    aliases:    ["worklocker"],
    category:   CATEGORIES.WORK_CLOTHING,
    what:       "a workwear retailer",
    confidence: "MEDIUM",
  },
  {
    name:       "Hip Pocket Workwear",
    // Compact avoids importantTokenMatch on "pocket" (6 chars) alone.
    aliases:    ["hippocketworkwear", "hippocket"],
    category:   CATEGORIES.WORK_CLOTHING,
    what:       "a workwear retailer",
    confidence: "MEDIUM",
  },
  {
    name:       "Blackwoods",
    aliases:    ["blackwoods"],
    category:   CATEGORIES.WORK_CLOTHING,
    what:       "an industrial safety and workwear supplier",
    confidence: "MEDIUM",
  },
  {
    name:       "Bisley",
    // "bisle workwear" compact avoids importantTokenMatch on "workwear" alone.
    aliases:    ["bisleyworkwear", "bisley"],
    category:   CATEGORIES.WORK_CLOTHING,
    what:       "a workwear brand",
    confidence: "MEDIUM",
  },
  {
    name:       "Hard Yakka",
    // Compact avoids importantTokenMatch on "hard" (4 chars) which is a common word.
    aliases:    ["hardyakka"],
    category:   CATEGORIES.WORK_CLOTHING,
    what:       "a workwear brand",
    confidence: "MEDIUM",
  },
  {
    name:       "KingGee",
    aliases:    ["kinggee"],
    category:   CATEGORIES.WORK_CLOTHING,
    what:       "a workwear brand",
    confidence: "MEDIUM",
  },
  {
    name:       "Steel Blue",
    // Compact avoids importantTokenMatch on "steel" (5 chars) alone.
    aliases:    ["steelblue"],
    category:   CATEGORIES.WORK_CLOTHING,
    what:       "a safety footwear brand",
    confidence: "MEDIUM",
  },
  {
    name:       "Mongrel Boots",
    // Compact avoids importantTokenMatch on "boots" (5 chars) alone.
    aliases:    ["mongrelboots"],
    category:   CATEGORIES.WORK_CLOTHING,
    what:       "a safety footwear brand",
    confidence: "MEDIUM",
  },
  {
    name:       "Redback Boots",
    aliases:    ["redbackboots"],
    category:   CATEGORIES.WORK_CLOTHING,
    what:       "a safety footwear brand",
    confidence: "MEDIUM",
  },
  {
    name:       "Puma Safety",
    // Compact avoids importantTokenMatch on "safety" (6 chars) alone.
    aliases:    ["pumasafety"],
    category:   CATEGORIES.WORK_CLOTHING,
    what:       "a safety footwear brand",
    confidence: "MEDIUM",
  },
  {
    name:       "Safetyquip",
    aliases:    ["safetyquip"],
    category:   CATEGORIES.WORK_CLOTHING,
    what:       "a safety equipment and workwear supplier",
    confidence: "MEDIUM",
  },
  {
    name:       "Protector Alsafe",
    aliases:    ["protector alsafe"],
    category:   CATEGORIES.WORK_CLOTHING,
    what:       "a safety equipment and workwear supplier",
    confidence: "MEDIUM",
  },
  {
    name:       "WorkwearHub",
    aliases:    ["workwearhub"],
    category:   CATEGORIES.WORK_CLOTHING,
    what:       "an online workwear retailer",
    confidence: "MEDIUM",
  },

  // ── Professional development / online learning ────────────────────────────

  {
    name:       "Coursera",
    // "COURS3RA" → 3→e → "coursera" ✓ via exact/importantTokenMatch.
    aliases:    ["coursera"],
    category:   CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    what:       "an online learning and professional development platform",
    confidence: "MEDIUM",
  },
  {
    name:       "Udemy",
    aliases:    ["udemy"],
    category:   CATEGORIES.PROFESSIONAL_DEVELOPMENT,
    what:       "an online learning and professional development platform",
    confidence: "MEDIUM",
  },

  // ── Office supplies / trade tools ─────────────────────────────────────────
  // Compact aliases prevent importantTokenMatch false-positives on common words
  // like "office" (6 chars), "total" (5 chars), "big" (3 chars).

  {
    name:       "Big W Office",
    // "BIG W OFFICE BUNBURY" → compact "bigwoffice" ⊆ "bigwoffice" via compactMatch ✓.
    aliases:    ["bigwoffice"],
    category:   CATEGORIES.OFFICE_SUPPLIES,
    what:       "an office supplies section of Big W",
    confidence: "MEDIUM",
  },
  {
    name:       "Office Choice",
    // "OFFICE CHOICE PERTH" → compact "officechoice" ✓.
    aliases:    ["officechoice"],
    category:   CATEGORIES.OFFICE_SUPPLIES,
    what:       "an office supplies retailer",
    confidence: "MEDIUM",
  },
  {
    name:       "Total Tools",
    // "TOTAL TOOLS MOOROOKA" → compact "totaltools" ✓.
    aliases:    ["totaltools"],
    category:   CATEGORIES.EQUIPMENT,
    what:       "a trade tools and equipment retailer",
    confidence: "MEDIUM",
  },
  {
    name:       "Crazy Domains",
    // "CRAZY DOMAINS SYDNEY" → LOCATION_SLUG strips → display "Crazy";
    // MERCHANT_ALIASES resolves first, but fuzzy adds redundancy.
    aliases:    ["crazydomains", "crazy domains"],
    category:   CATEGORIES.WEBSITE_DOMAINS,
    what:       "a domain registrar and web hosting provider",
    confidence: "MEDIUM",
  },
  {
    name:       "Amazon Business",
    // "AMAZON BUSINESS AU" → LOCATION_SLUG strips " BUSINESS AU" → display "Amazon".
    // MERCHANT_ALIASES resolves first; fuzzy catches any gateway variant.
    aliases:    ["amazonbusiness"],
    category:   CATEGORIES.OFFICE_SUPPLIES,
    what:       "an Amazon business purchasing account",
    confidence: "MEDIUM",
  },
  {
    name:       "Bunnings",
    // "BUNNINGS WAREHOUSE AUBURN" — broad general hardware retailer; LOW confidence
    // since purchases may be personal. Only fires for business/tradie context.
    aliases:    ["bunnings"],
    category:   CATEGORIES.EQUIPMENT,
    what:       "a hardware and building supplies retailer",
    confidence: "LOW",
  },

  // ── Workwear additions ────────────────────────────────────────────────────

  {
    name:       "Scrubs Australia",
    // "SCRUBS AUSTRALIA SYDNEY" → LOCATION_SLUG strips " AUSTRALIA SYDNEY";
    // compact alias avoids importantTokenMatch on "scrubs" in unrelated contexts.
    aliases:    ["scrubsaustralia"],
    category:   CATEGORIES.WORK_CLOTHING,
    what:       "a medical and work uniform retailer",
    confidence: "MEDIUM",
  },

  // ── Hardware / tech retailers ─────────────────────────────────────────────

  {
    name:       "MSY Technology",
    // "MSY TECHNOLOGY" — LOCATION_SLUG strips " TECHNOLOGY" → display "Msy";
    // ALIAS_MAP "msy" word-boundary matches. MERCHANT_ALIASES resolves first.
    // Fuzzy compactMatch on "msy technology" → "msytechnology" ✓.
    aliases:    ["msy technology", "msy"],
    category:   CATEGORIES.EQUIPMENT,
    what:       "a computer hardware and electronics retailer",
    confidence: "MEDIUM",
  },
  {
    name:       "Centrecom",
    aliases:    ["centrecom", "centre com"],
    category:   CATEGORIES.EQUIPMENT,
    what:       "a computer hardware retailer",
    confidence: "MEDIUM",
  },
  {
    name:       "Mwave",
    aliases:    ["mwave"],
    category:   CATEGORIES.EQUIPMENT,
    what:       "a computer hardware retailer",
    confidence: "MEDIUM",
  },
  {
    name:       "Computer Alliance",
    aliases:    ["computer alliance"],
    category:   CATEGORIES.EQUIPMENT,
    what:       "a computer hardware retailer",
    confidence: "MEDIUM",
  },
  {
    name:       "PLE Computers",
    // "ple" alone is intentionally NOT an alias: exactIncludes fires "ple" inside
    // "apple" (APPLE.COM/BILL → normalized "apple") causing a false positive.
    aliases:    ["ple computers"],
    category:   CATEGORIES.EQUIPMENT,
    what:       "a computer hardware retailer",
    confidence: "MEDIUM",
  },
  {
    name:       "PcCaseGear",
    aliases:    ["pccasegear"],
    category:   CATEGORIES.EQUIPMENT,
    what:       "a computer hardware and gaming retailer",
    confidence: "MEDIUM",
  },
  {
    name:       "JW Computers",
    aliases:    ["jw computers"],
    category:   CATEGORIES.EQUIPMENT,
    what:       "a computer hardware retailer",
    confidence: "MEDIUM",
  },
  {
    name:       "Umart",
    aliases:    ["umart"],
    category:   CATEGORIES.EQUIPMENT,
    what:       "a computer hardware and electronics retailer",
    confidence: "MEDIUM",
  },
  {
    name:       "Scorptec",
    aliases:    ["scorptec"],
    category:   CATEGORIES.EQUIPMENT,
    what:       "a computer hardware retailer",
    confidence: "MEDIUM",
  },
  {
    name:       "Jaycar",
    aliases:    ["jaycar"],
    category:   CATEGORIES.EQUIPMENT,
    what:       "an electronics and tech components retailer",
    confidence: "MEDIUM",
  },
  {
    name:       "Dell",
    aliases:    ["dell"],
    category:   CATEGORIES.EQUIPMENT,
    what:       "a computer and technology hardware brand",
    confidence: "MEDIUM",
  },
  {
    name:       "Lenovo",
    aliases:    ["lenovo"],
    category:   CATEGORIES.EQUIPMENT,
    what:       "a computer and technology hardware brand",
    confidence: "MEDIUM",
  },

];
