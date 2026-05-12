// Central pricing config — single source of truth for all paywall screens.
// iOS live prices come from RevenueCat (product.priceString).
// These fallbacks are shown only if RevenueCat fails to load.
// Web prices are hardcoded here (Stripe checkout uses these for display only).

export const PRODUCT_IDS = {
  monthly: "kashio_pro_monthly",
  annual:  "kashio_pro_yearly",
} as const;

export const FALLBACK_PRICE = {
  monthly: "$5.99",
  annual:  "$39.99",
} as const;

export const ANNUAL_SAVING_PCT = "Save 44%";
