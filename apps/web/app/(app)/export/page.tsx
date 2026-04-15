import Link from "next/link";
import { db } from "../../../lib/db";
import { requireUserWithType } from "../../../lib/auth";
import { mapExportRow } from "../../../lib/export/mapExportRow";
import { ACTIVE_CATEGORIES, CATEGORIES_BY_USER_TYPE } from "../../../lib/rules/categories";
import { calcWfhSummary } from "../../../lib/wfhSummary";
import { PaywallGate } from "./PaywallGate";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const SUBTITLE: Record<string, string> = {
  employee:    "Your confirmed deductions for this financial year, ready for your accountant or tax return.",
  contractor:  "Your confirmed expenses for this financial year, ready to reconcile and lodge.",
  sole_trader: "Your confirmed deductions for this financial year, ready for your accountant or tax return.",
};

const TOTAL_LABEL: Record<string, string> = {
  employee:    "Total deductions",
  contractor:  "Total expenses",
  sole_trader: "Total deductions",
};

const SAVING_LABEL: Record<string, (saving: string) => string> = {
  employee:    (s) => `~${s} estimated saving at 32.5c marginal rate`,
  contractor:  (s) => `~${s} estimated saving`,
  sole_trader: (s) => `~${s} estimated saving`,
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

  const { ytdHours: wfhYtdHours, ytdEst: wfhYtdEst, fyLabel: wfhFyLabel } = calcWfhSummary(wfhEntries);

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

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtRound = (n: number) =>
    n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

  if (confirmed.length === 0) {
    return (
      <main className="mx-auto max-w-lg px-4 sm:px-6 py-12 text-center space-y-5">
        <div>
          <h1 className="text-[30px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Your tax summary is empty
          </h1>
          <p className="mt-2 text-[15px]" style={{ color: "var(--text-secondary)" }}>
            {userType === "contractor"
              ? "Confirm your business expenses in Review and they'll appear here."
              : "Confirm some deductions in Review and they'll appear here."}
          </p>
        </div>
        <Button asChild>
          <Link href="/review">{(userType && EMPTY_CTA[userType]) ?? "Review deductions"}</Link>
        </Button>
      </main>
    );
  }

  const sectionLabel = "text-[11px] font-semibold uppercase tracking-widest mb-3";

  return (
    <main className="mx-auto max-w-lg px-4 sm:px-6 py-8 sm:py-12">

      {/* 1. Title + subtitle */}
      <div className="mb-8">
        <h1 className="text-[30px] font-bold leading-tight tracking-tight" style={{ color: "var(--text-primary)" }}>
          Your tax summary
        </h1>
        <p className="mt-2 text-[15px]" style={{ color: "var(--text-muted)" }}>
          {(userType && SUBTITLE[userType]) ?? "Everything you've confirmed this financial year."}
        </p>
      </div>

      {/* 2. Summary cards — always visible */}
      <div className={`mb-10 ${wfhYtdHours > 0 ? "grid grid-cols-2 gap-4" : ""}`}>

        {/* Total deductions */}
        <div
          className="rounded-2xl px-5 py-5 flex flex-col gap-3"
          style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-border)", boxShadow: "var(--shadow-card)", minHeight: 190 }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            {(userType && TOTAL_LABEL[userType]) ?? "Total deductions"}
          </p>
          <div className="flex-1 flex flex-col justify-end gap-1.5">
            <p
              className={`font-bold tabular-nums leading-none tracking-tight ${wfhYtdHours > 0 ? "text-[32px]" : "text-[44px]"}`}
              style={{ color: "var(--text-primary)" }}
            >
              {fmtRound(total)}
            </p>
            <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
              {confirmed.length} item{confirmed.length !== 1 ? "s" : ""}
            </p>
          </div>
          <p className="text-[15px] font-semibold" style={{ color: "var(--success)" }}>
            ~{fmtRound(estimatedSaving)} tax saving
          </p>
        </div>

        {/* Home office — only when hours exist */}
        {wfhYtdHours > 0 && (
          <div
            className="rounded-2xl px-5 py-5 flex flex-col gap-3"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-border)", boxShadow: "var(--shadow-card)", minHeight: 190 }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              {(userType && WFH_LABEL[userType]) ?? "Home office"}
            </p>
            <div className="flex-1 flex flex-col justify-end gap-1.5">
              <p className="text-[32px] font-bold tabular-nums leading-none tracking-tight" style={{ color: "var(--text-primary)" }}>
                ~{fmtRound(wfhYtdEst)}
              </p>
              <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
                {wfhYtdHours} hr{wfhYtdHours !== 1 ? "s" : ""} logged
              </p>
            </div>
            <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
              67c/hr fixed rate
            </p>
          </div>
        )}
      </div>

      <PaywallGate
        allItems={allItems.map((i) => ({ id: i.id, merchant: i.row.merchant, date: i.row.date, amount: i.row.amount, category: i.row.category }))}
        categoryGroups={categoryGroups.map((g) => ({ cat: g.cat, catTotal: g.catTotal, items: g.items.map((i) => ({ id: i.id, merchant: i.row.merchant, date: i.row.date, amount: i.row.amount, category: i.row.category })) }))}
        total={total}
      />

      {/* Footer notes */}
      <div
        className="mt-8 pt-6 space-y-1.5 text-center"
        style={{ borderTop: "1px solid var(--bg-border)" }}
      >
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          The ATO recommends keeping receipts for your records.
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
          Kashio is not a tax adviser. Check with your accountant before lodging.
        </p>
      </div>

    </main>
  );
}
