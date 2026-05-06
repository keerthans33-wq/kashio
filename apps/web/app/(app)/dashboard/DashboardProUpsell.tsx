"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Interval = "month" | "year";

const PREVIEW_ROWS = [
  "Transactions imported",
  "Transactions reviewed",
  "Categories completed",
];

export function DashboardProUpsell() {
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [interval, setInterval] = useState<Interval>("year");

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/stripe/create-checkout-session", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ interval, cancelPath: "/dashboard" }),
      });
      const body = await res.json() as { url?: string; error?: string };
      if (res.ok && body.url) {
        window.location.href = body.url;
      } else {
        setError(body.error ?? "Something went wrong. Please try again.");
        setLoading(false);
      }
    } catch {
      setError("Network error. Please check your connection.");
      setLoading(false);
    }
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: "rgba(13,20,33,0.92)",
        border:          "1px solid rgba(34,197,94,0.22)",
        boxShadow:       "0 0 40px rgba(34,197,94,0.06), 0 2px 12px rgba(0,0,0,0.5)",
      }}
    >
      {/* Top accent bar */}
      <div className="h-[2px] w-full" style={{ background: "linear-gradient(90deg, #22C55E, #14B8A6)" }} />

      <div className="px-5 pt-5 pb-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest mb-2"
              style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.25)" }}
            >
              Pro feature
            </span>
            <p className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
              Full tax readiness breakdown
            </p>
            <p className="mt-0.5 text-[12px] leading-snug" style={{ color: "var(--text-muted)" }}>
              See exactly what's done before you export.
            </p>
          </div>
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.22)" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} style={{ color: "#22C55E" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
        </div>

        {/* Blurred preview */}
        <div
          className="mb-5 rounded-xl overflow-hidden"
          style={{ filter: "blur(2.5px)", opacity: 0.35, pointerEvents: "none", userSelect: "none", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          {PREVIEW_ROWS.map((label, i) => (
            <div
              key={label}
              className="flex items-center gap-3 px-3 py-2.5"
              style={{
                backgroundColor: "rgba(255,255,255,0.02)",
                borderBottom: i < PREVIEW_ROWS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}
            >
              <p className="flex-1 text-[12px]" style={{ color: "var(--text-muted)" }}>{label}</p>
              <div className="w-20 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full" style={{ width: `${40 + i * 20}%`, backgroundColor: i === 0 ? "#22C55E" : "#60A5FA" }} />
              </div>
              <p className="w-9 text-right text-[11px]" style={{ color: "var(--text-muted)" }}>—/—</p>
            </div>
          ))}
        </div>

        {/* Pricing toggle */}
        <div
          className="mb-4 grid grid-cols-2 gap-2"
        >
          {(["year", "month"] as Interval[]).map((i) => (
            <button
              key={i}
              onClick={() => setInterval(i)}
              className="relative flex flex-col items-center justify-center rounded-xl py-3 px-2 transition-all duration-150"
              style={{
                backgroundColor: interval === i ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.03)",
                border: interval === i ? "1.5px solid rgba(34,197,94,0.40)" : "1px solid rgba(255,255,255,0.07)",
                boxShadow: interval === i ? "0 0 20px rgba(34,197,94,0.08)" : "none",
              }}
            >
              {i === "year" && (
                <span
                  className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap"
                  style={{ backgroundColor: "#22C55E", color: "#0A1F12" }}
                >
                  Best value
                </span>
              )}
              <span
                className="text-[16px] font-bold tabular-nums leading-none"
                style={{ color: interval === i ? "#22C55E" : "var(--text-secondary)" }}
              >
                {i === "year" ? "$39.99" : "$4.99"}
              </span>
              <span
                className="mt-0.5 text-[10px]"
                style={{ color: interval === i ? "rgba(34,197,94,0.70)" : "var(--text-muted)" }}
              >
                {i === "year" ? "/ year · save 33%" : "/ month"}
              </span>
            </button>
          ))}
        </div>

        {error && (
          <p className="mb-2 text-center text-[11px]" style={{ color: "#f87171" }}>
            {error}
          </p>
        )}
        <Button className="w-full" size="sm" onClick={handleUpgrade} disabled={loading}>
          {loading ? "Redirecting…" : "Unlock Pro"}
        </Button>

        <p className="mt-2.5 text-center text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Full deduction review, export reports, WFH tools, 100 receipts.{" "}
          <Link href="/export" className="underline underline-offset-2 hover:opacity-70">See full plan →</Link>
        </p>
      </div>
    </div>
  );
}
