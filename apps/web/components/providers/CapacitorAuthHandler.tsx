"use client";

/**
 * Handles iOS deep-link callbacks after Google OAuth.
 *
 * Flow:
 *   1. User taps "Continue with Google" on iOS.
 *   2. Auth page calls supabase.signInWithOAuth with:
 *        redirectTo: "kashio://auth/callback"
 *        skipBrowserRedirect: true
 *   3. App opens the OAuth URL via @capacitor/browser (SFSafariViewController).
 *   4. After Google auth, Supabase redirects to kashio://auth/callback?code=...
 *   5. iOS fires the appUrlOpen event — caught here.
 *   6. We close the browser, exchange the code for a Supabase session, then navigate.
 *
 * Registered URL schemes (Info.plist):
 *   - kashio://
 *   - au.com.kashio.app://
 *
 * Required Supabase redirect URLs (see REQUIRED_EXTERNAL_SETTINGS.md):
 *   - kashio://auth/callback
 *   - au.com.kashio.app://auth/callback
 *   - https://app.kashio.com.au/auth/callback
 */

import { useEffect } from "react";
import { isCapacitorIOS } from "@/lib/capacitor";
import { supabase } from "@/lib/supabase";

function isAuthCallback(url: string): boolean {
  return (
    url.startsWith("kashio://auth/callback") ||
    url.startsWith("au.com.kashio.app://auth/callback")
  );
}

export function CapacitorAuthHandler() {
  useEffect(() => {
    if (!isCapacitorIOS()) return;

    let removeListener: (() => void) | null = null;

    async function setup() {
      const { App }     = await import("@capacitor/app");
      const { Browser } = await import("@capacitor/browser");

      const handle = await App.addListener("appUrlOpen", async ({ url }) => {
        console.log("[Kashio] Received appUrlOpen:", url);

        if (!isAuthCallback(url)) return;

        let code: string | null = null;
        try {
          code = new URL(url).searchParams.get("code");
        } catch {
          console.warn("[Kashio] Could not parse appUrlOpen URL:", url);
          return;
        }

        if (!code) {
          console.warn("[Kashio] appUrlOpen: no code param in URL");
          return;
        }

        let type: string | null = null;
        try { type = new URL(url).searchParams.get("type"); } catch { /* ignore */ }

        // Close SFSafariViewController before exchanging the code
        try { await Browser.close(); } catch { /* already closed by user */ }

        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error || !data.session) {
          console.error("[Kashio] exchangeCodeForSession failed:", error?.message);
          window.location.href = "/login";
          return;
        }

        console.log("[Kashio] Supabase session restored after deep link");

        // Password reset — go straight to the new-password form.
        if (type === "recovery") {
          window.location.href = "/auth/reset-password";
          return;
        }

        // Trigger welcome email — mirrors what /auth/callback does on web.
        // Fire-and-forget; never block the navigation.
        fetch("/api/auth/welcome", { method: "POST" }).catch(() => {});

        const userType = data.session.user.user_metadata?.user_type;
        window.location.href = userType ? "/import" : "/onboarding";
      });

      removeListener = () => handle.remove();
    }

    setup().catch((e) => console.error("[Kashio] CapacitorAuthHandler setup failed:", e));
    return () => { removeListener?.(); };
  }, []);

  return null;
}
