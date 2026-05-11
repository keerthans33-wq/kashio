"use client";

// Web: Stripe checkout. iOS: RevenueCat via IOSPaywall.
// Stripe must NEVER open inside the iOS app.

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ExportButton } from "./ExportButton";
import { Button } from "@/components/ui/button";
import { IOSPaywall } from "@/components/shared/IOSPaywall";
import { isCapacitorIOS } from "@/lib/capacitor";

type Item = {
  id:       string;
  merchant: string;
  date:     string;
  amount:   number;
  category: string;
};

type CategoryGroup = {
  cat:      string;
  catTotal: number;
  items:    Item[];
};

type Props = {
  reportUnlocked: boolean;
  allItems:       Item[];
  categoryGroups: CategoryGroup[];
  total:          number;
  confirmedCount: number;
};

type Interval = "month" | "year";

// Stripe prices — web only, never shown on iOS
const MONTHLY_PRICE = "$5.99";
const ANNUAL_PRICE  = "$39.99";
const ANNUAL_SAVING = "Save 44%";

const fmt = (n: number) =>
  n.toLocaleString("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtRound = (n: number) =>
  n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

// ── Export-specific locked preview with real user data ─────────────────────────
// Shows visible summary stats + sample rows, then blurs the full report.

type PreviewProps = {
  allItems:       Item[];
  categoryGroups: CategoryGroup[];
  total:          number;
  confirmedCount: number;
};

function ExportLockedPreview({ allItems, categoryGroups, total, confirmedCount }: PreviewProps) {
  const estimatedSaving  = Math.round(total * 0.325);
  const top3             = categoryGroups.slice(0, 3);
  const sampleItems      = allItems.slice(0, 3);
  const hasRealData      = confirmedCount > 0;

  return (
    <div className="mb-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          Your tax report preview
        </p>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest"
          style={{ backgroundColor: "rgba(34,197,94,0.14)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.24)" }}
        >
          Pro Export
        </span>
      </div>

      {/* ── Visible summary stats (not blurred) ────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div
          className="rounded-xl px-3 py-3"
          style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
            Transactions reviewed
          </p>
          <p className="text-[20px] font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
            {hasRealData ? confirmedCount : "—"}
          </p>
        </div>
        <div
          className="rounded-xl px-3 py-3"
          style={{ backgroundColor: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.16)" }}
        >
          <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "rgba(34,197,94,0.70)" }}>
            Potential claim
          </p>
          <p className="text-[20px] font-bold tabular-nums" style={{ color: "#22C55E" }}>
            {hasRealData ? fmtRound(total) : "—"}
          </p>
        </div>
      </div>

      {/* Estimated saving */}
      {hasRealData && estimatedSaving > 0 && (
        <div
          className="mb-4 flex items-center justify-between rounded-xl px-3 py-2.5"
          style={{ backgroundColor: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.12)" }}
        >
          <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>Estimated tax saving (32.5%)</p>
          <p className="text-[13px] font-semibold tabular-nums" style={{ color: "#22C55E" }}>~{fmtRound(estimatedSaving)}</p>
        </div>
      )}

      {/* Top categories */}
      {top3.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Top categories</p>
          <div className="space-y-1.5">
            {top3.map(({ cat, catTotal }) => (
              <div
                key={cat}
                className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>{cat}</p>
                <p className="text-[12px] font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>{fmtRound(catTotal)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Sample rows (visible, not blurred) ──────────────────────────────── */}
      {sampleItems.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Sample entries</p>
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.07)" }}
          >
            {sampleItems.map((item, i) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-3 py-2.5"
                style={{
                  backgroundColor: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.015)",
                  borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : "none",
                }}
              >
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>{item.merchant}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{item.date} · {item.category}</p>
                </div>
                <p className="shrink-0 ml-3 text-[12px] tabular-nums font-medium" style={{ color: "#22C55E" }}>
                  {fmt(item.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Blurred full report + frosted lock overlay ──────────────────────── */}
      <div className="relative rounded-xl overflow-hidden">
        <div
          style={{ filter: "blur(4px)", userSelect: "none", pointerEvents: "none" }}
          aria-hidden="true"
        >
          {/* Blurred category breakdown rows */}
          <div style={{ backgroundColor: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.30)" }}>
              Full category breakdown
            </p>
            {(categoryGroups.length > 0 ? categoryGroups : [
              { cat: "Home Office / WFH", catTotal: 1140 },
              { cat: "Work Tools & Software", catTotal: 823 },
              { cat: "Professional Development", catTotal: 499 },
              { cat: "Work Travel", catTotal: 385 },
            ]).map((g, i) => (
              <div
                key={g.cat}
                className="flex items-center justify-between px-3 py-1.5"
                style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
              >
                <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>{g.cat}</p>
                <p className="text-[12px] font-medium tabular-nums" style={{ color: "#22C55E" }}>{fmtRound(g.catTotal)}</p>
              </div>
            ))}
          </div>

          {/* Blurred export buttons */}
          <div
            className="flex gap-2 px-3 py-3"
            style={{ backgroundColor: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex-1 h-9 rounded-xl" style={{ backgroundColor: "rgba(34,197,94,0.18)", border: "1px solid rgba(34,197,94,0.25)" }} />
            <div className="flex-1 h-9 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>
        </div>

        {/* Frosted lock overlay */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2"
          style={{
            background:     "linear-gradient(to bottom, rgba(5,7,14,0.35) 0%, rgba(5,7,14,0.72) 100%)",
            backdropFilter: "blur(1px)",
          }}
        >
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(34,197,94,0.14)", border: "1px solid rgba(34,197,94,0.30)" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} style={{ color: "#22C55E" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <p className="text-[12px] font-medium" style={{ color: "rgba(255,255,255,0.65)" }}>
            Unlock your full tax report
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function PaywallGate({ reportUnlocked, allItems, categoryGroups, total, confirmedCount }: Props) {
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [interval, setInterval] = useState<Interval>("year");
  const [isIOS,    setIsIOS]    = useState(false);

  useEffect(() => { setIsIOS(isCapacitorIOS()); }, []);

  async function handleUnlock() {
    if (isIOS) return; // hard guard — Stripe must never open inside iOS app
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/stripe/create-checkout-session", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ interval, cancelPath: "/export" }),
      });
      const body = await res.json();
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

  // ── Unlocked: full breakdown + download ───────────────────────────────────
  if (reportUnlocked) {
    return (
      <motion.div
        className="space-y-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Category breakdown */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-5" style={{ color: "var(--text-muted)" }}>
            Breakdown
          </p>
          <div className="space-y-6">
            {categoryGroups.map(({ cat, catTotal, items }) => (
              <div key={cat}>
                <div
                  className="flex items-baseline justify-between pb-2.5 mb-2"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                    {cat}
                  </span>
                  <span className="text-[14px] font-semibold tabular-nums" style={{ color: "var(--text-secondary)" }}>
                    {fmtRound(catTotal)}
                  </span>
                </div>
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-baseline justify-between gap-4 py-2.5"
                    style={{ borderBottom: idx < items.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                  >
                    <p className="truncate text-[13px]" style={{ color: "var(--text-primary)" }}>{item.merchant}</p>
                    <span className="shrink-0 text-[13px] tabular-nums" style={{ color: "var(--text-secondary)" }}>{fmt(item.amount)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Download */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="relative overflow-hidden rounded-2xl px-6 py-8"
          style={{
            backgroundColor: "rgba(13, 20, 33, 0.92)",
            border:          "1px solid rgba(34,197,94,0.18)",
            boxShadow:       "0 2px 8px rgba(0,0,0,0.4), 0 0 40px rgba(34,197,94,0.06)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(ellipse 80% 50% at 50% 100%, rgba(34,197,94,0.06) 0%, transparent 100%)" }}
          />
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#22C55E" }}>
            Ready to lodge
          </p>
          <p className="text-[18px] font-semibold leading-snug mb-1" style={{ color: "var(--text-primary)" }}>
            Your report is ready
          </p>
          <p className="text-[13px] mb-8" style={{ color: "var(--text-muted)" }}>
            Download your XLSX summary — share it with your accountant or use it to lodge your return.
          </p>
          <ExportButton />
        </motion.div>
      </motion.div>
    );
  }

  // ── iOS locked: real preview + RevenueCat paywall ─────────────────────────
  if (isIOS) {
    return (
      <motion.div
        className="mb-8 rounded-2xl overflow-hidden"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        style={{
          backgroundColor: "rgba(13, 20, 33, 0.92)",
          border:          "1px solid rgba(34,197,94,0.22)",
          boxShadow:       "0 2px 8px rgba(0,0,0,0.5), 0 0 48px rgba(34,197,94,0.07)",
        }}
      >
        <div className="h-[2px] w-full" style={{ background: "linear-gradient(90deg, #22C55E, #14B8A6)" }} />
        <div className="px-5 pt-5 pb-1">
          <ExportLockedPreview
            allItems={allItems}
            categoryGroups={categoryGroups}
            total={total}
            confirmedCount={confirmedCount}
          />
        </div>
        <div className="px-5 pb-5">
          <IOSPaywall compact />
        </div>
      </motion.div>
    );
  }

  // ── Web locked: blurred real preview + Stripe paywall ────────────────────
  return (
    <>
      {/* Blurred preview of real user data */}
      <motion.div
        className="mb-5 relative overflow-hidden rounded-2xl"
        style={{ pointerEvents: "none", userSelect: "none" }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        <div style={{ filter: "blur(5px)", opacity: 0.4 }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
            Breakdown
          </p>
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-border)" }}>
            <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--bg-border)" }}>
              <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                {allItems[0]?.category ?? "Category"}
              </span>
              <span className="text-[14px] font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>$—</span>
            </div>
            {allItems.slice(0, 4).map((item, i) => (
              <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-2.5"
                style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                <div className="min-w-0">
                  <p className="truncate text-[13px]" style={{ color: "var(--text-primary)" }}>{item.merchant}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{item.date}</p>
                </div>
                <span className="shrink-0 text-[13px] tabular-nums" style={{ color: "var(--text-secondary)" }}>
                  {fmt(item.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-20"
          style={{ background: "linear-gradient(to bottom, transparent, var(--bg-app))" }} />
      </motion.div>

      {/* Web Stripe paywall card */}
      <motion.div
        className="mb-8 rounded-2xl px-6 py-7"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        style={{
          backgroundColor: "rgba(13, 20, 33, 0.92)",
          border:          "1px solid rgba(34,197,94,0.22)",
          boxShadow:       "0 2px 8px rgba(0,0,0,0.5), 0 0 48px rgba(34,197,94,0.07)",
        }}
      >
        {/* Lock icon */}
        <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.20)" }}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} style={{ color: "#22C55E" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>

        <h2 className="text-[22px] font-bold mb-2" style={{ color: "var(--text-primary)" }}>Unlock Kashio Pro</h2>
        <p className="text-[13px] mb-5" style={{ color: "var(--text-secondary)" }}>
          Get your full tax summary, review all deductions, and keep proof in one place.
        </p>

        <ul className="mb-6 space-y-2.5">
          {["Full deduction review", "Export-ready tax summary", "WFH deduction tools", "Up to 100 receipt uploads"].map((item) => (
            <li key={item} className="flex items-center gap-2.5 text-[13px]" style={{ color: "var(--text-secondary)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" style={{ color: "#22C55E" }}>
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {item}
            </li>
          ))}
        </ul>

        {/* Billing interval toggle */}
        <div className="mb-5 flex rounded-xl p-1" style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
          {(["month", "year"] as Interval[]).map((i) => (
            <button key={i} onClick={() => setInterval(i)}
              className="relative flex-1 rounded-lg py-2 text-[13px] font-medium transition-all duration-150"
              style={{
                backgroundColor: interval === i ? "rgba(34,197,94,0.15)" : "transparent",
                border:          interval === i ? "1px solid rgba(34,197,94,0.25)" : "1px solid transparent",
                color:           interval === i ? "#22C55E" : "var(--text-muted)",
              }}
            >
              {i === "month" ? "Monthly" : "Annual"}
              {i === "year" && (
                <span className="ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                  style={{ backgroundColor: "rgba(34,197,94,0.20)", color: "#22C55E" }}>
                  {ANNUAL_SAVING}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Price */}
        <div className="mb-5 flex items-baseline gap-2">
          <span className="text-[34px] font-bold tabular-nums leading-none" style={{ color: "var(--text-primary)" }}>
            {interval === "month" ? MONTHLY_PRICE : ANNUAL_PRICE}
          </span>
          <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>
            AUD / {interval === "month" ? "month" : "year"}
          </span>
        </div>

        <Button className="w-full mb-3" onClick={handleUnlock} disabled={loading}>
          {loading ? "Redirecting…" : "Unlock export report"}
        </Button>

        {error && <p className="text-center text-[12px] mb-1" style={{ color: "#f87171" }}>{error}</p>}

        <p className="text-center text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          By subscribing, you agree to Kashio&apos;s{" "}
          <a href="https://kashio.com.au/legal/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Terms</a>,{" "}
          <a href="https://kashio.com.au/legal/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Privacy Policy</a>.
          Cancel anytime.
        </p>
      </motion.div>
    </>
  );
}
