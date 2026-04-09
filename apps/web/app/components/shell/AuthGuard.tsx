"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Use getUser() instead of getSession() — getUser() validates the token
    // with the server, so a stale/expired session is caught immediately.
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        window.location.replace("/login");
        return;
      }
      const onOnboarding = window.location.pathname === "/onboarding";
      if (!user.user_metadata?.user_type && !onOnboarding) {
        window.location.replace("/onboarding");
      } else {
        setReady(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        window.location.replace("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!ready) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-violet-600" />
    </div>
  );

  return <>{children}</>;
}
