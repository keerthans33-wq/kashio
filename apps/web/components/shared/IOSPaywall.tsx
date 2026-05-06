"use client";

import { useState } from "react";
import { useRevenueCat } from "@/components/providers/RevenueCatProvider";
import { Button } from "@/components/ui/button";
import type { PurchasesPackage } from "@/lib/revenuecat.client";

type Interval = "month" | "year";

type Props = {
  onSuccess?: () => void;
};

const BULLETS = [
  "Full deduction review",
  "Export-ready tax summary",
  "WFH deduction tools",
  "Up to 100 receipt uploads",
];

export function IOSPaywall({ onSuccess }: Props) {
  const { offerings, loading, error, purchase, restore } = useRevenueCat();
  const [selected, setSelected] = useState<Interval>("year");
  const [restoring, setRestoring] = useState(false);

  const current = offerings?.current;
  const monthlyPkg: PurchasesPackage | null = current?.monthly ?? null;
  const annualPkg:  PurchasesPackage | null = current?.annual  ?? null;

  const monthlyPrice = monthlyPkg?.product.priceString ?? "$5.99";
  const annualPrice  = annualPkg?.product.priceString  ?? "$39.99";

  async function handlePurchase() {
    const pkg = selected === "year" ? annualPkg : monthlyPkg;
    if (!pkg) return;
    const success = await purchase(pkg);
    if (success) {
      onSuccess?.();
      window.location.reload();
    }
  }

  async function handleRestore() {
    setRestoring(true);
    const success = await restore();
    setRestoring(false);
    if (success) {
      onSuccess?.();
      window.location.reload();
    }
  }

  return (
    <div className="space-y-0">
      {/* Lock icon */}
      <div
        className="mb-5 flex h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.20)" }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} style={{ color: "#22C55E" }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>

      <h2 className="text-[22px] font-bold mb-2 leading-snug" style={{ color: "var(--text-primary)" }}>
        Unlock Kashio Pro
      </h2>
      <p className="text-[13px] mb-5" style={{ color: "var(--text-secondary)" }}>
        Upload more receipts and unlock the full Kashio experience for tax time.
      </p>

      {/* Feature bullets */}
      <ul className="mb-5 space-y-2.5">
        {BULLETS.map((item) => (
          <li key={item} className="flex items-center gap-2.5 text-[13px]" style={{ color: "var(--text-secondary)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" style={{ color: "#22C55E" }}>
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            {item}
          </li>
        ))}
      </ul>

      {/* Billing interval toggle */}
      <div
        className="mb-4 flex rounded-xl p-1"
        style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        {(["month", "year"] as Interval[]).map((i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className="relative flex-1 rounded-lg py-2 text-[13px] font-medium transition-all duration-150"
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
                Save 44%
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Price */}
      <div className="mb-5 flex items-baseline gap-2">
        <span className="text-[34px] font-bold tabular-nums leading-none" style={{ color: "var(--text-primary)" }}>
          {selected === "month" ? monthlyPrice : annualPrice}
        </span>
        <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>
          AUD / {selected === "month" ? "month" : "year"}
        </span>
      </div>

      <Button
        variant="primary"
        className="w-full mb-3"
        onClick={handlePurchase}
        disabled={loading || (!monthlyPkg && !annualPkg)}
      >
        {loading ? "Processing…" : "Unlock Pro"}
      </Button>

      {error && (
        <p className="text-center text-[12px] mb-2" style={{ color: "#f87171" }}>
          {error}
        </p>
      )}

      <button
        className="w-full mb-4 text-[13px] py-2 transition-opacity hover:opacity-70"
        style={{ color: "var(--text-muted)" }}
        onClick={handleRestore}
        disabled={restoring || loading}
      >
        {restoring ? "Restoring…" : "Restore purchases"}
      </button>

      <p className="text-center text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
        Subscription managed through Apple. Cancel anytime in Settings.
      </p>
    </div>
  );
}
