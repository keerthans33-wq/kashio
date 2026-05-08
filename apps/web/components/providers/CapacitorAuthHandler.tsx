"use client";

import { useEffect } from "react";
import { isCapacitorIOS } from "@/lib/capacitor";
import { supabase } from "@/lib/supabase";

// Both URL schemes are registered in Info.plist and as Supabase redirect URLs.
// Supabase may return either depending on how the OAuth was initiated.
function isAuthCallback(url: string): boolean {
  return (
    url.startsWith("kashio://auth/callback") ||
    url.startsWith("au.com.kashio.app://auth/callback")
  );
}

export function CapacitorAuthHandler() {
  useEffect(() => {
    if (!isCapacitorIOS()) return;

    let remove: (() => void) | null = null;

    async function setup() {
      const { App }     = await import("@capacitor/app");
      const { Browser } = await import("@capacitor/browser");

      const handle = await App.addListener("appUrlOpen", async ({ url }) => {
        if (!isAuthCallback(url)) return;

        // Supabase PKCE flow returns a `code` query param.
        let code: string | null = null;
        try {
          code = new URL(url).searchParams.get("code");
        } catch {
          return;
        }
        if (!code) return;

        // Close in-app browser before session exchange
        try { await Browser.close(); } catch { /* already closed */ }

        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error || !data.session) {
          window.location.href = "/login";
          return;
        }

        const userType = data.session.user.user_metadata?.user_type;
        // Existing users → dashboard entry point (/import)
        // New users without type → onboarding
        window.location.href = userType ? "/import" : "/onboarding";
      });

      remove = () => handle.remove();
    }

    setup();
    return () => { remove?.(); };
  }, []);

  return null;
}
