# Required External Settings

These cannot be fixed in code alone. You must configure them manually in each dashboard.

---

## 1. Supabase — Auth Redirect URLs

Go to: **Supabase Dashboard → Authentication → URL Configuration → Redirect URLs**

Add these exact URLs:

```
https://app.kashio.com.au/auth/callback
kashio://auth/callback
au.com.kashio.app://auth/callback
```

**Why:** The iOS app sends `redirectTo: "kashio://auth/callback"` when starting Google OAuth. Supabase
will only redirect to URLs on this whitelist. If the URL is not listed here, Supabase will reject the
OAuth request or redirect to an error page, and the app URL scheme callback will never fire.

**Web (`https://app.kashio.com.au/auth/callback`) must stay** — removing it breaks web Google login.

---

## 2. RevenueCat — Offering & Product Setup

Go to: **RevenueCat Dashboard → Offerings → default**

Ensure the **"default"** offering contains two packages with these exact product identifiers:

| Package | Product identifier | App Store price |
|---|---|---|
| Monthly | `kashio_pro_monthly` | $5.99 AUD / month |
| Yearly  | `kashio_pro_yearly`  | $39.99 AUD / year |

**Why the UI shows old prices:** The code looks up packages by product ID
(`kashio_pro_monthly`, `kashio_pro_yearly`) using `availablePackages`. If RevenueCat's "default"
offering is pointing to old product IDs (e.g. from an earlier App Store listing), `priceString`
will return the old App Store price. Fix this in the RC dashboard by updating the offering to
point to the correct product identifiers above.

---

## 3. App Store Connect — In-App Purchases

Go to: **App Store Connect → Apps → Kashio → In-App Purchases**

Confirm these products exist and are **Approved** / **Ready to Submit**:

| Product ID | Type | Price |
|---|---|---|
| `kashio_pro_monthly` | Auto-Renewable Subscription | $5.99 AUD |
| `kashio_pro_yearly`  | Auto-Renewable Subscription | $39.99 AUD |

If prices show incorrectly in the Apple purchase sheet, the product prices here need updating.

---

## 4. Xcode — Rebuild After Config Changes

After merging the `ios-capacitor` branch, run:

```bash
cd apps/web
npx cap sync ios
```

Then in Xcode:
1. **Product → Clean Build Folder**
2. **Product → Archive**
3. **Distribute App → App Store Connect → Upload**

The `npx cap sync` step is required after:
- Changing `capacitor.config.ts` (SplashScreen plugin config)
- Installing new Capacitor plugins (`@capacitor/app`, `@capacitor/browser`, `@capacitor/splash-screen`)
- Modifying `Info.plist` (URL schemes)

---

## 5. Verification Steps After Deploy

### Issue 1 (Prices)
- Open app → tap any Pro feature
- Console should log: `[Kashio] iOS RevenueCat price loaded: monthly=$5.99, yearly=$39.99`
- If it logs old prices, the RC offering is still pointing to old products → fix in RC dashboard

### Issue 2 (Google login)
- Tap "Continue with Google" on login screen
- Console should log: `[Kashio] Starting iOS Google OAuth with redirectTo: kashio://auth/callback`
- After Google auth, console should log: `[Kashio] Received appUrlOpen: kashio://auth/callback?code=...`
- Then: `[Kashio] Supabase session restored after deep link`
- If `appUrlOpen` never fires: confirm `kashio://auth/callback` is in Supabase redirect URLs (step 1)

### Issue 3 (Export blur)
- Log in as a non-Pro user → go to Export tab
- Should see blurred "Tax Summary Report" preview with fake rows and a lock overlay
- "Pro Export" badge in top-right corner
- `IOSPaywall compact` below (with loading skeleton, then RC prices)

### Issue 4 (Splash)
- Cold launch the app
- Should see Kashio logo on dark `#05070E` background (from native launch screen)
- Immediately followed by branded React loading screen (pulsing logo + "Preparing your tax workspace…")
- Console should log: `[Kashio] Kashio splash mounted`
- Then `[Kashio] Kashio splash hidden after app ready`
