"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.replace("/login");
      } else {
        setReady(true);
      }
    });

    // Redirect on explicit sign-out (e.g. from another tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        window.location.replace("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!ready) return null;

  return <>{children}</>;
}
