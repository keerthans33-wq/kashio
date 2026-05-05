"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Interval = "month" | "year";

export function DashboardProUpsell() {
  const [loading,  setLoading]  = useState(false);
  const [interval, setInterval] = useState<Interval>("month");

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res  = await fetch("/api/stripe/create-checkout-session", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ interval, cancelPath: "/dashboard" }),
      });
      const body = await res.json() as { url?: string };
      if (res.ok && body.url) window.location.href = body.url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="rounded-2xl px-5 py-5"
      style={{
        backgroundColor: "rgba(13,20,33,0.88)",
        border:          "1px solid rgba(34,197,94,0.18)",
        boxShadow:       "0 0 32px rgba(34,197,94,0.04)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-widest mb-0.5"
            style={{ color: "#22C55E" }}
          >
            Pro feature
          </p>
          <p className="text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>
            Full tax readiness breakdown
          </p>
          <p className="mt-0.5 text-[12px]" style={{ color: "var(--text-muted)" }}>
            See exactly what's done and what's left before you lodge.
          </p>
        </div>
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.20)" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} style={{ color: "#22C55E" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
      </div>

      {/* Blurred preview rows */}
      <div className="mb-4 space-y-0 overflow-hidden rounded-xl" style={{ filter: "blur(3px)", opacity: 0.4, pointerEvents: "none", userSelect: "none" }}>
        {["Transactions imported", "Transactions reviewed", "Receipts attached"].map((label, i, arr) => (
          <div
            key={label}
            className="flex items-center gap-3 px-3 py-2.5"
            style={{
              backgroundColor: "rgba(255,255,255,0.03)",
              borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
            }}
          >
            <p className="flex-1 text-[12px]" style={{ color: "var(--text-muted)" }}>{label}</p>
            <div className="w-20 h-1 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full w-3/5" style={{ backgroundColor: "#60A5FA" }} />
            </div>
            <p className="w-9 text-right text-[11px]" style={{ color: "var(--text-muted)" }}>—/—</p>
          </div>
        ))}
      </div>

      {/* Interval toggle */}
      <div
        className="mb-3 flex rounded-xl p-1"
        style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
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
            {i === "month" ? "Monthly · $4.99" : "Annual · $39.99"}
            {i === "year" && (
              <span
                className="ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                style={{ backgroundColor: "rgba(34,197,94,0.20)", color: "#22C55E" }}
              >
                Save 33%
              </span>
            )}
          </button>
        ))}
      </div>

      <Button className="w-full" size="sm" onClick={handleUpgrade} disabled={loading}>
        {loading ? "Redirecting…" : "Unlock Pro"}
      </Button>

      <p className="mt-2.5 text-center text-[11px]" style={{ color: "var(--text-muted)" }}>
        Also unlocks all deductions, export, and 100 receipts.{" "}
        <Link href="/export" className="underline underline-offset-2 hover:opacity-70">See full plan →</Link>
      </p>
    </div>
  );
}
