# iOS TestFlight Fixes

## ISSUE 1 — Splash screen / loading logo not visible

### Root cause
The native `LaunchScreen.storyboard` already references a `Splash` image asset, but:
1. The `splash-2732x2732.png` was a plain dark background with no logo.
2. Capacitor was not configured to hold the native splash visible until JS loaded, causing a blank-screen gap.

### What changed
| File | Change |
|---|---|
| `ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png` | Regenerated with Kashio logo (600px wide, white) centered on `#05070E` background using Node/sharp |
| `capacitor.config.ts` | Added `SplashScreen` plugin config: `launchAutoHide: false`, `backgroundColor: '#05070E'` |
| `components/shared/AppLoadingScreen.tsx` | Calls `SplashScreen.hide({ fadeOutDuration: 300 })` on mount — bridges native splash → React loading screen |

### How it works now
1. App launches → native `LaunchScreen.storyboard` shows immediately (Kashio logo on dark background)
2. Capacitor loads WKWebView and starts fetching `https://app.kashio.com.au`
3. `@capacitor/splash-screen` keeps the native splash visible (no blank screen gap)
4. React renders `AppLoadingScreen` — which calls `SplashScreen.hide()` with a 300ms fade
5. React loading animation (pulsing logo + dots) plays while auth check runs
6. Main app content appears

### To rebuild after splash changes
```bash
cd apps/web
# Regenerate the splash PNG (if logo changes)
node -e "
const sharp = require('sharp');
const fs = require('fs');
const svgBuf = fs.readFileSync('public/logo.svg');
const W = 2732, LOGO_W = 600;
sharp(svgBuf).resize(LOGO_W).png().toBuffer().then(logo => {
  const h = Math.round(LOGO_W * (511/654));
  sharp({ create: { width: W, height: W, channels: 4, background: {r:5,g:7,b:14,alpha:1} } })
    .composite([{ input: logo, left: Math.round((W-LOGO_W)/2), top: Math.round((W-h)/2) }])
    .png()
    .toFile('ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png')
    .then(() => console.log('done'));
});
"
cp ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png
cp ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png

npx cap sync ios
# Then archive in Xcode: Product → Archive → Distribute
```

---

## ISSUE 2 — Google login does not return to app

### Root cause
Two problems:
1. Only the `kashio://` URL scheme was registered in `Info.plist`. `au.com.kashio.app://` was missing.
2. `CapacitorAuthHandler.tsx` only checked for `kashio://auth/callback`, not `au.com.kashio.app://auth/callback`.

### What changed
| File | Change |
|---|---|
| `ios/App/App/Info.plist` | Added second `CFBundleURLTypes` entry for scheme `au.com.kashio.app` |
| `components/providers/CapacitorAuthHandler.tsx` | `isAuthCallback()` helper handles both `kashio://` and `au.com.kashio.app://` |

### Required Supabase redirect URLs
These must be listed in your Supabase project under **Authentication → URL Configuration → Redirect URLs**:
```
https://app.kashio.com.au/auth/callback
kashio://auth/callback
au.com.kashio.app://auth/callback
```

### How the flow works
1. User taps "Continue with Google"
2. App calls `supabase.auth.signInWithOAuth` with `skipBrowserRedirect: true` and `redirectTo: "kashio://auth/callback"`
3. App opens the returned OAuth URL via `@capacitor/browser` (SFSafariViewController)
4. User authenticates in the in-app browser
5. Supabase redirects to `kashio://auth/callback?code=...`
6. iOS recognises `kashio://` as a registered URL scheme and fires `appUrlOpen` event
7. `CapacitorAuthHandler` catches it, closes the browser, calls `supabase.auth.exchangeCodeForSession(code)`
8. On success: redirects to `/import` (existing users) or `/onboarding` (new users)

### Testing steps
1. Install TestFlight build on device
2. Open app → tap "Continue with Google"
3. In-app Safari opens Google sign-in
4. Complete Google auth
5. App should receive the URL scheme callback and close the browser automatically
6. Dashboard (`/import`) should load

---

## ISSUE 3 — iOS price showing wrong value in UI

### Root cause
After the previous fix, `monthlyPrice` and `annualPrice` fell back to `null` when RevenueCat failed, causing "Price unavailable" to show. Apple's payment sheet always shows the correct price from App Store Connect, but the Kashio UI showed nothing.

### What changed
| File | Change |
|---|---|
| `components/shared/IOSPaywall.tsx` | Fallback prices: `null → "$5.99"` (monthly) and `null → "$39.99"` (annual) — only applied after RC has had a chance to load |

### Pricing logic
```
if (RC offerings loaded)       → show RC priceString  (e.g. "$5.99" from App Store)
if (RC loading)                → show skeleton pulse (pricesLoading = true)
if (RC failed / no packages)   → show fallback "$5.99" / "$39.99"
```

Web Stripe prices in `PaywallGate.tsx` are unchanged.

---

## ISSUE 4 — Blurred Pro preview on Export page

### Root cause
The Export page iOS locked state showed only `<IOSPaywall />` with no preview. Dashboard had a compelling blurred preview; Export did not.

### What changed
| File | Change |
|---|---|
| `app/(app)/export/PaywallGate.tsx` | Added `ExportLockedPreview` component (blurred fake export rows + frosted lock overlay), shown above `<IOSPaywall compact />` in the iOS locked path |

### Fake preview rows
- Est. total deductions: $2,847 (100% bar, green)
- Categories confirmed: 5 of 7 (71% bar, blue)
- Items with receipt: 12 of 18 (66% bar, purple)
- Export ready: Ready (100% bar, amber)

Style is consistent with `DashboardProUpsell.tsx`'s `LockedPreview`.

---

## Files changed in this fix

```
apps/web/capacitor.config.ts                                  — SplashScreen plugin config
apps/web/components/shared/AppLoadingScreen.tsx               — SplashScreen.hide() on mount
apps/web/components/shared/IOSPaywall.tsx                     — RC fallback prices
apps/web/components/providers/CapacitorAuthHandler.tsx        — both URL schemes
apps/web/app/(app)/export/PaywallGate.tsx                     — Export blurred preview
apps/web/ios/App/App/Info.plist                               — au.com.kashio.app URL scheme
apps/web/ios/App/App/Assets.xcassets/Splash.imageset/*.png    — regenerated with logo
```

## Full rebuild + upload steps

```bash
cd apps/web
npm install                          # ensure @capacitor/splash-screen is present
npx cap sync ios                     # sync plugin config + assets to Xcode project

# In Xcode:
# 1. Product → Clean Build Folder
# 2. Product → Archive
# 3. Distribute App → App Store Connect → Upload
```
