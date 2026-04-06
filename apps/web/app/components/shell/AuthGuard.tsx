"use client";

// Protects all (app) routes.
// Checks for a Supabase session on mount — redirects to /auth if none found.

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        window.location.replace("/auth");
      } else {
        setReady(true);
      }
    });
  }, []);

  // Render nothing while the session check is in flight
  if (!ready) return null;

  return <>{children}</>;
}
