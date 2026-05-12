"use client";

// Web: click opens ProPaywallModal → Stripe.
// iOS: blurred preview sits above inline IOSPaywall compact.
// Stripe must never open inside the iOS app — all Stripe paths are behind !isIOS guards.

import { useState } from "react";
import { ProPaywallModal } from "@/components/shared/ProPaywallModal";
import { IOSPaywall } from "@/components/shared/IOSPaywall";
import { useRevenueCat } from "@/components/providers/RevenueCatProvider";

// Fake-but-plausible values — blurred enough that real numbers aren't needed,
// but realistic enough to create genuine curiosity.
const PREVIEW_ROWS = [
  { label: "Transactions imported", value: "24",     bar: 100, color: "#22C55E" },
  { label: "Deductions reviewed",   value: "18 / 24", bar: 75,  color: "#60A5FA" },
  { label: "Categories complete",   value: "4 / 6",   bar: 66,  color: "#A78BFA" },
  { label: "Export ready",          value: "3 items",  bar: 50,  color: "#F59E0B" },
];

// ── Blurred preview rows + frosted lock overlay ────────────────────────────────

function LockedPreview() {
  return (
    <div className="mb-4">
      {/* Section label + badge */}
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          Tax readiness
        </p>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest"
          style={{ backgroundColor: "rgba(34,197,94,0.14)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.24)" }}
        >
          Pro feature
        </span>
      </div>

      {/* Rows + frosted overlay wrapper */}
      <div className="relative rounded-xl overflow-hidden">

        {/* Blurred data rows */}
        <div
          style={{
            filter:        "blur(3.5px)",
            userSelect:    "none",
            pointerEvents: "none",
          }}
          aria-hidden="true"
        >
          {PREVIEW_ROWS.map((row, i) => (
            <div
              key={row.label}
              className="flex items-center gap-3 px-3 py-2.5"
              style={{
                backgroundColor: "rgba(255,255,255,0.025)",
                borderBottom: i < PREVIEW_ROWS.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
              }}
            >
              {/* Fake circle check */}
              <span
                className="h-4 w-4 shrink-0 rounded-full"
                style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
              />
              <p className="flex-1 text-[12px]" style={{ color: "var(--text-secondary)" }}>
                {row.label}
              </p>
              {/* Mini progress bar */}
              <div className="w-14 h-1 rounded-full overflow-hidden shrink-0" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full" style={{ width: `${row.bar}%`, backgroundColor: row.color }} />
              </div>
              <p className="w-12 text-right text-[11px] font-medium tabular-nums shrink-0" style={{ color: "var(--text-secondary)" }}>
                {row.value}
              </p>
            </div>
          ))}
        </div>

        {/* Frosted lock overlay */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2"
          style={{
            background:      "linear-gradient(to bottom, rgba(5,7,14,0.40) 0%, rgba(5,7,14,0.72) 100%)",
            backdropFilter:  "blur(1px)",
          }}
        >
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(34,197,94,0.14)", border: "1px solid rgba(34,197,94,0.30)" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} style={{ color: "#22C55E" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <p className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>
            Unlock to see your full breakdown
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function DashboardProUpsell() {
  const { isIOS, platformReady } = useRevenueCat();
  const [open, setOpen] = useState(false);

  const cardStyle = {
    backgroundColor: "rgba(13,20,33,0.92)",
    border:          "1px solid rgba(34,197,94,0.22)",
    boxShadow:       "0 0 40px rgba(34,197,94,0.06), 0 2px 12px rgba(0,0,0,0.5)",
  };

  // Wait until platform is known — prevents web prices flashing on iOS
  if (!platformReady) return null;

  // iOS: blurred preview above inline IOSPaywall compact
  if (isIOS) {
    return (
      <div className="rounded-2xl overflow-hidden" style={cardStyle}>
        <div className="h-[2px] w-full" style={{ background: "linear-gradient(90deg, #22C55E, #14B8A6)" }} />
        <div className="px-4 pt-4 pb-1">
          <LockedPreview />
        </div>
        <div className="px-4 pb-4">
          <IOSPaywall compact />
        </div>
      </div>
    );
  }

  // Web: entire card is a button — click opens ProPaywallModal
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left rounded-2xl overflow-hidden transition-all duration-150 hover:opacity-90 active:scale-[0.99]"
        style={cardStyle}
      >
        <div className="h-[2px] w-full" style={{ background: "linear-gradient(90deg, #22C55E, #14B8A6)" }} />

        <div className="px-5 pt-5 pb-5">
          <LockedPreview />

          {/* Footer CTA hint */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              Full deduction review, export reports, WFH tools
            </p>
            <span
              className="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
              style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.22)" }}
            >
              Unlock Pro →
            </span>
          </div>
        </div>
      </button>

      <ProPaywallModal open={open} onOpenChange={setOpen} />
    </>
  );
}
