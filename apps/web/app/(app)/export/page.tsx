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

  const total          = allItems.reduce((sum, c) => sum + c.row.amount, 0);
  const estimatedSaving = Math.round(total * 0.325);

  // Group by category, sorted by total value desc
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
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Your tax summary is empty
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {userType === "contractor"
            ? "Confirm your business expenses in Review and they'll appear in your summary."
            : "Confirm some deductions in Review and they'll appear in your summary."}
        </p>
        <a
          href="/review"
          className="inline-block rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
        >
          {(userType && EMPTY_CTA[userType]) ?? "Review deductions"}
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 sm:px-6 py-12 space-y-10">

      {/* 1. Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Your tax summary
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          {(userType && SUBTITLE[userType]) ?? "Everything you've confirmed this financial year."}
        </p>
      </div>

      {/* 2. Summary cards */}
      <div className={wfhYtdHours > 0 ? "grid grid-cols-2 gap-4" : ""}>
        {/* Total deductions */}
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 px-5 py-6 flex flex-col justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
            {(userType && TOTAL_LABEL[userType]) ?? "Total deductions"}
          </p>
          <div className="mt-3">
            <p className="text-4xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
              {fmt(total)}
            </p>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
              {confirmed.length} item{confirmed.length !== 1 ? "s" : ""}
            </p>
          </div>
          <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
            {userType && SAVING_LABEL[userType]
              ? SAVING_LABEL[userType](fmtRound(estimatedSaving))
              : `~${fmtRound(estimatedSaving)} estimated saving at 32.5c`}
          </p>
        </div>

        {/* WFH — only shown when hours exist */}
        {wfhYtdHours > 0 && (
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 px-5 py-6 flex flex-col justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {(userType && WFH_LABEL[userType]) ?? "Work from home"}
            </p>
            <div className="mt-3">
              <p className="text-4xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
                ~{fmtRound(wfhYtdEst)}
              </p>
              <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                {wfhYtdHours} hr{wfhYtdHours !== 1 ? "s" : ""} logged
              </p>
            </div>
            <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
              {wfhFyLabel} · 67c/hr ATO fixed-rate
              {wfhMonthHours === 0 && (
                <> · <a href="/wfh" className="text-violet-500 dark:text-violet-400 hover:underline">log this month →</a></>
              )}
            </p>
          </div>
        )}
      </div>

      {/* 3. Grouped tax summary */}
      <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {categoryGroups.map(({ cat, catTotal, items }, ci) => (
          <div key={cat} className={ci > 0 ? "border-t border-gray-100 dark:border-gray-800" : ""}>
            {/* Category header */}
            <div className="flex items-baseline justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800/60">
              <span className="text-xs font-medium text-gray-400 dark:text-gray-500">{cat}</span>
              <span className="text-xs font-medium tabular-nums text-gray-400 dark:text-gray-500">{fmt(catTotal)}</span>
            </div>
            {/* Items */}
            <div className="divide-y divide-gray-50 dark:divide-gray-800/40">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-gray-500 dark:text-gray-400">{item.row.merchant}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-600">{item.row.date}</p>
                  </div>
                  <span className="shrink-0 text-sm tabular-nums text-gray-400 dark:text-gray-500">
                    {fmt(item.row.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {/* Total row */}
        <div className="border-t border-gray-200 dark:border-gray-700 flex items-baseline justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/60">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total</span>
          <span className="text-sm font-semibold tabular-nums text-gray-700 dark:text-gray-300">{fmt(total)}</span>
        </div>
      </div>

      {/* 4. Download */}
      <div className="space-y-3 pt-2">
        <ExportButton />
        <p className="text-xs text-center text-gray-400 dark:text-gray-500">
          The ATO recommends keeping receipts for your records.
        </p>
      </div>

      {/* Footer */}
      <p className="text-xs text-center text-gray-300 dark:text-gray-600 border-t border-gray-100 dark:border-gray-800 pt-6">
        Kashio is not a tax adviser. Check with your accountant if you're unsure about any claim.
      </p>

    </main>
  );
}
