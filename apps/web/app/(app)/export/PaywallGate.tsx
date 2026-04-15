"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ExportButton } from "./ExportButton";
import { Button } from "@/components/ui/button";

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
  allItems:       Item[];
  categoryGroups: CategoryGroup[];
  total:          number;
  confirmedCount: number;
};

const DEV_KEY = "kashio_dev_unlocked";

const fmt = (n: number) =>
  n.toLocaleString("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtRound = (n: number) =>
  n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

export function PaywallGate({ allItems, categoryGroups, total, confirmedCount }: Props) {
  const [isPaid, setIsPaid] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DEV_KEY) === "true") setIsPaid(true);
    } catch {}
  }, []);

  function unlock() {
    setIsPaid(true);
    try { localStorage.setItem(DEV_KEY, "true"); } catch {}
  }

  // ── Unlocked: breakdown + download ────────────────────────────────────────
  if (isPaid) {
    return (
      <motion.div
        className="space-y-5"
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
                {/* Category header — name + total with ledger rule */}
                <div
                  className="flex items-baseline justify-between pb-2.5 mb-1"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <span
                    className="text-[11px] font-semibold uppercase tracking-widest"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {cat}
                  </span>
                  <span
                    className="text-[14px] font-semibold tabular-nums"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {fmtRound(catTotal)}
                  </span>
                </div>

                {/* Line items — single line, no date */}
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-baseline justify-between gap-4 py-2.5"
                    style={{
                      borderBottom: idx < items.length - 1
                        ? "1px solid rgba(255,255,255,0.04)"
                        : "none",
                    }}
                  >
                    <p className="truncate text-[13px]" style={{ color: "var(--text-primary)" }}>
                      {item.merchant}
                    </p>
                    <span
                      className="shrink-0 text-[13px] tabular-nums"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {fmt(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Download — readiness section */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="relative overflow-hidden rounded-2xl px-6 py-6"
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
          <p
            className="text-[11px] font-semibold uppercase tracking-widest mb-1"
            style={{ color: "#22C55E" }}
          >
            Ready to lodge
          </p>
          <p className="text-[16px] font-semibold leading-snug mb-1" style={{ color: "var(--text-primary)" }}>
            Your report is ready
          </p>
          <p className="text-[13px] mb-5" style={{ color: "var(--text-muted)" }}>
            Download your XLSX summary — share it with your accountant or use it to lodge your return.
          </p>
          <ExportButton />
        </motion.div>

      </motion.div>
    );
  }

  // ── Locked: blurred preview + paywall ─────────────────────────────────────
  return (
    <>
      {/* Blurred breakdown preview */}
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
          <div
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-border)" }}
          >
            <div
              className="px-5 py-3 flex items-center justify-between"
              style={{ borderBottom: "1px solid var(--bg-border)" }}
            >
              <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                {allItems[0]?.category ?? "Category"}
              </span>
              <span className="text-[14px] font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
                $—
              </span>
            </div>
            {allItems.slice(0, 4).map((item, i) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 px-5 py-2.5"
                style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
              >
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
        <div
          className="absolute inset-x-0 bottom-0 h-20"
          style={{ background: "linear-gradient(to bottom, transparent, var(--bg-app))" }}
        />
      </motion.div>

      {/* Paywall card */}
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
        <div
          className="mb-5 flex h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.20)" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} style={{ color: "#22C55E" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>

        <h2 className="text-[22px] font-bold mb-2" style={{ color: "var(--text-primary)" }}>
          Unlock your tax summary
        </h2>
        <p className="text-[13px] mb-5" style={{ color: "var(--text-secondary)" }}>
          Get your full itemised breakdown across {confirmedCount} confirmed {confirmedCount === 1 ? "item" : "items"} plus a downloadable report ready to share with your accountant.
        </p>

        <ul className="mb-6 space-y-2.5">
          {[
            "Full itemised category breakdown",
            "Downloadable XLSX tax report",
            "Work from home hours summary",
            "Ready for your accountant",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2.5 text-[13px]" style={{ color: "var(--text-secondary)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" style={{ color: "#22C55E" }}>
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {item}
            </li>
          ))}
        </ul>

        <div className="mb-5 flex items-baseline gap-2.5">
          <span className="text-[34px] font-bold tabular-nums leading-none" style={{ color: "var(--text-primary)" }}>
            $19.99
          </span>
          <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>
            one-time · this financial year
          </span>
        </div>

        <Button onClick={unlock} className="w-full">
          Unlock report
        </Button>
      </motion.div>
    </>
  );
}
