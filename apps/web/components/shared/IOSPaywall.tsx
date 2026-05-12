"use client";

import { useEffect, useState } from "react";
import { useRevenueCat } from "@/components/providers/RevenueCatProvider";
import { Button } from "@/components/ui/button";
import { PRODUCT_IDS, FALLBACK_PRICE, ANNUAL_SAVING_PCT } from "@/lib/pricing";
import type { PurchasesPackage } from "@/lib/revenuecat.client";

type Interval = "month" | "year";
type PurchaseStatus = "idle" | "purchasing" | "success";

type Props = {
  onSuccess?:   () => void;
  compact?:     boolean;
  buttonLabel?: string;
};

const BULLETS = [
  "Full deduction review",
  "Export-ready tax summary",
  "WFH deduction tools",
  "Up to 100 receipt uploads",
];

export function IOSPaywall({ onSuccess, compact = false, buttonLabel }: Props) {
  const { offerings, loading, error, purchase, restore } = useRevenueCat();
  const [selected,       setSelected]       = useState<Interval>("year");
  const [purchaseStatus, setPurchaseStatus] = useState<PurchaseStatus>("idle");
  const [restoring,      setRestoring]      = useState(false);
  const [restoreMsg,     setRestoreMsg]     = useState<string | null>(null);
  const [rcLogged,       setRcLogged]       = useState(false);

  // ── Package lookup — strictly by product ID ────────────────────────────────
  // priceString intentionally NOT used for display: it returns the device's
  // storefront currency (USD on US accounts, AUD on AU accounts).
  // We always show AUD prices from FALLBACK_PRICE. RC is only needed to
  // get the pkg object for the actual purchase call.
  const allPkgs: PurchasesPackage[] = offerings?.current?.availablePackages ?? [];

  const monthlyPkg: PurchasesPackage | null =
    allPkgs.find((p) => p.product.identifier === PRODUCT_IDS.monthly) ?? null;

  const annualPkg: PurchasesPackage | null =
    allPkgs.find((p) => p.product.identifier === PRODUCT_IDS.annual) ?? null;

  // Button is disabled until RC has loaded the package we need to purchase.
  const pkgsLoading = !offerings && !error;

  // ── Debug log — fires once when offerings resolve ───────────────────────────
  useEffect(() => {
    if (!offerings || rcLogged) return;
    setRcLogged(true);
    console.log("[Kashio] RC offering:", offerings.current?.identifier ?? "none");
    console.log("[Kashio] Packages:", allPkgs.map((p) => `${p.product.identifier}(${p.product.currencyCode} ${p.product.priceString})`).join(", ") || "none");
    if (!monthlyPkg) console.warn("[Kashio] ⚠ Monthly pkg not found — expected:", PRODUCT_IDS.monthly);
    if (!annualPkg)  console.warn("[Kashio] ⚠ Annual pkg not found  — expected:", PRODUCT_IDS.annual);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerings]);

  // ── Success overlay ─────────────────────────────────────────────────────────
  if (purchaseStatus === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-6 space-y-3 text-center">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.30)" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor" style={{ color: "#22C55E" }}>
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-[18px] font-bold" style={{ color: "var(--text-primary)" }}>Kashio Pro unlocked</p>
        <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>Loading your account…</p>
      </div>
    );
  }

  async function handlePurchase() {
    const pkg = selected === "year" ? annualPkg : monthlyPkg;
    if (!pkg) return;
    setPurchaseStatus("purchasing");
    const outcome = await purchase(pkg);
    // outcome is "success" | "cancelled" | "error" — must check explicitly
    if (outcome === "success") {
      setPurchaseStatus("success");
      onSuccess?.();
      setTimeout(() => window.location.reload(), 1400);
    } else {
      setPurchaseStatus("idle");
    }
  }

  async function handleRestore() {
    setRestoring(true);
    setRestoreMsg(null);
    const ok = await restore();
    setRestoring(false);
    if (ok) {
      setPurchaseStatus("success");
      onSuccess?.();
      setTimeout(() => window.location.reload(), 1400);
    } else {
      setRestoreMsg("No active subscription found. If you believe this is wrong, contact support.");
    }
  }

  const isPurchasing = purchaseStatus === "purchasing" || (loading && purchaseStatus !== "idle");

  // Always show AUD prices — never depends on RC priceString / storefront currency.
  const monthlyPrice = FALLBACK_PRICE.monthly;
  const annualPrice  = FALLBACK_PRICE.annual;

  return (
    <div className="space-y-0">
      {/* Lock icon */}
      <div
        className={`${compact ? "mb-3" : "mb-5"} flex h-10 w-10 items-center justify-center rounded-full`}
        style={{ backgroundColor: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.20)" }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} style={{ color: "#22C55E" }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>

      <h2
        className={`${compact ? "text-[18px] mb-1" : "text-[22px] mb-2"} font-bold leading-snug`}
        style={{ color: "var(--text-primary)" }}
      >
        Unlock Kashio Pro
      </h2>
      <p className={`text-[13px] ${compact ? "mb-3" : "mb-5"}`} style={{ color: "var(--text-secondary)" }}>
        Get your full tax summary, review all deductions, and keep proof in one place.
      </p>

      {/* Feature bullets */}
      <ul className={`${compact ? "mb-3 space-y-1.5" : "mb-5 space-y-2.5"}`}>
        {BULLETS.map((item) => (
          <li key={item} className={`flex items-center gap-2.5 ${compact ? "text-[12px]" : "text-[13px]"}`} style={{ color: "var(--text-secondary)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" style={{ color: "#22C55E" }}>
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            {item}
          </li>
        ))}
      </ul>

      {/* Billing interval toggle */}
      <div
        className={`${compact ? "mb-3" : "mb-4"} flex rounded-xl p-1`}
        style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        {(["month", "year"] as Interval[]).map((i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            disabled={isPurchasing}
            className={`relative flex-1 rounded-lg ${compact ? "py-1.5" : "py-2"} text-[13px] font-medium transition-all duration-150`}
            style={{
              backgroundColor: selected === i ? "rgba(34,197,94,0.15)" : "transparent",
              border:          selected === i ? "1px solid rgba(34,197,94,0.25)" : "1px solid transparent",
              color:           selected === i ? "#22C55E" : "var(--text-muted)",
            }}
          >
            {i === "month" ? "Monthly" : "Annual"}
            {i === "year" && (
              <span
                className="ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                style={{ backgroundColor: "rgba(34,197,94,0.20)", color: "#22C55E" }}
              >
                {ANNUAL_SAVING_PCT}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Price — always shows AUD, no RC loading dependency */}
      <div className={`${compact ? "mb-3" : "mb-5"} flex items-baseline gap-2`}>
        <span
          className={`${compact ? "text-[26px]" : "text-[34px]"} font-bold tabular-nums leading-none`}
          style={{ color: "var(--text-primary)" }}
        >
          {selected === "month" ? monthlyPrice : annualPrice}
        </span>
        <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>
          AUD / {selected === "month" ? "month" : "year"}
        </span>
      </div>

      <Button
        variant="primary"
        className={`w-full ${compact ? "mb-2" : "mb-3"}`}
        onClick={handlePurchase}
        disabled={isPurchasing || pkgsLoading}
      >
        {isPurchasing ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Processing…
          </span>
        ) : (buttonLabel ?? "Unlock Pro")}
      </Button>

      {error && purchaseStatus === "idle" && (
        <p className="text-center text-[12px] mb-2" style={{ color: "#f87171" }}>
          {error}
        </p>
      )}
      {restoreMsg && (
        <p className="text-center text-[12px] mb-2" style={{ color: "rgba(255,255,255,0.55)" }}>
          {restoreMsg}
        </p>
      )}

      <button
        className={`w-full ${compact ? "mb-3" : "mb-4"} text-[13px] py-2 transition-opacity hover:opacity-70`}
        style={{ color: "var(--text-muted)" }}
        onClick={handleRestore}
        disabled={restoring || isPurchasing}
      >
        {restoring ? "Restoring…" : "Restore purchases"}
      </button>

      <p className="text-center text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
        Subscription managed through Apple. Cancel anytime in Settings.
      </p>
    </div>
  );
}
