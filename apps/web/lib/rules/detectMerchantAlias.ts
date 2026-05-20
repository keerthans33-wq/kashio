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
import { findMerchantAliasMatch, FUZZY_ALIAS_GROUPS, extractMerchantTokens } from "./merchantMatcher";
import { getMerchantInfo } from "../merchants";

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
  ["youtube promote", { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an online advertising platform" }],
  ["pinterest ads",   { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "a social media advertising platform" }],
  // snap ads must precede snapchat ads so "Snap Ads" display name matches before the longer form.
  ["snap ads",        { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "a social media advertising platform" }],
  ["snapchat ads",    { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "a social media advertising platform" }],
  ["reddit ads",      { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an online advertising platform" }],
  // microsoft advertising must precede microsoft ads (longer key wins first-match).
  ["microsoft advertising", { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an online advertising platform" }],
  ["bing ads",        { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an online advertising platform" }],
  ["microsoft ads",   { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an online advertising platform" }],
  ["taboola",         { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "a content discovery and native advertising platform" }],
  ["outbrain",        { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "a content discovery and native advertising platform" }],
  ["adroll",          { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "a retargeting and digital advertising platform" }],
  ["criteo",          { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "a commerce media and retargeting advertising platform" }],
  // ── SEO / analytics ───────────────────────────────────────────────────────
  ["semrush",         { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an SEO and digital marketing platform" }],
  ["ahrefs",          { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an SEO analytics platform" }],
  ["moz pro",         { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an SEO software platform" }],
  ["moz",             { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an SEO software platform" }],
  ["ubersuggest",     { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an SEO and keyword research tool" }],
  ["neilpatel",       { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an SEO and digital marketing platform" }],
  ["neil patel",      { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an SEO and digital marketing platform" }],
  // screaming frog must precede screamingfrog (longer key wins).
  ["screaming frog",  { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an SEO crawling and auditing tool" }],
  ["screamingfrog",   { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an SEO crawling and auditing tool" }],
  ["surfer seo",      { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an SEO content optimisation tool" }],
  ["surferseo",       { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an SEO content optimisation tool" }],
  ["hotjar",          { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "a website analytics and heatmap tool" }],
  ["microsoft clarity", { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a website heatmap and analytics tool" }],
  ["ms clarity",      { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a website heatmap and analytics tool" }],
  ["mixpanel",        { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a product analytics platform" }],
  ["amplitude",       { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a product analytics platform" }],
  ["posthog",         { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "an open-source product analytics platform" }],
  ["fullstory",       { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a digital experience analytics platform" }],
  // ── Email marketing / CRM ─────────────────────────────────────────────────
  ["mailchimp",       { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an email marketing platform" }],
  ["klaviyo",         { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an email and SMS marketing platform" }],
  ["activecampaign",  { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "a marketing automation and CRM platform" }],
  ["brevo",           { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an email marketing platform" }],
  ["convertkit",      { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an email marketing platform for creators" }],
  ["sendgrid",        { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an email delivery platform" }],
  // constant contact must precede constantcontact.
  ["constant contact", { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an email marketing platform" }],
  ["constantcontact", { category: CATEGORIES.MARKETING, confidence: "MEDIUM", what: "an email marketing platform" }],
  // ── CRM / sales / support ─────────────────────────────────────────────────
  ["hubspot",         { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a CRM and marketing automation platform" }],
  ["salesforce",      { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a CRM and business software platform" }],
  // zoho crm must precede zoho.
  ["zoho crm",        { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a cloud CRM platform" }],
  ["zoho",            { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a cloud business software platform" }],
  ["pipedrive",       { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a sales CRM and pipeline management tool" }],
  ["freshdesk",       { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a customer support and helpdesk platform" }],
  ["zendesk",         { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a customer service and support platform" }],
  ["intercom",        { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a customer messaging and support platform" }],
  // help scout must precede helpscout.
  ["help scout",      { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a customer support platform" }],
  ["helpscout",       { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a customer support platform" }],
  ["drift",           { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a conversational marketing and sales platform" }],
  ["crisp",           { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a customer messaging platform" }],

  // ── Accounting & Business ──────────────────────────────────────────────────
  ["xero",            { category: CATEGORIES.ACCOUNTING, confidence: "HIGH",   what: "cloud accounting software" }],
  ["myob",            { category: CATEGORIES.ACCOUNTING, confidence: "HIGH",   what: "accounting and payroll software" }],
  // h&r block must precede shorter variants
  ["h&r block",       { category: CATEGORIES.ACCOUNTING, confidence: "HIGH",   what: "a tax and accounting services provider" }],
  ["hr block",        { category: CATEGORIES.ACCOUNTING, confidence: "HIGH",   what: "a tax and accounting services provider" }],
  ["quickbooks",      { category: CATEGORIES.ACCOUNTING, confidence: "MEDIUM", what: "accounting and invoicing software" }],
  ["quick books",     { category: CATEGORIES.ACCOUNTING, confidence: "MEDIUM", what: "accounting and invoicing software" }],
  ["intuit",          { category: CATEGORIES.ACCOUNTING, confidence: "MEDIUM", what: "accounting software (QuickBooks)" }],
  ["reckon",          { category: CATEGORIES.ACCOUNTING, confidence: "MEDIUM", what: "accounting software" }],
  ["freshbooks",      { category: CATEGORIES.ACCOUNTING, confidence: "MEDIUM", what: "invoicing and accounting software" }],
  ["invoice2go",      { category: CATEGORIES.ACCOUNTING, confidence: "MEDIUM", what: "mobile invoicing software" }],
  ["hnry",            { category: CATEGORIES.ACCOUNTING, confidence: "MEDIUM", what: "a contractor tax and invoicing service" }],
  ["rounded",         { category: CATEGORIES.ACCOUNTING, confidence: "MEDIUM", what: "an invoicing and income management tool for freelancers" }],
  ["asic",            { category: CATEGORIES.ACCOUNTING, confidence: "MEDIUM", what: "the Australian Securities and Investments Commission — business registration and compliance fees" }],
  // ATO fees (BAS lodgment, PAYG, business registration) are deductible for businesses;
  // routine income-tax payments are not — the LOW→MEDIUM path flags for human review.
  ["ato",             { category: CATEGORIES.ACCOUNTING, confidence: "MEDIUM", what: "the Australian Taxation Office — business registration or compliance fees" }],

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
  // NOTE: hostgator/bluehost/siteground etc. must precede generic "hostinger"
  // so more-specific keys don't accidentally match the shorter form.
  ["hostgator",       { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a web hosting provider" }],
  ["bluehost",        { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a web hosting provider" }],
  ["siteground",      { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a web hosting provider" }],
  ["dnsimple",        { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a domain registration and DNS management service" }],
  ["dreamhost",       { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a web hosting provider" }],
  ["hostinger",       { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a web hosting and domain service" }],
  ["hostpapa",        { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a web hosting provider" }],
  ["panthur",         { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "an Australian web hosting provider" }],
  ["ventraip",        { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "an Australian web hosting and domain provider" }],
  ["kinsta",          { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a managed WordPress hosting platform" }],
  // wp engine must precede wpengine.
  ["wp engine",       { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a managed WordPress hosting platform" }],
  ["wpengine",        { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a managed WordPress hosting platform" }],
  ["cloudways",       { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a managed cloud hosting platform" }],
  ["fly io",          { category: CATEGORIES.WEBSITE_DOMAINS, confidence: "MEDIUM", what: "a cloud application hosting platform" }],
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
  // CDN / edge
  ["bunny cdn",       { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a content delivery network" }],
  ["bunnycdn",        { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a content delivery network" }],
  ["fastly",          { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a content delivery network and edge cloud platform" }],
  ["akamai",          { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a content delivery and cloud security platform" }],

  // ── Payment Processing ─────────────────────────────────────────────────────
  // Only clearly-business merchant service fees belong here.
  // Ambiguous payment platforms (Wise, bare PayPal, bare Zip/Afterpay) are handled by
  // detectAmbiguousPayment at LOW/MEDIUM Uncategorised so users must confirm deductibility.

  // PayPal — only explicit fee/merchant variants are business expenses.
  // "paypal australia" / "paypal au" removed: normalizeMerchant now produces bare "PayPal"
  // for those descriptors, which detectAmbiguousPayment intercepts at LOW confidence.
  ["paypal fee",              { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a payment processing fee" }],
  ["paypal merchant",         { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a payment processing service" }],
  // Square — squarespace entry above must remain earlier in the list (longer key wins via first-match).
  ["squareup",                { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a payment processing and POS platform" }],
  ["square payments",         { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a payment processing platform" }],
  ["square pos",              { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a point of sale system" }],
  ["square au",               { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a payment processing platform" }],
  ["square up",               { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a payment processing and POS platform" }],
  ["square",                  { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a payment processing and POS platform" }],
  ["stripe",                  { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a payment processing platform" }],
  ["airwallex",               { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a global business payment platform" }],
  ["tyro",                    { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "an Australian business payment terminal provider" }],
  // "wise" removed — Wise is ambiguous (personal vs business transfer). detectAmbiguousPayment handles it.
  // EFTPOS Air — MERCHANT_ALIASES preserves display name before PREFIXES strips EFTPOS.
  ["eftpos air",              { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a wireless EFTPOS terminal service" }],
  // Afterpay merchant — more specific forms must precede generic.
  ["afterpay merchant fee",   { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a buy-now-pay-later merchant processing fee" }],
  ["afterpay merchant",       { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a buy-now-pay-later merchant processing fee" }],
  // Zip merchant — only the business-merchant variant is Payment Processing.
  // "zip co" / "zip pay" removed — consumer BNPL payments handled by detectAmbiguousPayment.
  ["zip merchant",            { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a buy-now-pay-later merchant processing fee" }],
  ["zeller",                  { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "an Australian business banking and payment platform" }],
  ["sumup",                   { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a card payment and POS platform" }],
  ["smartpay",                { category: CATEGORIES.PAYMENT_PROCESSING, confidence: "MEDIUM", what: "a payment terminal service" }],

  // ── Equipment — general electronics retailers ────────────────────────────
  // jb hi-fi must precede shorter "jb" if any; checked against normalized merchant
  ["jb hi-fi",        { category: CATEGORIES.EQUIPMENT,  confidence: "MEDIUM", what: "an electronics and technology retailer" }],
  ["harvey norman",   { category: CATEGORIES.EQUIPMENT,  confidence: "MEDIUM", what: "an electronics and home goods retailer" }],
  ["the good guys",   { category: CATEGORIES.EQUIPMENT,  confidence: "MEDIUM", what: "an electronics and appliance retailer" }],

  // ── Equipment — trade, tool, and computer hardware retailers ─────────────
  ["sydney tools",    { category: CATEGORIES.EQUIPMENT,  confidence: "MEDIUM", what: "a trade tools and equipment retailer" }],
  ["sydneytools",     { category: CATEGORIES.EQUIPMENT,  confidence: "MEDIUM", what: "a trade tools and equipment retailer" }],
  ["total tools",     { category: CATEGORIES.EQUIPMENT,  confidence: "MEDIUM", what: "a trade tools and equipment retailer" }],
  // bunnings — MEDIUM since purchases may be personal but hardware work use is common.
  ["bunnings",        { category: CATEGORIES.EQUIPMENT,  confidence: "MEDIUM", what: "a hardware and building supplies retailer" }],
  // msy technology must precede msy (longer key wins).
  ["msy technology",  { category: CATEGORIES.EQUIPMENT,  confidence: "MEDIUM", what: "a computer hardware and electronics retailer" }],
  ["msy",             { category: CATEGORIES.EQUIPMENT,  confidence: "MEDIUM", what: "a computer hardware and electronics retailer" }],
  // centre com must precede centrecom.
  ["centre com",      { category: CATEGORIES.EQUIPMENT,  confidence: "MEDIUM", what: "a computer hardware retailer" }],
  ["centrecom",       { category: CATEGORIES.EQUIPMENT,  confidence: "MEDIUM", what: "a computer hardware retailer" }],
  ["mwave",           { category: CATEGORIES.EQUIPMENT,  confidence: "MEDIUM", what: "a computer hardware retailer" }],
  ["computer alliance", { category: CATEGORIES.EQUIPMENT, confidence: "MEDIUM", what: "a computer hardware retailer" }],
  ["ple computers",   { category: CATEGORIES.EQUIPMENT,  confidence: "MEDIUM", what: "a computer hardware retailer" }],
  ["pccasegear",      { category: CATEGORIES.EQUIPMENT,  confidence: "MEDIUM", what: "a computer hardware and gaming retailer" }],
  ["jw computers",    { category: CATEGORIES.EQUIPMENT,  confidence: "MEDIUM", what: "a computer hardware retailer" }],
  ["umart",           { category: CATEGORIES.EQUIPMENT,  confidence: "MEDIUM", what: "a computer hardware and electronics retailer" }],
  ["scorptec",        { category: CATEGORIES.EQUIPMENT,  confidence: "MEDIUM", what: "a computer hardware retailer" }],
  ["jaycar",          { category: CATEGORIES.EQUIPMENT,  confidence: "MEDIUM", what: "an electronics and tech components retailer" }],
  ["dell",            { category: CATEGORIES.EQUIPMENT,  confidence: "MEDIUM", what: "a computer and technology hardware brand" }],
  ["lenovo",          { category: CATEGORIES.EQUIPMENT,  confidence: "MEDIUM", what: "a computer and technology hardware brand" }],

  // ── Professional Development ──────────────────────────────────────────────
  ["tafe",              { category: CATEGORIES.PROFESSIONAL_DEVELOPMENT, confidence: "HIGH",   what: "a TAFE vocational education and training provider" }],
  // linkedin learning must precede linkedin ads/premium (longer key wins).
  ["linkedin learning", { category: CATEGORIES.PROFESSIONAL_DEVELOPMENT, confidence: "MEDIUM", what: "an online learning platform for professional skills" }],
  ["general assembly",  { category: CATEGORIES.PROFESSIONAL_DEVELOPMENT, confidence: "MEDIUM", what: "a tech and digital skills training provider" }],
  ["tax institute",     { category: CATEGORIES.PROFESSIONAL_DEVELOPMENT, confidence: "MEDIUM", what: "a professional tax body offering education and membership" }],
  ["acs australia",     { category: CATEGORIES.PROFESSIONAL_DEVELOPMENT, confidence: "MEDIUM", what: "the Australian Computer Society professional membership" }],
  ["acs",               { category: CATEGORIES.PROFESSIONAL_DEVELOPMENT, confidence: "MEDIUM", what: "the Australian Computer Society professional membership" }],
  ["project management institute", { category: CATEGORIES.PROFESSIONAL_DEVELOPMENT, confidence: "MEDIUM", what: "a professional project management membership body" }],
  ["project management inst",      { category: CATEGORIES.PROFESSIONAL_DEVELOPMENT, confidence: "MEDIUM", what: "a professional project management membership body" }],
  ["pmi membership",    { category: CATEGORIES.PROFESSIONAL_DEVELOPMENT, confidence: "MEDIUM", what: "a professional project management membership" }],
  ["cpa australia",     { category: CATEGORIES.PROFESSIONAL_DEVELOPMENT, confidence: "MEDIUM", what: "a professional accounting membership body" }],
  ["chartered accountants anz", { category: CATEGORIES.PROFESSIONAL_DEVELOPMENT, confidence: "MEDIUM", what: "a professional accounting membership body" }],
  ["ca anz",            { category: CATEGORIES.PROFESSIONAL_DEVELOPMENT, confidence: "MEDIUM", what: "the Chartered Accountants Australia and New Zealand membership" }],
  ["engineers australia", { category: CATEGORIES.PROFESSIONAL_DEVELOPMENT, confidence: "MEDIUM", what: "the Engineers Australia professional membership" }],
  ["aicd",              { category: CATEGORIES.PROFESSIONAL_DEVELOPMENT, confidence: "MEDIUM", what: "the Australian Institute of Company Directors membership" }],
  ["ausimm",            { category: CATEGORIES.PROFESSIONAL_DEVELOPMENT, confidence: "MEDIUM", what: "the Australasian Institute of Mining and Metallurgy membership" }],
  ["ahri",              { category: CATEGORIES.PROFESSIONAL_DEVELOPMENT, confidence: "MEDIUM", what: "the Australian HR Institute professional membership" }],
  ["governance institute", { category: CATEGORIES.PROFESSIONAL_DEVELOPMENT, confidence: "MEDIUM", what: "a governance and risk professional membership body" }],
  ["institute of public accountants", { category: CATEGORIES.PROFESSIONAL_DEVELOPMENT, confidence: "MEDIUM", what: "a professional accounting membership body" }],
  ["pluralsight",       { category: CATEGORIES.PROFESSIONAL_DEVELOPMENT, confidence: "MEDIUM", what: "a tech skills learning platform" }],
  ["domestika",         { category: CATEGORIES.PROFESSIONAL_DEVELOPMENT, confidence: "MEDIUM", what: "an online creative skills learning platform" }],
  ["edx",               { category: CATEGORIES.PROFESSIONAL_DEVELOPMENT, confidence: "MEDIUM", what: "an online education platform" }],
  ["coursera",          { category: CATEGORIES.PROFESSIONAL_DEVELOPMENT, confidence: "HIGH",   what: "an online learning and professional development platform" }],
  ["udemy",             { category: CATEGORIES.PROFESSIONAL_DEVELOPMENT, confidence: "HIGH",   what: "an online learning and professional development platform" }],

  // ── Office Supplies ───────────────────────────────────────────────────────
  ["officeworks",      { category: CATEGORIES.OFFICE_SUPPLIES, confidence: "HIGH",   what: "an office supplies and technology retailer" }],
  // big w office must precede any shorter "big w" entry (longer key wins).
  ["big w office",     { category: CATEGORIES.OFFICE_SUPPLIES, confidence: "MEDIUM", what: "an office supplies section of Big W" }],
  ["office choice",    { category: CATEGORIES.OFFICE_SUPPLIES, confidence: "MEDIUM", what: "an office supplies retailer" }],
  // amazon business must precede any generic "amazon" entry.
  ["amazon business",  { category: CATEGORIES.OFFICE_SUPPLIES, confidence: "MEDIUM", what: "an Amazon business purchasing account" }],

  // ── Work Clothing — workwear, PPE, and safety footwear ───────────────────
  // rsea safety must precede rsea (longer key wins).
  ["rsea safety",     { category: CATEGORIES.WORK_CLOTHING, confidence: "MEDIUM", what: "a safety and workwear retailer" }],
  ["rsea",            { category: CATEGORIES.WORK_CLOTHING, confidence: "MEDIUM", what: "a safety and workwear retailer" }],
  // totally workwear must precede totallyworkwear.
  ["totally workwear", { category: CATEGORIES.WORK_CLOTHING, confidence: "MEDIUM", what: "a workwear and safety clothing retailer" }],
  ["totallyworkwear",  { category: CATEGORIES.WORK_CLOTHING, confidence: "MEDIUM", what: "a workwear and safety clothing retailer" }],
  ["worklocker",      { category: CATEGORIES.WORK_CLOTHING, confidence: "MEDIUM", what: "a workwear retailer" }],
  ["hip pocket workwear", { category: CATEGORIES.WORK_CLOTHING, confidence: "MEDIUM", what: "a workwear retailer" }],
  ["hip pocket",      { category: CATEGORIES.WORK_CLOTHING, confidence: "MEDIUM", what: "a workwear retailer" }],
  ["blackwoods",      { category: CATEGORIES.WORK_CLOTHING, confidence: "MEDIUM", what: "an industrial safety and workwear supplier" }],
  ["bisley workwear", { category: CATEGORIES.WORK_CLOTHING, confidence: "MEDIUM", what: "a workwear brand" }],
  ["bisley",          { category: CATEGORIES.WORK_CLOTHING, confidence: "MEDIUM", what: "a workwear brand" }],
  ["hard yakka",      { category: CATEGORIES.WORK_CLOTHING, confidence: "MEDIUM", what: "a workwear brand" }],
  ["kinggee",         { category: CATEGORIES.WORK_CLOTHING, confidence: "MEDIUM", what: "a workwear brand" }],
  ["steel blue",      { category: CATEGORIES.WORK_CLOTHING, confidence: "MEDIUM", what: "a safety footwear brand" }],
  ["mongrel boots",   { category: CATEGORIES.WORK_CLOTHING, confidence: "MEDIUM", what: "a safety footwear brand" }],
  ["redback boots",   { category: CATEGORIES.WORK_CLOTHING, confidence: "MEDIUM", what: "a safety footwear brand" }],
  ["puma safety",     { category: CATEGORIES.WORK_CLOTHING, confidence: "MEDIUM", what: "a safety footwear brand" }],
  ["safetyquip",      { category: CATEGORIES.WORK_CLOTHING, confidence: "MEDIUM", what: "a safety equipment and workwear supplier" }],
  ["protector alsafe", { category: CATEGORIES.WORK_CLOTHING, confidence: "MEDIUM", what: "a safety equipment and workwear supplier" }],
  ["workwearhub",     { category: CATEGORIES.WORK_CLOTHING, confidence: "MEDIUM", what: "an online workwear retailer" }],
  ["tradies",         { category: CATEGORIES.WORK_CLOTHING, confidence: "MEDIUM", what: "a workwear and safety clothing retailer" }],
  ["scrubs australia", { category: CATEGORIES.WORK_CLOTHING, confidence: "MEDIUM", what: "a medical and work uniform retailer" }],

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
  ["canva",           { category: CATEGORIES.SOFTWARE, confidence: "HIGH",   what: "a graphic design and content creation platform" }],
  // NOTE: adobe creative cloud must precede any standalone adobe entry.
  ["adobe creative cloud", { category: CATEGORIES.SOFTWARE, confidence: "HIGH",   what: "Adobe Creative Cloud suite" }],
  ["adobe",           { category: CATEGORIES.SOFTWARE, confidence: "HIGH",   what: "Adobe software and Creative Cloud subscription" }],
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

  // ── Software & Subscriptions — Phone & Internet ───────────────────────────
  ["telstra",         { category: CATEGORIES.PHONE_INTERNET, confidence: "HIGH",   what: "an Australian telecommunications provider" }],
  ["optus",           { category: CATEGORIES.PHONE_INTERNET, confidence: "HIGH",   what: "an Australian telecommunications provider" }],
  ["vodafone",        { category: CATEGORIES.PHONE_INTERNET, confidence: "HIGH",   what: "an Australian telecommunications provider" }],
  ["tpg",             { category: CATEGORIES.PHONE_INTERNET, confidence: "HIGH",   what: "an Australian internet and phone provider" }],
  ["aussie broadband",{ category: CATEGORIES.PHONE_INTERNET, confidence: "HIGH",   what: "an Australian internet service provider" }],
  ["iinet",           { category: CATEGORIES.PHONE_INTERNET, confidence: "HIGH",   what: "an Australian internet service provider" }],
  ["internode",       { category: CATEGORIES.PHONE_INTERNET, confidence: "HIGH",   what: "an Australian internet service provider" }],
  ["superloop",       { category: CATEGORIES.PHONE_INTERNET, confidence: "HIGH",   what: "an Australian internet service provider" }],

  // ── Software & Subscriptions — Business productivity / communication ───────
  ["slack",           { category: CATEGORIES.SOFTWARE, confidence: "HIGH",   what: "a team messaging and collaboration platform" }],
  ["zoom",            { category: CATEGORIES.SOFTWARE, confidence: "HIGH",   what: "a video conferencing and collaboration platform" }],
  ["google workspace",{ category: CATEGORIES.SOFTWARE, confidence: "HIGH",   what: "Google's suite of business productivity tools" }],
  ["microsoft 365",   { category: CATEGORIES.SOFTWARE, confidence: "HIGH",   what: "Microsoft's suite of business productivity tools" }],
  ["notion",          { category: CATEGORIES.SOFTWARE, confidence: "HIGH",   what: "a team workspace and knowledge management platform" }],
  ["github",          { category: CATEGORIES.SOFTWARE, confidence: "HIGH",   what: "a code hosting and developer collaboration platform" }],
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
  ["dropbox",         { category: CATEGORIES.SOFTWARE, confidence: "HIGH",   what: "a cloud storage and file sharing service" }],

  // ── Software & Subscriptions — AI companies ───────────────────────────────
  // NOTE: openai must precede chatgpt (longer key convention)
  ["openai",          { category: CATEGORIES.SOFTWARE, confidence: "HIGH",   what: "an AI platform — OpenAI API or ChatGPT subscription" }],
  ["chatgpt",         { category: CATEGORIES.SOFTWARE, confidence: "HIGH",   what: "an AI assistant subscription (ChatGPT by OpenAI)" }],
  // NOTE: anthropic must precede claude ai so the company billing name matches first.
  ["anthropic",       { category: CATEGORIES.SOFTWARE, confidence: "HIGH",   what: "an AI company — Claude AI subscription" }],
  // "CLAUDE AI" normalises to "Claude Ai"; "CLAUDE.AI" normalises to "Claude AI"
  // via a normalizeMerchant alias — both lowercase to "claude ai".
  ["claude ai",       { category: CATEGORIES.SOFTWARE, confidence: "HIGH",   what: "an AI assistant subscription (Claude by Anthropic)" }],

  // ── Software & Subscriptions — CRM / marketing automation ────────────────
  // NOTE: gohighlevel must precede highlevel so the longer key wins.
  // normalizeMerchant maps "GO HIGH LEVEL" → "GoHighLevel" before LOCATION_SLUG strips it.
  ["gohighlevel",     { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a CRM and marketing automation platform" }],
  ["go high level",   { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a CRM and marketing automation platform" }],
  ["highlevel",       { category: CATEGORIES.SOFTWARE, confidence: "MEDIUM", what: "a CRM and marketing automation platform" }],

];

function detect(tx: { normalizedMerchant: string; description: string }, _userType?: string | null): RawMatch | null {
  // If normalizeMerchant has already resolved this description to a known
  // transport merchant, skip fuzzy matching entirely. The raw description may
  // contain words that match unrelated aliases (e.g. "UBER HELP.UBER.COM"
  // normalises to "Uber" — transport — but "HELP" fires importantTokenMatch for
  // "Help Scout" via the raw descriptor). Transport merchants are definitively
  // identified by normalizeMerchant; fuzzy overrides would only produce false positives.
  const merchantInfo = getMerchantInfo(tx.normalizedMerchant);
  if (merchantInfo?.category === CATEGORIES.WORK_TRAVEL) return null;

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

  // ── Priority 2: Generic app-store charges — LOW confidence ───────────────
  // Runs after the fuzzy merchant check (which surfaces known blended merchants
  // like PAYPAL*FIGMA → Figma) but before ALIAS_MAP (which would otherwise
  // return MEDIUM for "Apple Services").
  //
  // Fires when:
  //   • normalizedMerchant is "Apple Services" (APPLE.COM/* or APPLE SERVICES),
  //     or the raw descriptor starts with "GOOGLE PLAY"
  // AND extractMerchantTokens returns no residual token beyond platform noise.
  //
  // If a useful token is present (e.g. APPLE.COM/ICLOUD → ["icloud"]) the check
  // is skipped so ALIAS_MAP can handle it at MEDIUM confidence.
  {
    const merchantLower = tx.normalizedMerchant.toLowerCase();
    const isAppleServices = merchantLower === "apple services";
    const isGooglePlay    = /^google\s+play\b/i.test(tx.description);
    if (isAppleServices || isGooglePlay) {
      const residualTokens = extractMerchantTokens(tx.description);
      if (residualTokens.length === 0) {
        const displayName = isAppleServices ? "Apple Services" : "Google Play";
        return {
          category:   CATEGORIES.SOFTWARE,
          confidence: "MEDIUM",
          canUpgrade: true,
          signals: {
            appStore:    true,
            displayName,
            what:        "app store subscriptions",
            matchSource: "app_store_generic",
          },
        };
      }
    }
  }

  // ── Priority 3: exact ALIAS_MAP check on the display-normalised merchant ──
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
  if (match.signals.appStore) {
    const displayName = match.signals.displayName as string;
    return {
      reason:           `${displayName} charge detected. App-store subscriptions may be work-related — review the underlying app or receipt before claiming.`,
      confidenceReason: "App-store charges can cover many different apps. Check your receipt to confirm which app this is and whether it was used for work.",
      mixedUse:         true,
    };
  }

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
