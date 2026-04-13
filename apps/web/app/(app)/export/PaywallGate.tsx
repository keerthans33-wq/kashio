"use client";

import { useState, useEffect } from "react";
import { ExportButton } from "./ExportButton";

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
};

const DEV_KEY = "kashio_dev_unlocked";

const fmt = (n: number) =>
  n.toLocaleString("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const sectionLabel = "text-[11px] font-semibold uppercase tracking-widest mb-3";

export function PaywallGate({ allItems, categoryGroups, total }: Props) {
  const [isPaid, setIsPaid] = useState(false);

  // Restore unlock state across page refreshes during testing
  useEffect(() => {
    try {
      if (localStorage.getItem(DEV_KEY) === "true") setIsPaid(true);
    } catch {}
  }, []);

  function unlock() {
    setIsPaid(true);
    try { localStorage.setItem(DEV_KEY, "true"); } catch {}
  }

  if (isPaid) {
    return (
      <>
        {/* Category breakdown */}
        <div className="mb-10">
          <p className={sectionLabel} style={{ color: "var(--text-muted)" }}>Breakdown</p>
          <div className="space-y-6">
            {categoryGroups.map(({ cat, catTotal, items }) => (
              <div key={cat}>
                <div className="flex items-baseline justify-between mb-3">
                  <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                    {cat}
                  </span>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text-secondary)" }}>
                    {fmt(catTotal)}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 py-2.5"
                      style={{ borderBottom: "1px solid var(--bg-elevated)" }}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm" style={{ color: "var(--text-primary)" }}>
                          {item.merchant}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                          {item.date}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm tabular-nums font-medium" style={{ color: "var(--text-primary)" }}>
                        {fmt(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex items-baseline justify-between pt-2">
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Total</span>
              <span className="text-[17px] font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
                {fmt(total)}
              </span>
            </div>
          </div>
        </div>

        {/* Download */}
        <ExportButton />
      </>
    );
  }

  return (
    <>
      {/* Blurred breakdown preview */}
      <div className="mb-6 relative overflow-hidden rounded-xl" style={{ pointerEvents: "none", userSelect: "none" }}>
        <div style={{ filter: "blur(5px)", opacity: 0.45 }}>
          <p className={sectionLabel} style={{ color: "var(--text-muted)" }}>Breakdown</p>
          <div className="rounded-xl px-5 py-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-elevated)" }}>
            {allItems.slice(0, 5).map((item, i) => (
              <div
                key={item.id}
                className={`flex items-center justify-between gap-4 ${i > 0 ? "mt-3" : ""}`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm" style={{ color: "var(--text-secondary)" }}>{item.merchant}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{item.date}</p>
                </div>
                <span className="shrink-0 text-sm tabular-nums" style={{ color: "var(--text-secondary)" }}>
                  {fmt(item.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div
          className="absolute inset-x-0 bottom-0 h-16"
          style={{ background: "linear-gradient(to bottom, transparent, var(--bg-app))" }}
        />
      </div>

      {/* Paywall card */}
      <div
        className="mb-8 rounded-2xl px-6 py-7"
        style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--violet-from)" }}
      >
        <div
          className="mb-5 flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "linear-gradient(135deg, var(--violet-from), var(--violet-to))" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h2 className="text-[20px] font-bold mb-2" style={{ color: "var(--text-primary)" }}>
          Unlock your tax summary
        </h2>
        <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
          Get your full itemised breakdown and a downloadable report — ready to share with your accountant or lodge your return.
        </p>

        <ul className="mb-6 space-y-2">
          {[
            "Full itemised category breakdown",
            "Downloadable XLSX tax report",
            "Work from home hours summary",
            "Ready for your accountant",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--text-secondary)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" style={{ color: "var(--success)" }}>
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {item}
            </li>
          ))}
        </ul>

        <div className="mb-5 flex items-baseline gap-2">
          <span className="text-[34px] font-bold tabular-nums leading-none" style={{ color: "var(--text-primary)" }}>
            $9
          </span>
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            one-time · this financial year
          </span>
        </div>

        <button
          onClick={unlock}
          className="w-full rounded-xl py-3.5 text-base font-semibold text-white transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
          style={{ background: "linear-gradient(to right, var(--violet-from), var(--violet-to))" }}
        >
          Unlock report
        </button>
      </div>
    </>
  );
}
