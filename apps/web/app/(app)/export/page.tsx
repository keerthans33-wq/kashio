import { db } from "../../../lib/db";
import { requireUserWithType } from "../../../lib/auth";
import { mapExportRow } from "../../../lib/export/mapExportRow";
import { ACTIVE_CATEGORIES, CATEGORIES_BY_USER_TYPE } from "../../../lib/rules/categories";
import { calcWfhSummary } from "../../../lib/wfhSummary";
import { ExportButton } from "./ExportButton";

export const dynamic = "force-dynamic";

const SUBTITLE: Record<string, string> = {
  employee:    "Everything you've confirmed this financial year, ready for your accountant or tax return.",
  contractor:  "Everything you've confirmed this financial year, ready to reconcile and lodge.",
  sole_trader: "Everything you've confirmed this financial year, ready for your accountant or tax return.",
};

const TOTAL_LABEL: Record<string, string> = {
  employee:    "Total deductions",
  contractor:  "Total expenses",
  sole_trader: "Total deductions",
};

const SAVING_LABEL: Record<string, (saving: string) => string> = {
  employee:    (s) => `~${s} estimated saving at 32.5c`,
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

  const { monthHours: wfhMonthHours, ytdHours: wfhYtdHours, ytdEst: wfhYtdEst, fyLabel: wfhFyLabel } = calcWfhSummary(wfhEntries);

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
      <main className="mx-auto max-w-lg px-4 sm:px-6 py-12 text-center space-y-4">
        <h1 className="text-[30px] font-bold" style={{ color: "var(--text-primary)" }}>
          Your tax summary is empty
        </h1>
        <p className="text-[15px]" style={{ color: "var(--text-secondary)" }}>
          {userType === "contractor"
            ? "Confirm your business expenses in Review and they'll appear in your summary."
            : "Confirm some deductions in Review and they'll appear in your summary."}
        </p>
        <a
          href="/review"
          className="inline-block rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:opacity-90"
          style={{ background: "linear-gradient(to right, var(--violet-from), var(--violet-to))" }}
        >
          {(userType && EMPTY_CTA[userType]) ?? "Review deductions"}
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 sm:px-6 py-8 sm:py-12 space-y-6">

      {/* 1. Header */}
      <div>
        <h1 className="text-[30px] font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
          Your tax summary
        </h1>
        <p className="mt-1 text-[15px]" style={{ color: "var(--text-secondary)" }}>
          {(userType && SUBTITLE[userType]) ?? "Everything you've confirmed this financial year."}
        </p>
      </div>

      {/* 2. Summary cards */}
      <div className={wfhYtdHours > 0 ? "grid grid-cols-2 gap-4" : ""}>
        {/* Total deductions */}
        <div className="rounded-xl px-5 py-5 flex flex-col justify-between" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-elevated)" }}>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            {(userType && TOTAL_LABEL[userType]) ?? "Total deductions"}
          </p>
          <div className="mt-3">
            <p className="text-4xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
              {fmt(total)}
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              {confirmed.length} item{confirmed.length !== 1 ? "s" : ""}
            </p>
          </div>
          <p className="mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
            {userType && SAVING_LABEL[userType]
              ? SAVING_LABEL[userType](fmtRound(estimatedSaving))
              : `~${fmtRound(estimatedSaving)} estimated saving at 32.5c`}
          </p>
        </div>

        {/* WFH — only when hours exist */}
        {wfhYtdHours > 0 && (
          <div className="rounded-xl px-5 py-5 flex flex-col justify-between" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-elevated)" }}>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              {(userType && WFH_LABEL[userType]) ?? "Work from home"}
            </p>
            <div className="mt-3">
              <p className="text-4xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
                ~{fmtRound(wfhYtdEst)}
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                {wfhYtdHours} hr{wfhYtdHours !== 1 ? "s" : ""} logged
              </p>
            </div>
            <p className="mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
              {wfhFyLabel} · 67c/hr ATO fixed-rate
              {wfhMonthHours === 0 && (
                <> · <a href="/wfh" className="hover:underline" style={{ color: "var(--violet-from)" }}>log this month →</a></>
              )}
            </p>
          </div>
        )}
      </div>

      {/* 3. Grouped ledger */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--bg-elevated)" }}>
        {categoryGroups.map(({ cat, catTotal, items }, ci) => (
          <div key={cat} style={ci > 0 ? { borderTop: "1px solid var(--bg-elevated)" } : {}}>
            {/* Category header */}
            <div className="flex items-baseline justify-between px-4 py-2" style={{ backgroundColor: "var(--bg-elevated)" }}>
              <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{cat}</span>
              <span className="text-xs font-medium tabular-nums" style={{ color: "var(--text-muted)" }}>{fmt(catTotal)}</span>
            </div>
            {/* Items */}
            {items.map((item, ii) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
                style={{ borderTop: ii > 0 ? "1px solid rgba(31,41,55,0.5)" : undefined, backgroundColor: "var(--bg-card)" }}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm" style={{ color: "var(--text-secondary)" }}>{item.row.merchant}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{item.row.date}</p>
                </div>
                <span className="shrink-0 text-sm tabular-nums" style={{ color: "var(--text-secondary)" }}>
                  {fmt(item.row.amount)}
                </span>
              </div>
            ))}
          </div>
        ))}
        {/* Total row */}
        <div
          className="flex items-baseline justify-between px-4 py-3"
          style={{ borderTop: "1px solid var(--bg-elevated)", backgroundColor: "var(--bg-elevated)" }}
        >
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Total</span>
          <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>{fmt(total)}</span>
        </div>
      </div>

      {/* 4. Download */}
      <div className="space-y-3 pt-2">
        <ExportButton />
        <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
          The ATO recommends keeping receipts for your records.
        </p>
      </div>

      {/* Footer */}
      <p className="text-xs text-center" style={{ borderTop: "1px solid var(--bg-elevated)", paddingTop: "1.5rem", color: "var(--text-muted)", opacity: 0.6 }}>
        Kashio is not a tax adviser. Check with your accountant if you're unsure about any claim.
      </p>

    </main>
  );
}
