"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { isCapacitorIOS } from "@/lib/capacitor";
import { useUser } from "@/lib/user-context";
import type { PurchasesPackage } from "@/lib/revenuecat.client";

type Offering = Awaited<ReturnType<typeof import("@/lib/revenuecat.client").getOfferings>>;

type RCContextValue = {
  isIOS:       boolean;
  offerings:   Offering | null;
  isPro:       boolean;
  loading:     boolean;
  error:       string | null;
  purchase:    (pkg: PurchasesPackage) => Promise<boolean>;
  restore:     () => Promise<boolean>;
};

const defaultCtx: RCContextValue = {
  isIOS:    false,
  offerings: null,
  isPro:    false,
  loading:  false,
  error:    null,
  purchase: async () => false,
  restore:  async () => false,
};

const RevenueCatContext = createContext<RCContextValue>(defaultCtx);

export function useRevenueCat() {
  return useContext(RevenueCatContext);
}

export function RevenueCatProvider({ children }: { children: React.ReactNode }) {
  const { user }                          = useUser();
  const [isIOS, setIsIOS]                 = useState(false);
  const [offerings, setOfferings]         = useState<Offering | null>(null);
  const [isPro, setIsPro]                 = useState(false);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const configured                        = useRef(false);

  // Detect platform after mount (avoids SSR mismatch)
  useEffect(() => { setIsIOS(isCapacitorIOS()); }, []);

  // Configure RC once we know we're on iOS and have a user ID
  useEffect(() => {
    if (!isIOS || !user?.id || configured.current) return;
    configured.current = true;

    (async () => {
      try {
        const rc = await import("@/lib/revenuecat.client");
        await rc.configureRC(user.id);
        const [offeringsResult, { customerInfo }] = await Promise.all([
          rc.getOfferings(),
          rc.getCustomerInfo(),
        ]);
        setOfferings(offeringsResult);
        setIsPro(rc.hasProEntitlement(customerInfo));
      } catch (err) {
        console.error("[RC] setup failed:", err);
      }
    })();
  }, [isIOS, user?.id]);

  async function syncToServer() {
    try {
      await fetch("/api/revenuecat/sync", { method: "POST" });
    } catch {
      // best-effort — DB will catch up on next app load
    }
  }

  async function purchase(pkg: PurchasesPackage): Promise<boolean> {
    setLoading(true);
    setError(null);
    try {
      const rc = await import("@/lib/revenuecat.client");
      const { customerInfo } = await rc.purchasePackage(pkg);
      const pro = rc.hasProEntitlement(customerInfo);
      if (pro) {
        setIsPro(true);
        await syncToServer();
      }
      return pro;
    } catch (err: unknown) {
      const e = err as { userCancelled?: boolean; message?: string };
      if (!e.userCancelled) {
        setError(e.message ?? "Purchase failed. Please try again.");
      }
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function restore(): Promise<boolean> {
    setLoading(true);
    setError(null);
    try {
      const rc = await import("@/lib/revenuecat.client");
      const { customerInfo } = await rc.restorePurchases();
      const pro = rc.hasProEntitlement(customerInfo);
      if (pro) {
        setIsPro(true);
        await syncToServer();
      } else {
        setError("No active subscription found.");
      }
      return pro;
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? "Restore failed. Please try again.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  return (
    <RevenueCatContext.Provider value={{ isIOS, offerings, isPro, loading, error, purchase, restore }}>
      {children}
    </RevenueCatContext.Provider>
  );
}
