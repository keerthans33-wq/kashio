import Link from "next/link";
import { db } from "../../../lib/db";
import { requireUserWithType } from "../../../lib/auth";
import { mapExportRow } from "../../../lib/export/mapExportRow";
import { ACTIVE_CATEGORIES, CATEGORIES_BY_USER_TYPE } from "../../../lib/rules/categories";
import { calcWfhSummary } from "../../../lib/wfhSummary";
import { PaywallGate } from "./PaywallGate";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/FadeIn";
import { MobileScreen } from "@/components/layout/mobile-screen";

export const dynamic = "force-dynamic";

const PAGE_HEADING: Record<string, string> = {
  employee:    "Your tax summary",
  contractor:  "Your expense summary",
  sole_trader: "Your tax summary",
};

const SUBTITLE: Record<string, string> = {
  employee:    "Confirmed work-related deductions, ready for your accountant or return.",
  contractor:  "Confirmed business expenses for this financial year.",
  sole_trader: "Confirmed deductions, ready for your accountant or return.",
};

const TOTAL_LABEL: Record<string, string> = {
  employee:    "Total deductions",
  contractor:  "Total expenses",
  sole_trader: "Total deductions",
};

const WFH_LABEL: Record<string, string> = {
  employee:    "Work from home",
  contractor:  "Home office",
  sole_trader: "Home office",
};

const EMPTY_CTA: Record<string, string> = {
  employee:    "Review deductions",
  contractor:  "Review expenses",
  sole_trader: "Review deductions",
};

const EMPTY_BODY: Record<string, string> = {
  employee:    "Confirm your work-related deductions in Review and they'll appear here.",
  contractor:  "Confirm your business expenses in Review and they'll appear here.",
  sole_trader: "Confirm your deductions in Review and they'll appear here.",
};

export default async function Export() {
  const { id: userId, userType } = await requireUserWithType();
  const allowedCategories = (userType && CATEGORIES_BY_USER_TYPE[userType]) ?? ACTIVE_CATEGORIES;

  const [confirmedRaw, wfhEntries] = await Promise.all([
    db.deductionCandidate.findMany({
      where:   { status: "CONFIRMED", userId },
      include: { transaction: true },
      orderBy: { transaction: { date: "asc" } },
    }),
    db.wfhLog.findMany({ where: { userId }, select: { date: true, hours: true } }),
  ]);

  const { ytdHours: wfhYtdHours, ytdEst: wfhYtdEst } = calcWfhSummary(wfhEntries);

  const confirmed = confirmedRaw.filter((c) => allowedCategories.includes(c.category));

  const allItems = confirmed.map((c) => ({
    id:  c.id,
    row: mapExportRow(c),
  }));

  const total           = allItems.reduce((sum, c) => sum + c.row.amount, 0);
  const estimatedSaving = Math.round(total * 0.325);

  const catTotals = new Map<string, number>();
  for (const item of allItems) {
    catTotals.set(item.row.category, (catTotals.get(item.row.category) ?? 0) + item.row.amount);
  }
  const categoryGroups = [...catTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([cat, catTotal]) => ({
      cat,
      catTotal,
      items: allItems.filter((i) => i.row.category === cat),
    }));

  const fmtRound = (n: number) =>
    n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

  const heading  = (userType && PAGE_HEADING[userType]) ?? "Your tax summary";
  const subtitle = (userType && SUBTITLE[userType])     ?? "Everything you've confirmed this financial year.";

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (confirmed.length === 0) {
    return (
      <MobileScreen maxWidth="md" as="main" padY={false} className="py-12 sm:py-16">
        <FadeIn className="text-center space-y-6 py-8">
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.14)" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: "#22C55E" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 002.25 2.25h.75" />
            </svg>
          </div>
          <div className="space-y-2">
            <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              {heading}
            </h1>
            <p className="text-[14px] max-w-xs mx-auto" style={{ color: "var(--text-secondary)" }}>
              {(userType && EMPTY_BODY[userType]) ?? "Confirm some deductions in Review and they'll appear here."}
            </p>
          </div>
          <Button asChild>
            <Link href="/review">{(userType && EMPTY_CTA[userType]) ?? "Review deductions"}</Link>
          </Button>
        </FadeIn>
      </MobileScreen>
    );
  }

  // ── Full export view ─────────────────────────────────────────────────────────
  return (
    <MobileScreen maxWidth="md" as="main" padY={false} className="py-10 sm:py-14">

      {/* 1 — Header */}
      <FadeIn className="mb-7">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight" style={{ color: "var(--text-primary)" }}>
          {heading}
        </h1>
        <p className="mt-1.5 text-[14px]" style={{ color: "var(--text-muted)" }}>
          {subtitle}
        </p>
      </FadeIn>

      {/* 2 — Summary cards */}
      <FadeIn delay={0.06} className="mb-6">
        <div className={`grid gap-3${wfhYtdHours > 0 ? " grid-cols-2" : ""}`}>

          {/* Deductions — dominant */}
          <div
            className="relative rounded-2xl overflow-hidden p-5"
            style={{
              backgroundColor: "rgba(13, 20, 33, 0.92)",
              border:          "1px solid rgba(34,197,94,0.22)",
              boxShadow:       "0 0 40px rgba(34,197,94,0.06), 0 2px 8px rgba(0,0,0,0.4)",
            }}
          >
            <div className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: "#22C55E", opacity: 0.55 }} />
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
              {(userType && TOTAL_LABEL[userType]) ?? "Total deductions"}
            </p>
            <p className="text-[28px] font-bold tabular-nums leading-none tracking-tight" style={{ color: "var(--text-primary)" }}>
              {fmtRound(total)}
            </p>
            <p className="mt-2 text-[12px] font-semibold" style={{ color: "#22C55E" }}>
              ~{fmtRound(estimatedSaving)} est. tax saving
            </p>
            <p className="mt-1 text-[12px]" style={{ color: "var(--text-muted)" }}>
              {confirmed.length} item{confirmed.length !== 1 ? "s" : ""} confirmed
            </p>
          </div>

          {/* WFH — equal size, shown only when logged */}
          {wfhYtdHours > 0 && (
            <div
              className="rounded-2xl p-5"
              style={{
                backgroundColor: "var(--bg-card)",
                border:          "1px solid var(--bg-border)",
                boxShadow:       "var(--shadow-card)",
              }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
                {(userType && WFH_LABEL[userType]) ?? "Home office"}
              </p>
              <p className="text-[24px] font-bold tabular-nums leading-none tracking-tight" style={{ color: "var(--text-primary)" }}>
                ~{fmtRound(wfhYtdEst)}
              </p>
              <p className="mt-2 text-[12px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                {wfhYtdHours} hrs logged
              </p>
              <p className="mt-1 text-[12px]" style={{ color: "var(--text-muted)" }}>
                67c/hr ATO rate
              </p>
            </div>
          )}

        </div>
      </FadeIn>

      {/* 3 — Breakdown + download (paywalled) */}
      <PaywallGate
        allItems={allItems.map((i) => ({ id: i.id, merchant: i.row.merchant, date: i.row.date, amount: i.row.amount, category: i.row.category }))}
        categoryGroups={categoryGroups.map((g) => ({ cat: g.cat, catTotal: g.catTotal, items: g.items.map((i) => ({ id: i.id, merchant: i.row.merchant, date: i.row.date, amount: i.row.amount, category: i.row.category })) }))}
        total={total}
        confirmedCount={confirmed.length}
      />

      {/* 4 — Footer */}
      <div
        className="mt-10 pt-5 space-y-1.5"
        style={{ borderTop: "1px solid var(--bg-border)" }}
      >
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          The ATO recommends keeping receipts for all claims over $300.
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
          Kashio is not a tax adviser. Check with your accountant before lodging.
        </p>
      </div>

    </MobileScreen>
  );
}
