"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { isValidUserType } from "../../../lib/userType";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user;
      if (!user) {
        window.location.replace("/login");
        return;
      }
      const onOnboarding = window.location.pathname === "/onboarding";
      if (!isValidUserType(user.user_metadata?.user_type) && !onOnboarding) {
        window.location.replace("/onboarding");
      } else {
        setReady(true);
      }
    }).catch(() => {
      window.location.replace("/login");
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
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-[#22C55E]" />
    </div>
  );

  return <>{children}</>;
}
