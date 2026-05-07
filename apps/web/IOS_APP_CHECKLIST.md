# Kashio iOS App Checklist

## Identity

| Item | Status | Detail |
|------|--------|--------|
| App display name | ✅ Done | `CFBundleDisplayName = Kashio` in Info.plist |
| Bundle ID | ✅ Done | `au.com.kashio.app` — Debug and Release both confirmed in project.pbxproj |
| `capacitor.config.ts` appId | ✅ Done | `appId: 'au.com.kashio.app'`, `appName: 'Kashio'` |
| Marketing version | ✅ Done | `MARKETING_VERSION = 1.0` |
| Build number | ✅ Done | `CURRENT_PROJECT_VERSION = 1` — increment before each TestFlight / App Store upload |
| Minimum iOS version | ✅ Done | `IPHONEOS_DEPLOYMENT_TARGET = 15.0` |

---

## Assets

| Item | Status | Detail |
|------|--------|--------|
| App icon | ✅ Done | 1024×1024 — dark bg (#05070E), white "K" lettermark, green accent dot. **Replace with final designer icon before App Store submission.** |
| Splash screen images | ✅ Done | 2732×2732 PNGs (1x / 2x / 3x) — dark bg, "Kashio" wordmark, green dot |
| LaunchScreen.storyboard | ✅ Done | Background set to Kashio dark (#05070E) — no white flash before splash image renders |

---

## Permissions

| Key | Status | String |
|-----|--------|--------|
| `NSCameraUsageDescription` | ✅ Done | "Kashio needs camera access to photograph your receipts." |
| `NSPhotoLibraryUsageDescription` | ✅ Done | "Kashio needs photo library access to upload your receipts." |
| `NSPhotoLibraryAddUsageDescription` | ✅ Done | "Kashio may save processed receipt images to your photo library." |

---

## Payments (RevenueCat / Apple IAP)

| Item | Status | Detail |
|------|--------|--------|
| RevenueCat SDK | ✅ Done | `@revenuecat/purchases-capacitor@13.0.1` |
| RC entitlement | ✅ Done | `"pro"` — checked after purchase and restore |
| RC offering | ⬜ Verify | Default offering `"default"` must contain monthly + annual packages in RC dashboard |
| IAP products in App Store Connect | ⬜ Verify | `kashio_monthly` ($5.99 AUD) and `kashio_annual` ($39.99 AUD) — status must be "Ready to Submit" |
| Stripe guard on iOS | ✅ Done | `if (isIOS) return` at top of every Stripe handler — Stripe never opens inside the app |
| Existing Stripe Pro users on iOS | ✅ Done | Server-side `isProUser()` reads `UserEntitlement` — Stripe subscribers show as Pro without re-purchasing |

---

## Architecture

| Item | Status | Detail |
|------|--------|--------|
| Remote URL loading | ✅ Done | `server.url: 'https://app.kashio.com.au'` in capacitor.config.ts |
| Safe area — Dynamic Island | ✅ Done | Nav: `paddingTop: env(safe-area-inset-top)` |
| Safe area — home indicator | ✅ Done | BottomNav: `paddingBottom: env(safe-area-inset-bottom)` |
| Content clearance — FAB | ✅ Done | Layout wrapper: `pb-36` (144px) clears the Receipt FAB top edge |
| Portrait orientation | ⬜ Recommended | Info.plist currently allows landscape — consider restricting to portrait-only for iPhone (`UIInterfaceOrientationPortrait` only) |
| `@capacitor/camera` | ✅ Done | v8.2.0 — used for receipt photo capture |

---

## App Store Connect — Before Submission

| Item | Status | Notes |
|------|--------|-------|
| App description | ⬜ Required | Short + long description, keyword field |
| Age rating | ⬜ Required | Complete questionnaire in App Store Connect |
| Category | ⬜ Required | Suggested: Finance |
| Privacy policy URL | ⬜ Required | `https://kashio.com.au/legal/privacy` |
| Support URL | ⬜ Required | `https://kashio.com.au` or support email |
| Screenshots — 6.9" (iPhone 16 Pro Max) | ⬜ Required | At least 3 screenshots |
| Screenshots — 6.5" (iPhone 14 Plus) | ⬜ Required | At least 3 screenshots |
| Screenshots — 5.5" (iPhone 8 Plus) | ⬜ Required | At least 3 screenshots |
| App preview video | ⬜ Optional | Recommended for conversion |
| Export compliance | ⬜ Required | HTTPS only (no custom encryption) — answer "No" to encryption questions |
| Final branded app icon | ⬜ Required | Replace placeholder K icon with production design before submission |

---

## Testing

| Item | Status | Notes |
|------|--------|-------|
| TestFlight internal build | ⬜ Required | Upload via Xcode → Organizer → Distribute |
| Sandbox IAP — Australian region | ⬜ Required | Create sandbox tester in App Store Connect → Users and Access → Sandbox, set region to Australia |
| Real device test — purchase flow | ⬜ Required | IAP does not work on simulator |
| Real device test — restore purchases | ⬜ Required | Tap "Restore purchases" with an account that has a prior sandbox purchase |
| Real device test — Stripe Pro shows as Pro | ⬜ Required | Log in with a Stripe-subscribed account and confirm features are unlocked without RC purchase |

---

## Environment Variables (Vercel)

| Variable | Status | Notes |
|----------|--------|-------|
| `NEXT_PUBLIC_REVENUECAT_IOS_API_KEY` | ⬜ Set in Vercel | Public iOS API key from RevenueCat dashboard |
| `REVENUECAT_SECRET_KEY` | ⬜ Set in Vercel | Server-side key for `/api/revenuecat/sync` subscriber lookup |
