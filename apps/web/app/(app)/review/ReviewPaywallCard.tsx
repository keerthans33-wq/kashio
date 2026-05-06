"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { IOSPaywall } from "@/components/shared/IOSPaywall";
import { isCapacitorIOS } from "@/lib/capacitor";

type Props = {
  hiddenCount: number;
  hiddenValue: number;
};

type Interval = "month" | "year";

export function ReviewPaywallCard({ hiddenCount, hiddenValue }: Props) {
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [interval, setInterval] = useState<Interval>("month");
  const [isIOS,    setIsIOS]    = useState(false);

  useEffect(() => { setIsIOS(isCapacitorIOS()); }, []);

  const fmtValue = hiddenValue.toLocaleString("en-AU", {
    style:               "currency",
    currency:            "AUD",
    maximumFractionDigits: 0,
  });

  async function handleUnlock() {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/stripe/create-checkout-session", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ interval, cancelPath: "/review" }),
      });
      const body = await res.json() as { url?: string };
      if (!res.ok || !body.url) {
        setError("Something went wrong. Please try again.");
        return;
      }
      window.location.href = body.url;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (isIOS) {
    return (
      <div
        className="mt-4 rounded-2xl px-6 py-6"
        style={{
          backgroundColor: "rgba(13, 20, 33, 0.92)",
          border:          "1px solid rgba(34,197,94,0.20)",
          boxShadow:       "0 2px 8px rgba(0,0,0,0.4), 0 0 40px rgba(34,197,94,0.05)",
        }}
      >
        <IOSPaywall />
      </div>
    );
  }

  return (
    <div
      className="mt-4 rounded-2xl px-6 py-6"
      style={{
        backgroundColor: "rgba(13, 20, 33, 0.92)",
        border:          "1px solid rgba(34,197,94,0.20)",
        boxShadow:       "0 2px 8px rgba(0,0,0,0.4), 0 0 40px rgba(34,197,94,0.05)",
      }}
    >
      {/* Lock icon + heading */}
      <div className="flex items-start gap-4 mb-4">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.20)" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} style={{ color: "#22C55E" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <div>
          <p className="text-[15px] font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>
            {hiddenCount} more potential deduction{hiddenCount !== 1 ? "s" : ""} to review
          </p>
          {hiddenValue > 0 && (
            <p className="mt-0.5 text-[13px]" style={{ color: "var(--text-muted)" }}>
              ~{fmtValue} in unchecked transactions
            </p>
          )}
        </div>
      </div>

      {/* Interval toggle */}
      <div
        className="mb-4 flex rounded-xl p-1"
        style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        {(["month", "year"] as Interval[]).map((i) => (
          <button
            key={i}
            onClick={() => setInterval(i)}
            className="flex-1 rounded-lg py-1.5 text-[12px] font-medium transition-all duration-150"
            style={{
              backgroundColor: interval === i ? "rgba(34,197,94,0.15)" : "transparent",
              border:          interval === i ? "1px solid rgba(34,197,94,0.25)" : "1px solid transparent",
              color:           interval === i ? "#22C55E" : "var(--text-muted)",
            }}
          >
            {i === "month" ? "Monthly · $5.99" : "Annual · $39.99"}
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

      <Button className="w-full" size="sm" onClick={handleUnlock} disabled={loading}>
        {loading ? "Redirecting…" : "Unlock Pro — see all deductions"}
      </Button>

      {error && (
        <p className="mt-2 text-center text-[12px]" style={{ color: "#f87171" }}>
          {error}
        </p>
      )}

      <p className="mt-3 text-center text-[11px]" style={{ color: "var(--text-muted)" }}>
        Also unlocks export, 100 receipts, and full dashboard. Cancel anytime.
      </p>
    </div>
  );
}
