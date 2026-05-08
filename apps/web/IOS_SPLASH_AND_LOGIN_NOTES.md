# iOS Splash & Google Login Notes

## Part 1: App Startup Loading Screen

### What was built
`components/shared/AppLoadingScreen.tsx` — a branded full-screen loading overlay shown during the auth session check on iOS.

### How it works
- Renders on iOS Capacitor only (`isCapacitorIOS()` check via `useEffect` post-mount)
- On web, falls back to the original simple spinner
- Shown in `app/(app)/layout.tsx` while `userState.loading === true`
- Automatically hidden once Supabase session check resolves and user is redirected

### Visual design
- Background: `#05070E` (Kashio dark)
- Logo: `/public/logo.svg` with soft pulse + green drop-shadow glow animation
- Ambient glow ring behind the logo
- Three green dots with staggered bounce animation
- Safe-area padding for Dynamic Island / home indicator

### Native splash (LaunchScreen.storyboard)
The native splash (shown before WebView initialises) is already configured:
- Background: `#05070E`
- 2732×2732 "Kashio" wordmark PNG (dark theme)
- No white flash — background colour set in storyboard

### Optional: `@capacitor/splash-screen`
Install `@capacitor/splash-screen` and set `launchAutoHide: false` in `capacitor.config.ts` to keep the native splash visible until the web is ready. Then call `SplashScreen.hide({ fadeOutDuration: 300 })` once `userState.loading` resolves. Not implemented — current native + web combo already covers the gap cleanly.

---

## Part 2: Google Login — In-App Browser

### Problem
Without this change, `supabase.auth.signInWithOAuth` triggers `window.location.href` navigation, sending the user to full Safari. This breaks the native app feel.

### Solution: `@capacitor/browser` + URL scheme

**Flow:**
1. User taps "Continue with Google"
2. iOS path calls `supabase.auth.signInWithOAuth({ skipBrowserRedirect: true })` → returns OAuth URL
3. Opens URL in `Browser.open()` → uses **SFSafariViewController** (in-app sheet, not Safari)
4. User logs in with Google
5. Google → Supabase OAuth → redirects to `kashio://auth/callback?code=xxx`
6. iOS URL scheme handler fires → app comes to foreground
7. `CapacitorAuthHandler` (in root layout) receives `appUrlOpen` event with `kashio://auth/callback?code=xxx`
8. Extracts `code`, calls `supabase.auth.exchangeCodeForSession(code)` — establishes session in WKWebView localStorage
9. Redirects to `/import` or `/onboarding`

### Why not share cookies with SFSafariViewController?
iOS 11+ separates the WKWebView cookie store from Safari/SFSafariViewController. Sessions set in SFSafariViewController are NOT accessible in the WKWebView. That's why we use a URL scheme callback instead of letting the server-side `/auth/callback` route handle it.

### Why the `kashio://` redirect is safe with Google OAuth
Google doesn't directly redirect to `kashio://`. Google redirects to Supabase's own OAuth callback (`https://xxxx.supabase.co/auth/v1/callback`), and Supabase redirects to our `redirectTo` value. So only Supabase's server needs to trust `kashio://auth/callback` as an allowed redirect URL.

### Required: Add to Supabase Auth settings
In Supabase Dashboard → **Authentication** → **URL Configuration** → **Redirect URLs**, add:
```
kashio://auth/callback
```

### Files changed
| File | Change |
|------|--------|
| `components/providers/CapacitorAuthHandler.tsx` | New — listens for `appUrlOpen`, handles code exchange |
| `app/layout.tsx` | Mounts `CapacitorAuthHandler` app-wide |
| `app/(public)/auth/page.tsx` | iOS path uses `Browser.open()` + `kashio://` redirect |
| `app/login/page.tsx` | Same |
| `ios/App/App/Info.plist` | Added `CFBundleURLTypes` with `kashio` scheme |

### After deploying, run:
```bash
npx cap sync ios
```
Then re-archive in Xcode.

### Note: Google does not block SFSafariViewController
As of 2021, Google blocked OAuth in embedded WKWebView (`UIWebView`/`WKWebView`). SFSafariViewController is explicitly allowed — it uses the same engine as Safari and passes Google's user-agent checks.
