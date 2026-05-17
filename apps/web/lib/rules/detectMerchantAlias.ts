// Hard merchant alias override — priority 10 (highest), runs before all other rules.
//
// Forces a match for well-known business merchants regardless of user type.
// This bypasses the forUserTypes restriction in merchants.ts / detectFallback,
// ensuring these merchants are always surfaced for review — even for employees
// who may have a side business or be reimbursed separately.
//
// Matching uses the same word-boundary logic as matchesMerchant():
//   names ≤ 4 chars require word boundaries; longer names use substring.
// All entries return MEDIUM confidence with canUpgrade=true so contractors and
// sole traders receive a +1 lift to HIGH via adjustConfidence (DELTAS in userTypeLayer).

import type { Rule, RawMatch, Explanation, Confidence } from "./types";
import { CATEGORIES } from "./categories";
import { merchantText, matchesMerchant } from "./shared";
import { findMerchantAliasMatch, FUZZY_ALIAS_GROUPS } from "./merchantMatcher";

type AliasEntry = {
  category:   string;
  confidence: Confidence;
  what:       string;
};

const ALIAS_MAP: [string, AliasEntry][] = [

  // ── Marketing & Advertising ────────────────────────────────────────────────
  ["google ads",      { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an online advertising platform" }],
  ["google adwords",  { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an online advertising platform" }],
  ["meta ads",        { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "a social media advertising platform" }],
  ["facebook ads",    { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "a social media advertising platform" }],
  ["instagram ads",   { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "a social media advertising platform" }],
  ["linkedin ads",    { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "a professional network advertising platform" }],
  ["tiktok ads",      { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "a social media advertising platform" }],
  ["x ads",           { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "a social media advertising platform" }],
  ["twitter ads",     { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "a social media advertising platform" }],
  ["youtube ads",     { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an online advertising platform" }],
  ["pinterest ads",   { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "a social media advertising platform" }],
  ["snapchat ads",    { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "a social media advertising platform" }],
  ["reddit ads",      { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an online advertising platform" }],
  ["bing ads",        { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an online advertising platform" }],
  ["microsoft ads",   { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an online advertising platform" }],
  ["mailchimp",       { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an email marketing platform" }],
  ["klaviyo",         { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an email and SMS marketing platform" }],
  ["activecampaign",  { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "a marketing automation and CRM platform" }],
  ["brevo",           { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an email marketing platform" }],
  ["convertkit",      { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an email marketing platform for creators" }],
  ["sendgrid",        { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an email delivery platform" }],
  ["semrush",         { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an SEO and digital marketing platform" }],
  ["ahrefs",          { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an SEO analytics platform" }],
  ["hotjar",          { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "a website analytics and heatmap tool" }],

  // ── Accounting & Business ──────────────────────────────────────────────────
  ["xero",            { category: CATEGORIES.ACCOUNTING, confidence: "MEDIUM", what: "cloud accounting software" }],
  ["myob",            { category: CATEGORIES.ACCOUNTING, confidence: "MEDIUM", what: "accounting and payroll software" }],
  ["quickbooks",      { category: CATEGORIES.ACCOUNTING, confidence: "MEDIUM", what: "accounting and invoicing software" }],
  ["quick books",     { category: CATEGORIES.ACCOUNTING, confidence: "MEDIUM", what: "accounting and invoicing software" }],
  ["intuit",          { category: CATEGORIES.ACCOUNTING, confidence: "MEDIUM", what: "accounting software (QuickBooks)" }],
  ["reckon",          { category: CATEGORIES.ACCOUNTING, confidence: "MEDIUM", what: "accounting software" }],
  ["freshbooks",      { category: CATEGORIES.ACCOUNTING, confidence: "MEDIUM", what: "invoicing and accounting software" }],
  ["invoice2go",      { category: CATEGORIES.ACCOUNTING, confidence: "MEDIUM", what: "mobile invoicing software" }],
  ["hnry",            { category: CATEGORIES.ACCOUNTING, confidence: "MEDIUM", what: "a contractor tax and invoicing service" }],

  // ── Website & Domains ──────────────────────────────────────────────────────
  // NOTE: squarespace must precede square so "Squarespace" doesn't match the shorter key first.
  // NOTE: shopify billing must precede shopify so "Shopify Billing" hits the more-specific entry first.
  ["shopify billing",  { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "an ecommerce platform subscription" }],
  ["shopify",         { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "an ecommerce platform" }],
  ["godaddy",         { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a domain registrar and web host" }],
  ["crazy domains",   { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a domain registrar" }],
  ["namecheap",       { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a domain registrar" }],
  ["domain.com.au",   { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "an Australian domain registrar" }],
  ["squarespace",     { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a website builder and hosting platform" }],
  ["wix",             { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a website builder" }],
  ["webflow",         { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a no-code website design platform" }],
  ["vercel",          { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a cloud platform for web deployments" }],
  ["netlify",         { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a web hosting and deployment platform" }],
  ["heroku",          { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a cloud application platform" }],
  ["hostinger",       { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a web hosting and domain service" }],
  ["render",          { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a cloud hosting platform" }],
  ["railway",         { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a cloud infrastructure platform" }],
  ["digitalocean",    { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a cloud hosting provider" }],
  // NOTE: wordpress com must precede wordpress.
  ["wordpress com",   { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a hosted website and blogging platform" }],
  ["wordpress",       { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a website and blogging platform" }],
  ["framer",          { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a no-code website builder" }],
  ["carrd",           { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a simple one-page website builder" }],
  ["bubble",          { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a no-code app development platform" }],
  ["glide",           { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a no-code app builder" }],
  ["softr",           { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a no-code web app builder" }],
  ["memberstack",     { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a membership and authentication platform" }],
  ["outseta",         { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a SaaS billing and membership platform" }],
  // NOTE: lemon squeezy must precede lemonsqueezy.
  ["lemon squeezy",   { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a digital products and ecommerce platform" }],
  ["lemonsqueezy",    { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a digital products and ecommerce platform" }],
  ["gumroad",         { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a digital products and creator commerce platform" }],
  ["paddle",          { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a merchant-of-record payment platform" }],

  // ── Payment Processing ─────────────────────────────────────────────────────
  // PayPal fee variants — checked before generic "paypal" to return the right category.
  ["paypal fee",       { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a payment processing fee" }],
  ["paypal merchant",  { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a payment processing service" }],
  ["paypal australia", { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a payment processing service" }],
  ["paypal au",        { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a payment processing service" }],
  // Square — squarespace entry above must remain earlier in the list (longer key wins via first-match).
  ["squareup",         { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a payment processing and POS platform" }],
  ["square payments",  { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a payment processing platform" }],
  ["square pos",       { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a point of sale system" }],
  ["square au",        { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a payment processing platform" }],
  ["square up",        { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a payment processing and POS platform" }],
  ["square",           { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a payment processing and POS platform" }],
  ["stripe",           { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a payment processing platform" }],
  ["airwallex",        { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a global business payment platform" }],
  ["tyro",             { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "an Australian business payment terminal provider" }],
  ["wise",             { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "an international business payment platform" }],

  // ── Equipment — trade & tool retailers ────────────────────────────────────
  ["sydney tools",    { category: CATEGORIES.EQUIPMENT,  confidence: "MEDIUM", what: "a trade tools and equipment retailer" }],
  ["sydneytools",     { category: CATEGORIES.EQUIPMENT,  confidence: "MEDIUM", what: "a trade tools and equipment retailer" }],

  // ── Apple Services ────────────────────────────────────────────────────────
  // Canonical name produced by normalizeMerchant for APPLE.COM/* descriptors.
  ["apple services",  { category: CATEGORIES.SOFTWARE,   confidence: "MEDIUM", what: "Apple service subscriptions (iCloud, Apple One, App Store)" }],

  // ── Software & Subscriptions — AI / coding / startup tools ────────────────
  // NOTE: compound names precede their shorter base form so the specific entry wins first.
  ["cursor ai",       { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI-powered code editor" }],
  ["cursor",          { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI-powered code editor" }],
  ["replit",          { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an online IDE and collaborative coding platform" }],
  ["lovable dev",     { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI app-building platform" }],
  ["lovable",         { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI app-building platform" }],
  ["bolt new",        { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI web-development platform" }],
  ["bolt",            { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI web-development platform" }],
  ["stackblitz",      { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an online dev environment and code sandbox" }],
  ["windsurf",        { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI-powered code editor" }],
  ["codeium",         { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI coding assistant" }],
  ["tabnine",         { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI coding assistant" }],
  ["github copilot",  { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI coding assistant" }],
  ["copilot",         { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI coding assistant" }],
  ["perplexity ai",   { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI search and research tool" }],
  ["perplexity",      { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI search and research tool" }],
  ["poe",             { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI chatbot platform" }],
  ["groq",            { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI inference platform" }],
  ["replicate",       { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI model hosting platform" }],
  ["together ai",     { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI model API platform" }],
  ["mistral ai",      { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI model platform" }],
  ["stability ai",    { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI image generation platform" }],
  ["hugging face",    { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI model hub and platform" }],
  ["huggingface",     { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI model hub and platform" }],

  // ── Software & Subscriptions — AI video / voice / image ───────────────────
  // NOTE: pika labs must precede pika so the specific entry wins first.
  ["pika labs",       { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI video generation platform" }],
  ["pika",            { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI video generation platform" }],
  ["synthesia",       { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI video creation platform" }],
  ["heygen",          { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI video generation platform" }],
  // NOTE: runwayml must precede runway.
  ["runwayml",        { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI creative and video suite" }],
  ["runway",          { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI creative and video suite" }],
  ["elevenlabs",      { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI voice synthesis platform" }],
  ["descript",        { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI audio and video editing platform" }],
  ["veed",            { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an online video editing platform" }],
  ["capcut",          { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a video editing platform" }],
  ["kapwing",         { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an online video editing platform" }],
  ["invideo",         { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI video creation platform" }],
  ["opus clip",       { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI video clipping and repurposing tool" }],
  ["opal",            { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a professional video creation platform" }],
  ["midjourney",      { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI image generation platform" }],
  ["leonardo ai",     { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI image generation platform" }],
  ["ideogram",        { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI image generation platform" }],
  ["krea",            { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI creative platform" }],
  ["kling",           { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI video generation platform" }],
  ["higgsfield",      { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI video generation platform" }],
  ["fal ai",          { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI model inference platform" }],
  ["luma ai",         { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI video and 3D generation platform" }],
  ["suno",            { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI music generation platform" }],
  ["udio",            { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an AI music generation platform" }],

  // ── Software & Subscriptions — Developer / monitoring / infra ─────────────
  ["gitlab",          { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a DevOps and code hosting platform" }],
  ["bitbucket",       { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a code hosting and CI/CD platform" }],
  ["sentry",          { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an application monitoring and error-tracking platform" }],
  ["datadog",         { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a cloud monitoring and observability platform" }],
  ["linear",          { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a project and issue-tracking tool" }],
  ["jira",            { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a project and issue-tracking platform" }],
  ["confluence",      { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a team knowledge and documentation platform" }],
  ["docker",          { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a containerisation and development platform" }],
  ["npm",             { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a JavaScript package registry" }],
  ["planetscale",     { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a serverless MySQL database platform" }],
  ["neon",            { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a serverless Postgres database platform" }],
  // NOTE: mongo db (with space) must precede mongodb.
  ["mongo db",        { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a cloud database platform" }],
  ["mongodb",         { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a cloud database platform" }],
  ["redis",           { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an in-memory data platform" }],
  ["upstash",         { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a serverless Redis and Kafka platform" }],
  ["clerk",           { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an authentication and user management platform" }],
  ["auth0",           { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an identity and authentication platform" }],
  ["resend",          { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a transactional email API platform" }],
  ["mailgun",         { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an email delivery API platform" }],
  ["twilio",          { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a cloud communications platform" }],
  ["supabase",        { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an open-source backend-as-a-service platform" }],
  ["firebase",        { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a cloud app development platform" }],
  ["cloudflare",      { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a cloud network and security platform" }],
  // NOTE: amazon web services must precede aws so the full name matches first.
  ["amazon web services", { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "Amazon Web Services cloud platform" }],
  ["aws",             { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "Amazon Web Services cloud platform" }],
  ["google cloud",    { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "Google Cloud Platform" }],
  ["microsoft azure", { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "Microsoft Azure cloud platform" }],

  // ── Software & Subscriptions — Design / assets / content ──────────────────
  ["canva",           { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a graphic design and content creation platform" }],
  // NOTE: adobe creative cloud must precede any standalone adobe entry.
  ["adobe creative cloud", { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "Adobe Creative Cloud suite" }],
  // NOTE: envato elements must precede envato.
  ["envato elements", { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a creative asset subscription service" }],
  ["envato",          { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a creative digital assets marketplace" }],
  ["motion array",    { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a motion graphics and video asset platform" }],
  ["artlist",         { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a royalty-free music and SFX licensing platform" }],
  ["epidemic sound",  { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a royalty-free music licensing platform" }],
  ["freepik",         { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a graphic design resource platform" }],
  ["shutterstock",    { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a stock image and media licensing platform" }],
  ["istock",          { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a stock image licensing platform" }],
  ["storyblocks",     { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a royalty-free stock media platform" }],
  ["unsplash",        { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a stock photography platform" }],
  ["pexels",          { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a stock photography platform" }],
  ["flaticon",        { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an icon and graphic resource platform" }],
  ["icons8",          { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an icon and design asset platform" }],
  ["creative market", { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a digital design asset marketplace" }],
  ["placeit",         { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a branding and mockup design platform" }],

  // ── Software & Subscriptions — Business productivity / communication ───────
  ["slack",           { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a team messaging and collaboration platform" }],
  ["zoom",            { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a video conferencing and collaboration platform" }],
  ["google workspace",{ category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "Google's suite of business productivity tools" }],
  ["microsoft 365",   { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "Microsoft's suite of business productivity tools" }],
  // NOTE: microsoft teams must precede teams.
  ["microsoft teams", { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a business communication and collaboration platform" }],
  ["loom",            { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an async video messaging platform" }],
  ["miro",            { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an online collaborative whiteboard platform" }],
  ["lucidchart",      { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a diagramming and visual collaboration platform" }],
  ["docusign",        { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an e-signature and agreement platform" }],
  ["panda doc",       { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a document automation and e-signature platform" }],
  ["lastpass",        { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a password management platform" }],
  ["1password",       { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a password management platform" }],
  ["nordvpn",         { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a VPN service" }],
  ["expressvpn",      { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a VPN service" }],
  ["calendly",        { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a scheduling and appointment booking platform" }],
  ["typeform",        { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an online form and survey platform" }],
  ["jotform",         { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an online form builder" }],
  ["zapier",          { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a workflow automation platform" }],
  ["make",            { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a visual workflow automation platform" }],
  ["airtable",        { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a cloud database and collaboration platform" }],

];

function detect(tx: { normalizedMerchant: string; description: string }, _userType?: string | null): RawMatch | null {
  // ── Priority 1: fuzzy match on the raw bank descriptor ───────────────────
  // Runs before the exact ALIAS_MAP check so that the real underlying merchant
  // (e.g. Klaviyo in "SHOPIFY*KLAVIYO", OpenAI in "STRIPE*OPENAI") wins even
  // when the display normalizer has already lost it to terminal-code stripping.
  const fuzzyResult = findMerchantAliasMatch(tx.description, FUZZY_ALIAS_GROUPS);
  if (fuzzyResult) {
    if (process.env.NODE_ENV === "development") {
      console.log("[Kashio Engine] Merchant match", {
        raw:          tx.description,
        normalized:   fuzzyResult.normalizedMerchant,
        matchedAlias: fuzzyResult.matchedAlias,
        category:     fuzzyResult.category,
        matchSource:  fuzzyResult.matchSource,
      });
    }
    return {
      category:   fuzzyResult.category,
      confidence: fuzzyResult.confidence,
      canUpgrade: true,
      signals: {
        aliasMatch:    fuzzyResult.matchedAlias,
        what:          fuzzyResult.what,
        canonicalName: fuzzyResult.name,
        matchSource:   "merchant_alias_fuzzy",
      },
    };
  }

  // ── Priority 2: exact ALIAS_MAP check on the display-normalised merchant ──
  const merchant = merchantText(tx);
  for (const [name, entry] of ALIAS_MAP) {
    if (matchesMerchant(merchant, name)) {
      return {
        category:   entry.category,
        confidence: entry.confidence,
        canUpgrade: true,
        signals:    { aliasMatch: name, what: entry.what },
      };
    }
  }
  return null;
}

function explain(match: RawMatch, tx: { normalizedMerchant: string }, userType?: string | null): Explanation {
  const isBusiness  = userType === "contractor" || userType === "sole_trader";
  const context     = isBusiness ? "your business" : "your work";
  const what        = match.signals.what as string;
  // Fuzzy matches supply a canonical brand name (e.g. "Klaviyo") to avoid
  // surfacing the messy display-normalised merchant (e.g. "Shopify") in the UI.
  const displayName = (match.signals.canonicalName as string | undefined) ?? tx.normalizedMerchant;
  return {
    reason:           `${displayName} is ${what}. If this was for ${context}, it may be deductible — confirm before claiming.`,
    confidenceReason: `Recognised ${match.category.toLowerCase()} provider. Confirm it was a work or business expense before claiming.`,
    mixedUse:         true,
  };
}

export const detectMerchantAlias: Rule = { priority: 10, detect, explain };
