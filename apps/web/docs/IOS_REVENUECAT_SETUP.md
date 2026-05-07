# iOS RevenueCat Integration

## Overview

Kashio uses two separate payment paths depending on platform:

| Platform | Payment provider | Handler |
|----------|-----------------|---------|
| Web (browser) | Stripe | `POST /api/stripe/create-checkout-session` |
| iOS (Capacitor native) | RevenueCat + Apple IAP | `IOSPaywall` component |

**Apple IAP rule:** Stripe checkout must never open inside the iOS app. Violating this causes App Store rejection.

---

## Architecture

### Platform detection

`lib/capacitor.ts` — `isCapacitorIOS()` — returns `true` only in the Capacitor iOS WKWebView.

### RevenueCat context

`components/providers/RevenueCatProvider.tsx` wraps the app layout and exposes:

```ts
const { isIOS, offerings, isPro, loading, error, purchase, restore } = useRevenueCat();
```

- `isIOS` — resolved after first mount, single source of truth for all paywall components
- `offerings` — fetched from RC on iOS; `null` on web
- `isPro` — whether the user has an active `pro` entitlement in RC
- `purchase(pkg)` — buys an RC package, then syncs to Supabase via `POST /api/revenuecat/sync`
- `restore()` — restores purchases, then syncs to Supabase

### DB sync endpoint

`app/api/revenuecat/sync/route.ts` — called after a successful RC purchase or restore:
1. Reads user from Supabase session
2. Calls `GET https://api.revenuecat.com/v1/subscribers/{userId}` with the secret key
3. Upserts `UserEntitlement` with `productKey: "kashio_tax_summary_report"` and `isActive: true`

This means `isProUser(plan)` in `lib/plan.ts` works identically for both Stripe and RC subscribers.

### iOS paywall UI

`components/shared/IOSPaywall.tsx` — shown in place of Stripe UI when `isIOS` is true:
- Reads `current.monthly` and `current.annual` packages from `useRevenueCat().offerings`
- Shows `pkg.product.priceString` (comes from App Store Connect, respects user's region)
- Calls `purchase(pkg)` on tap
- Has a "Restore purchases" button

---

## Paywall components

All 4 paywall components use the same pattern:

```tsx
const { isIOS } = useRevenueCat(); // single source of truth — no per-component state

async function handleUpgrade() {
  if (isIOS) return; // hard guard — Stripe must never open inside the iOS app
  // ... Stripe fetch
}

if (isIOS) return <IOSPaywall />;
return /* Stripe UI */;
```

Components:
- `app/(app)/dashboard/DashboardProUpsell.tsx`
- `app/(app)/review/ReviewPaywallCard.tsx`
- `app/(app)/export/PaywallGate.tsx`
- `components/shared/ProPaywallModal.tsx`

---

## Stripe Pro users on iOS

If a user already subscribed via Stripe, the server-side `isProUser()` check in `lib/plan.ts` reads from `UserEntitlement` in the DB. This is set by the Stripe webhook (`/api/stripe/webhook`). When that user opens the iOS app, the export page (and all other gated features) will show as unlocked — no RC purchase required, no duplicate payment.

---

## Environment variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_REVENUECAT_IOS_API_KEY` | Vercel + `.env.local` | Public iOS API key from RC dashboard |
| `REVENUECAT_SECRET_KEY` | Vercel (server only) | Secret key for server-side RC subscriber lookup |

Both must be set in Vercel → Project Settings → Environment Variables.

---

## App Store Connect setup

1. Create two subscription products in App Store Connect under the Kashio app:
   - `kashio_monthly` — Monthly, AUD $5.99
   - `kashio_annual` — Annual, AUD $39.99
2. Set availability for all relevant territories.
3. In RevenueCat dashboard:
   - Create entitlement: `pro`
   - Create offering: `default`
   - Add both products as packages under the default offering

---

## Testing

### Simulator
IAP does not work on the iOS simulator. Use a real device.

### Sandbox testing
1. In App Store Connect → Users and Access → Sandbox → Testers: create a tester with an Australian region and an email not already linked to an Apple ID (Gmail alias works).
2. On the device, sign out of the App Store, then sign in with the sandbox tester account.
3. The RC paywall will show AUD prices from App Store Connect.

### Dev unlock (web only)
Visit `/export?dev_unlock=1` to simulate a paid user in the browser without a subscription.
