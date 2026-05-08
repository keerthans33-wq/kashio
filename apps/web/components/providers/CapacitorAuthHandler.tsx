"use client";

import { useEffect } from "react";
import { isCapacitorIOS } from "@/lib/capacitor";
import { supabase } from "@/lib/supabase";

export function CapacitorAuthHandler() {
  useEffect(() => {
    if (!isCapacitorIOS()) return;

    let remove: (() => void) | null = null;

    async function setup() {
      const { App }     = await import("@capacitor/app");
      const { Browser } = await import("@capacitor/browser");

      const handle = await App.addListener("appUrlOpen", async ({ url }) => {
        if (!url.startsWith("kashio://auth/callback")) return;

        const code = new URL(url).searchParams.get("code");
        if (!code) return;

        // Close in-app browser before session exchange
        try { await Browser.close(); } catch { /* already closed */ }

        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error || !data.session) {
          window.location.href = "/login";
          return;
        }

        const userType = data.session.user.user_metadata?.user_type;
        window.location.href = userType ? "/import" : "/onboarding";
      });

      remove = () => handle.remove();
    }

    setup();
    return () => { remove?.(); };
  }, []);

  return null;
}
