"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

function CallbackHandler() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");

    if (!code) {
      window.location.href = "/login";
      return;
    }

    // Try to exchange the code. If PKCE verifier is missing, fall back to
    // listening for the SIGNED_IN event which fires when createBrowserClient
    // detects and exchanges the code automatically.
    supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
      if (!error && data.session) {
        window.location.href = "/import";
        return;
      }

      // Fallback: listen for auth state change
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_IN" && session) {
          subscription.unsubscribe();
          window.location.href = "/import";
        }
      });

      // If nothing fires in 5s, give up and go back to login
      setTimeout(() => {
        subscription.unsubscribe();
        window.location.href = "/login";
      }, 5000);
    });
  }, [searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-gray-500 dark:text-gray-400">Signing you in…</p>
    </main>
  );
}

export default function AuthCallback() {
  return (
    <Suspense>
      <CallbackHandler />
    </Suspense>
  );
}
