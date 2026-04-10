"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { User } from "@supabase/supabase-js";

export const VALID_USER_TYPES = ["employee", "contractor", "sole_trader"] as const;
export type UserType = typeof VALID_USER_TYPES[number];

export function isValidUserType(value: unknown): value is UserType {
  return VALID_USER_TYPES.includes(value as UserType);
}

type UserContextValue = {
  user: User | null;
  userType: string | null;
  loading: boolean;
};

export const UserContext = createContext<UserContextValue>({
  user: null,
  userType: null,
  loading: true,
});

export function useUser() {
  return useContext(UserContext);
}

export function useUserContext(): UserContextValue {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use getSession() — reads local cookies without a server round-trip.
    // getUser() can fail transiently and falsely redirect signed-in users to /login.
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      setLoading(false);
      if (!u) {
        window.location.replace("/login");
      } else if (!isValidUserType(u.user_metadata?.user_type) &&
                 window.location.pathname !== "/onboarding") {
        window.location.replace("/onboarding");
      }
    }).catch(() => {
      setLoading(false);
      window.location.replace("/login");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "SIGNED_OUT") {
        window.location.replace("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    user,
    userType: user?.user_metadata?.user_type ?? null,
    loading,
  };
}
