import { db } from "../../../lib/db";
import { requireUserWithType } from "../../../lib/auth";
import { mapExportRow } from "../../../lib/export/mapExportRow";
import { ACTIVE_CATEGORIES, CATEGORIES_BY_USER_TYPE } from "../../../lib/rules/categories";
import { calcWfhSummary } from "../../../lib/wfhSummary";
import { ExportDetails } from "./ExportDetails";
import { ExportButton } from "./ExportButton";

export const dynamic = "force-dynamic";

const HEADING: Record<string, string> = {
  employee:    "Your tax summary",
  contractor:  "Your tax summary",
  sole_trader: "Your tax summary",
};

const SUBTITLE: Record<string, string> = {
  employee:    "Everything you've confirmed this financial year. Share with your accountant or use it to complete your return.",
  contractor:  "Everything you've confirmed this financial year. Use this to reconcile and lodge your return.",
  sole_trader: "Everything you've confirmed this financial year. Ready for your accountant or tax return.",
};

const TOTAL_LABEL: Record<string, string> = {
  employee:    "Total confirmed deductions",
  contractor:  "Total confirmed expenses",
  sole_trader: "Total confirmed deductions",
};

const SAVING_LABEL: Record<string, (saving: string) => string> = {
  employee:    (s) => `~${s} estimated tax saving at 32.5c marginal rate`,
  contractor:  (s) => `~${s} estimated saving — reduces your taxable income`,
  sole_trader: (s) => `~${s} estimated saving — reduces your taxable income`,
};

const WFH_LABEL: Record<string, string> = {
  employee:    "Work from home",
  contractor:  "Home office",
  sole_trader: "Home office",
};

const TRUST_NOTE: Record<string, string> = {
  employee:    "Only expenses directly related to your job qualify. Go through the list before lodging.",
  contractor:  "Only genuine business expenses are claimable — not personal costs. Review before lodging.",
  sole_trader: "Personal expenses mixed with business ones won't qualify. Check each item before lodging.",
};

const EMPTY_HEADING: Record<string, string> = {
  employee:    "Your tax summary is empty",
  contractor:  "Your tax summary is empty",
  sole_trader: "Your tax summary is empty",
};

const EMPTY_CTA: Record<string, string> = {
  employee:    "Review deductions",
  contractor:  "Review expenses",
  sole_trader: "Review deductions",
};

export default async function Export() {
  const { id: userId, userType } = await requireUserWithType();
  const allowedCategories = (userType && CATEGORIES_BY_USER_TYPE[userType]) ?? ACTIVE_CATEGORIES;

  const [confirmedRaw, pendingCount, wfhEntries] = await Promise.all([
    db.deductionCandidate.findMany({
      where:   { status: "CONFIRMED", userId },
      include: { transaction: true },
      orderBy: { transaction: { date: "asc" } },
    }),
    db.deductionCandidate.count({ where: { status: "NEEDS_REVIEW", userId } }),
    db.wfhLog.findMany({ where: { userId }, select: { date: true, hours: true } }),
  ]);

  const { monthHours: wfhMonthHours, monthEst: wfhMonthEst, ytdHours: wfhYtdHours, ytdEst: wfhYtdEst, fyLabel: wfhFyLabel } = calcWfhSummary(wfhEntries);

  const confirmed = confirmedRaw.filter((c) => allowedCategories.includes(c.category));

  const allItems = confirmed.map((c) => ({
    id:          c.id,
    row:         mapExportRow(c),
    hasEvidence: c.hasEvidence,
  }));

  const detailItems = allItems.map((c) => ({
    id:       c.id,
    date:     c.row.date,
    merchant: c.row.merchant,
    category: c.row.category,
    amount:   c.row.amount,
  }));

  const total          = allItems.reduce((sum, c) => sum + c.row.amount, 0);
  const estimatedSaving = Math.round(total * 0.325);

  // Category breakdown
  const catTotals = new Map<string, number>();
  for (const item of allItems) {
    catTotals.set(item.row.category, (catTotals.get(item.row.category) ?? 0) + item.row.amount);
  }
  const categoryRows = [...catTotals.entries()].sort((a, b) => b[1] - a[1]);

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtRound = (n: number) =>
    n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

  if (confirmed.length === 0) {
    return (
      <main className="mx-auto max-w-lg px-4 sm:px-6 py-12 text-center space-y-4">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {(userType && EMPTY_HEADING[userType]) ?? "Nothing to export yet"}
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
          {(userType && HEADING[userType]) ?? "Your deductions"}
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          {(userType && SUBTITLE[userType]) ?? "A summary of what you've confirmed."}
        </p>
      </div>

      {/* 2. Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Total deductions */}
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 px-5 py-6 flex flex-col justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
            {(userType && TOTAL_LABEL[userType]) ?? "Total confirmed deductions"}
          </p>
          <div className="mt-4">
            <p className="text-3xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
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

        {/* WFH */}
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 px-5 py-6 flex flex-col justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
            {(userType && WFH_LABEL[userType]) ?? "Work from home"}
          </p>
          {wfhYtdHours > 0 ? (
            <div className="mt-4">
              <p className="text-3xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
                ~{fmtRound(wfhYtdEst)}
              </p>
              <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                {wfhYtdHours} hr{wfhYtdHours !== 1 ? "s" : ""} logged
              </p>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-3xl font-bold tabular-nums text-gray-400 dark:text-gray-600">—</p>
              <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                <a href="/wfh" className="text-violet-500 dark:text-violet-400 hover:underline">Log hours →</a>
              </p>
            </div>
          )}
          <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
            {wfhFyLabel} · 67c/hr ATO fixed-rate
            {wfhYtdHours > 0 && wfhMonthHours === 0 && (
              <> · <a href="/wfh" className="text-violet-500 dark:text-violet-400 hover:underline">log this month →</a></>
            )}
          </p>
        </div>
      </div>

      {/* 3. Category breakdown */}
      {categoryRows.length > 0 && (
        <div>
          <h2 className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">
            By category
          </h2>
          <div className="space-y-2">
            {categoryRows.map(([cat, value]) => (
              <div key={cat} className="flex items-baseline justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">{cat}</span>
                <span className="tabular-nums text-gray-500 dark:text-gray-400">{fmt(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Item list + export action */}
      <div className="space-y-6">
        <ExportDetails items={detailItems} />

        <p className="text-xs text-gray-400 dark:text-gray-500">
          The ATO recommends keeping receipts for your records.
        </p>

        {pendingCount > 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {pendingCount} item{pendingCount !== 1 ? "s" : ""} still unreviewed —{" "}
            <a href="/review" className="text-violet-500 dark:text-violet-400 hover:underline">go back to Review</a>.
          </p>
        )}

        <ExportButton />
      </div>

      {/* 6. ATO note */}
      <div className="space-y-1 border-t border-gray-100 dark:border-gray-800 pt-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {(userType && TRUST_NOTE[userType]) ?? "Go through each item before lodging."}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Kashio is not a tax adviser. Check with your accountant if you're unsure about any claim.
        </p>
      </div>

    </main>
  );
}
