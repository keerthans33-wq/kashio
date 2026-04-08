"use client";

// This page handles the redirect back from Google after OAuth login.
// Supabase sends the user here with a ?code= in the URL.
// We exchange that code for a real session, then send the user into the app.

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

function CallbackHandler() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");

    if (!code) {
      // No code means something went wrong — send back to sign-in
      window.location.href = "/login";
      return;
    }

    // Exchange the one-time code for a Supabase session
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        window.location.href = "/login";
      } else {
        window.location.href = "/import";
      }
    });
  }, [searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-gray-500 dark:text-gray-400">Signing you in…</p>
    </main>
  );
}

// Suspense is required by Next.js when using useSearchParams
export default function AuthCallback() {
  return (
    <Suspense>
      <CallbackHandler />
    </Suspense>
  );
}
