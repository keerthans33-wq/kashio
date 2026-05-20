"use client";

// Web: Stripe checkout. iOS: RevenueCat via IOSPaywall.
// Stripe must NEVER open inside the iOS app.

import { useState } from "react";
import { motion } from "motion/react";
import { ExportButton } from "./ExportButton";
import { TaxPdfButton } from "./TaxPdfButton";
import { Button } from "@/components/ui/button";
import { IOSPaywall } from "@/components/shared/IOSPaywall";
import { useRevenueCat } from "@/components/providers/RevenueCatProvider";
import { FALLBACK_PRICE, ANNUAL_SAVING_PCT } from "@/lib/pricing";

export type Item = {
  id:         string;
  merchant:   string;
  date:       string;
  amount:     number;
  category:   string;
  confidence: string;
  reason:     string;
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
  likelyTotal:    number;
  reviewTotal:    number;
  excludedTotal:  number;
  confirmedCount: number;
  wfhYtdHours:   number;
  wfhYtdEst:     number;
  email:          string;
};

type Interval = "month" | "year";

const fmt = (n: number) =>
  n.toLocaleString("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtRound = (n: number) =>
  n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

function confidenceBadge(confidence: string) {
  if (confidence === "HIGH") return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
      style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.20)" }}>
      High
    </span>
  );
  if (confidence === "MEDIUM") return null;
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
      style={{ backgroundColor: "rgba(156,163,175,0.10)", color: "#9CA3AF", border: "1px solid rgba(156,163,175,0.20)" }}>
      Low
    </span>
  );
}

// ── Export-specific locked preview with real user data ─────────────────────────

type PreviewProps = {
  allItems:       Item[];
  categoryGroups: CategoryGroup[];
  likelyTotal:    number;
  reviewTotal:    number;
  confirmedCount: number;
};

function ExportLockedPreview({ allItems, categoryGroups, likelyTotal, reviewTotal, confirmedCount }: PreviewProps) {
  const estimatedSaving = Math.round(likelyTotal * 0.325);
  const top3            = categoryGroups.slice(0, 3);
  const sampleItems     = allItems.slice(0, 3);
  const hasRealData     = confirmedCount > 0;

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

      {/* ── Visible summary stats ───────────────────────────────────────────── */}
      <div className="mb-4">
        <div
          className="rounded-xl px-3 py-3"
          style={{ backgroundColor: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.16)" }}
        >
          <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "rgba(34,197,94,0.70)" }}>
            Claimed deductions
          </p>
          <p className="text-[20px] font-bold tabular-nums" style={{ color: "#22C55E" }}>
            {hasRealData ? fmtRound(likelyTotal) : "—"}
          </p>
        </div>
      </div>

      {/* Estimated saving */}
      {hasRealData && estimatedSaving > 0 && (
        <div
          className="mb-4 flex items-center justify-between rounded-xl px-3 py-2.5"
          style={{ backgroundColor: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.12)" }}
        >
          <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
            Estimated tax saving (32.5%) — likely deductions only
          </p>
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

      {/* Sample rows */}
      {sampleItems.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Sample entries</p>
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
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

      {/* Blurred full report + lock overlay */}
      <div className="relative rounded-xl overflow-hidden">
        <div style={{ filter: "blur(4px)", userSelect: "none", pointerEvents: "none" }} aria-hidden="true">
          <div style={{ backgroundColor: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.30)" }}>
              Full potential deductions breakdown
            </p>
            {(categoryGroups.length > 0 ? categoryGroups : [
              { cat: "Home Office / WFH", catTotal: 1140 },
              { cat: "Work Tools & Software", catTotal: 823 },
              { cat: "Professional Development", catTotal: 499 },
              { cat: "Work Travel", catTotal: 385 },
            ]).map((g, i) => (
              <div key={g.cat} className="flex items-center justify-between px-3 py-1.5"
                style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>{g.cat}</p>
                <p className="text-[12px] font-medium tabular-nums" style={{ color: "#22C55E" }}>{fmtRound(g.catTotal)}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 px-3 py-3"
            style={{ backgroundColor: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex-1 h-9 rounded-xl" style={{ backgroundColor: "rgba(34,197,94,0.18)", border: "1px solid rgba(34,197,94,0.25)" }} />
            <div className="flex-1 h-9 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
          style={{ background: "linear-gradient(to bottom, rgba(5,7,14,0.35) 0%, rgba(5,7,14,0.72) 100%)", backdropFilter: "blur(1px)" }}>
          <div className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(34,197,94,0.14)", border: "1px solid rgba(34,197,94,0.30)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} style={{ color: "#22C55E" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <p className="text-[12px] font-medium" style={{ color: "rgba(255,255,255,0.65)" }}>Unlock your full tax report</p>
        </div>
      </div>
    </div>
  );
}

// ── Unlocked section row ───────────────────────────────────────────────────────

function SectionHeading({ label, total, color }: { label: string; total: number; color: string }) {
  return (
    <div className="flex items-baseline justify-between pb-2 mb-1"
      style={{ borderBottom: `1px solid rgba(255,255,255,0.08)` }}>
      <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <span className="text-[14px] font-semibold tabular-nums" style={{ color }}>
        {fmtRound(total)}
      </span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function PaywallGate({ reportUnlocked, allItems, categoryGroups, total, likelyTotal, reviewTotal, excludedTotal, confirmedCount, wfhYtdHours, wfhYtdEst, email }: Props) {
  const { isIOS, platformReady, isPro } = useRevenueCat();
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [interval, setInterval] = useState<Interval>("year");

  const isUnlocked = reportUnlocked || isPro;

  async function handleUnlock() {
    if (isIOS) return;
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/stripe/create-checkout-session", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ interval, cancelPath: "/export" }),
      });
      const body = await res.json();
      if (!res.ok || !body.url) { setError("Something went wrong. Please try again."); return; }
      window.location.href = body.url;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Unlocked: full breakdown + download ───────────────────────────────────
  if (isUnlocked) {
    // Build per-section category groups
    function groupByCategory(items: Item[]) {
      const map = new Map<string, Item[]>();
      for (const item of items) {
        if (!map.has(item.category)) map.set(item.category, []);
        map.get(item.category)!.push(item);
      }
      return [...map.entries()]
        .sort((a, b) => b[1].reduce((s, i) => s + i.amount, 0) - a[1].reduce((s, i) => s + i.amount, 0));
    }

    return (
      <motion.div
        className="space-y-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* ── Claimed Deductions breakdown ─────────────────────────────── */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-5" style={{ color: "var(--text-muted)" }}>
            Claimed Deductions
          </p>

          {allItems.length > 0 && (
            <div className="mb-6">
              <SectionHeading label="Claimed deductions" total={total} color="#22C55E" />
              <div className="mt-2 space-y-0">
                {groupByCategory(allItems).map(([cat, items]) => (
                  <div key={cat} className="mb-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5 mt-3" style={{ color: "var(--text-muted)", opacity: 0.7 }}>
                      {cat}
                    </p>
                    {items.map((item, idx) => (
                      <div key={item.id} className="flex items-baseline justify-between gap-4 py-2"
                        style={{ borderBottom: idx < items.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                        <p className="truncate text-[13px] min-w-0" style={{ color: "var(--text-primary)" }}>{item.merchant}</p>
                        <span className="shrink-0 text-[13px] tabular-nums" style={{ color: "var(--text-secondary)" }}>
                          {fmt(item.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary row */}
          <div className="rounded-xl px-4 py-3 space-y-1"
            style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex justify-between text-[12px]">
              <span style={{ color: "var(--text-muted)" }}>Claimed deductions</span>
              <span className="tabular-nums font-medium" style={{ color: "#22C55E" }}>{fmtRound(total)}</span>
            </div>
            <div className="flex justify-between text-[12px] pt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ color: "var(--text-muted)" }}>Estimated tax saving (32.5%)</span>
              <span className="tabular-nums font-semibold" style={{ color: "#22C55E" }}>
                ~{fmtRound(Math.round(total * 0.325))}
              </span>
            </div>
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
          <div className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(ellipse 80% 50% at 50% 100%, rgba(34,197,94,0.06) 0%, transparent 100%)" }} />
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#22C55E" }}>
            Ready to share
          </p>
          <p className="text-[18px] font-semibold leading-snug mb-1" style={{ color: "var(--text-primary)" }}>
            Your report is ready
          </p>
          <p className="text-[13px] mb-8" style={{ color: "var(--text-muted)" }}>
            Download your summary — share it with your accountant or use it to prepare your return.
          </p>
          <div className="space-y-3">
            <ExportButton />
            <TaxPdfButton
              allItems={allItems}
              categoryGroups={categoryGroups}
              total={total}
              likelyTotal={likelyTotal}
              reviewTotal={reviewTotal}
              excludedTotal={excludedTotal}
              confirmedCount={confirmedCount}
              wfhYtdHours={wfhYtdHours}
              wfhYtdEst={wfhYtdEst}
              email={email}
            />
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Wait until platform is known
  if (!platformReady) return null;

  // ── iOS locked ────────────────────────────────────────────────────────────
  if (isIOS) {
    return (
      <>
        <motion.div
          className="mb-5 relative overflow-hidden rounded-2xl"
          style={{ pointerEvents: "none", userSelect: "none" }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          <div style={{ filter: "blur(5px)", opacity: 0.4 }}>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
              Potential Deductions
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
          <IOSPaywall buttonLabel="Unlock export report" />
        </motion.div>
      </>
    );
  }

  // ── Web locked ────────────────────────────────────────────────────────────
  return (
    <>
      {/* Blurred preview */}
      <motion.div
        className="mb-5 relative overflow-hidden rounded-2xl"
        style={{ pointerEvents: "none", userSelect: "none" }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        <div style={{ filter: "blur(5px)", opacity: 0.4 }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
            Potential Deductions
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

      {/* Stripe paywall card */}
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
          {["Full potential deductions breakdown", "Export-ready tax summary", "WFH deduction tools", "Up to 100 receipt uploads"].map((item) => (
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
                  {ANNUAL_SAVING_PCT}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Price */}
        <div className="mb-5 flex items-baseline gap-2">
          <span className="text-[34px] font-bold tabular-nums leading-none" style={{ color: "var(--text-primary)" }}>
            {interval === "month" ? FALLBACK_PRICE.monthly : FALLBACK_PRICE.annual}
          </span>
          <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>
            AUD / {interval === "month" ? "month" : "year"}
          </span>
        </div>

        <Button className="w-full mb-3" onClick={handleUnlock} disabled={loading}>
          {loading ? "Redirecting…" : "Unlock export report"}
        </Button>

        {error && <p className="text-center text-[12px] mb-1" style={{ color: "#f87171" }}>{error}</p>}

        <p className="text-center text-[11px] leading-relaxed mb-2" style={{ color: "var(--text-muted)" }}>
          Subscriptions auto-renew unless cancelled at least 24 hours before the end of the current period.
        </p>
        <p className="text-center text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          <a href="https://kashio.com.au/legal/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Privacy Policy</a>
          {" · "}
          <a href="https://kashio.com.au/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Terms of Use</a>
        </p>
      </motion.div>
    </>
  );
}
