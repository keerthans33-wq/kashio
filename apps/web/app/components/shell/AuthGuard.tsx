"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Check for an existing session first (reads from localStorage).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.replace("/login");
      } else {
        setReady(true);
      }
    });

    // Also listen for sign-out so the user gets redirected if they log out
    // in another tab.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT" || !session) {
          window.location.replace("/login");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (!ready) return null;

  return <>{children}</>;
}
