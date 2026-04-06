import { db } from "../../../lib/db";
import { mapExportRow } from "../../../lib/export/mapExportRow";

export const dynamic = "force-dynamic";

export default async function Export() {
  const confirmed = await db.deductionCandidate.findMany({
    where:   { status: "CONFIRMED" },
    include: { transaction: true },
    orderBy: { transaction: { date: "asc" } },
  });

  const allItems = confirmed.map((c) => ({
    id:          c.id,
    row:         mapExportRow(c),
    hasEvidence: c.hasEvidence,
  }));

  const missing = allItems.filter((c) => !c.hasEvidence);
  const total   = allItems.reduce((sum, c) => sum + c.row.amount, 0);

  const categoryTotals = allItems.reduce<Record<string, number>>((acc, c) => {
    acc[c.row.category] = (acc[c.row.category] ?? 0) + c.row.amount;
    return acc;
  }, {});
  const categoryEntries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Export</h1>
      <p className="mt-1 text-gray-500 dark:text-gray-400">
        Download your confirmed deductions as a spreadsheet for tax time.
      </p>

      {confirmed.length === 0 ? (
        <div className="mt-10 text-center space-y-1">
          <p className="text-gray-500 dark:text-gray-400">Nothing to export yet.</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            <a href="/review" className="underline hover:text-gray-600 dark:hover:text-gray-300">Go to Review</a> and confirm the deductions you want to include.
          </p>
        </div>
      ) : (
        <>
          {/* Total */}
          <div className="mt-10 py-8 border-y border-gray-100 dark:border-gray-800 text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-gray-400 dark:text-gray-500">
              Total deductions
            </p>
            <p className="mt-2 text-6xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
              {fmt(total)}
            </p>
            <div className="mt-3 flex justify-center gap-6 text-sm text-gray-400 dark:text-gray-500">
              <span>{confirmed.length} confirmed</span>
              {missing.length > 0
                ? <span className="text-amber-500 dark:text-amber-400">{missing.length} without receipt</span>
                : <span className="text-green-600 dark:text-green-400">all receipts attached</span>
              }
            </div>
          </div>

          {/* Category breakdown */}
          <div className="mt-8 divide-y divide-gray-100 dark:divide-gray-800">
            {categoryEntries.map(([category, amount]) => (
              <div key={category} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-gray-600 dark:text-gray-400">{category}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{fmt(amount)}</span>
              </div>
            ))}
          </div>

          {/* Export button */}
          <div className="mt-8">
            <a
              href="/api/export"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-6 py-3.5 text-base font-semibold text-white hover:bg-violet-700 active:bg-violet-800"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download spreadsheet (.xlsx)
            </a>
            <p className="mt-3 text-center text-xs text-gray-400 dark:text-gray-500">
              This is the amount you may be able to claim — not your refund.
            </p>
            <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
              <span className="font-medium">ATO note:</span> Receipts or other records may be needed to support some claims. Exporting from Kashio does not replace your record-keeping obligations.
            </p>
          </div>
        </>
      )}
    </main>
  );
}
