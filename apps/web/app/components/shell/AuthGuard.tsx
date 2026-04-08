"use client";

// Protects all (app) routes.
// Checks for a Supabase session on mount — redirects to /auth if none found.

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          window.location.replace("/login");
        } else {
          setReady(true);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // Render nothing while the session check is in flight
  if (!ready) return null;

  return <>{children}</>;
}
