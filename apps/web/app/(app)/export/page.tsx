import { db } from "../../../lib/db";
import { mapExportRow } from "../../../lib/export/mapExportRow";

export const dynamic = "force-dynamic";

const COLS = ["Date", "Merchant", "Description", "Category", "Amount"];

function DeductionsTable({ items }: { items: { id: string; row: ReturnType<typeof mapExportRow>; note: string | null }[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            {COLS.map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-700 dark:bg-gray-900">
          {items.map(({ id, row, note }) => (
            <tr key={id}>
              <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400">{row.date}</td>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{row.merchant}</td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-xs">
                <p className="truncate">{row.description}</p>
                {note && <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{note}</p>}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400">{row.category}</td>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900 dark:text-gray-100">${row.amount.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function Export() {
  const confirmed = await db.deductionCandidate.findMany({
    where:   { status: "CONFIRMED" },
    include: { transaction: true },
    orderBy: { transaction: { date: "asc" } },
  });

  const allItems = confirmed.map((c) => ({
    id:   c.id,
    row:  mapExportRow(c),
    note: c.evidenceNote,
    hasEvidence: c.hasEvidence,
  }));

  const ready   = allItems.filter((c) => c.hasEvidence);
  const missing = allItems.filter((c) => !c.hasEvidence);
  const total   = allItems.reduce((sum, c) => sum + c.row.amount, 0);
  const readyTotal = ready.reduce((sum, c) => sum + c.row.amount, 0);

  const missingValue = missing.reduce((sum, c) => sum + c.row.amount, 0);

  const categoryTotals = allItems.reduce<Record<string, number>>((acc, c) => {
    acc[c.row.category] = (acc[c.row.category] ?? 0) + c.row.amount;
    return acc;
  }, {});
  const categoryEntries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Export</h1>
      <p className="mt-2 text-gray-500 dark:text-gray-400">
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
          {/* ── Summary ─────────────────────────────────────────────── */}
          <div className="mt-6 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 overflow-hidden">

            {/* Hero — total confirmed value */}
            <div className="px-5 py-5 border-b border-gray-100 dark:border-gray-700">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Total confirmed deductions
              </p>
              <p className="mt-1 text-4xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
                {total.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 })}
              </p>
              <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                {confirmed.length} item{confirmed.length !== 1 ? "s" : ""} confirmed · amount you may be able to claim, not your refund
              </p>
            </div>

            {/* Ready / Missing stats */}
            <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-700">
              <div className="px-5 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-green-600 dark:text-green-400">Ready to export</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-green-700 dark:text-green-400">{ready.length}</p>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                  {readyTotal > 0
                    ? readyTotal.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 })
                    : "—"}
                </p>
              </div>
              <div className="px-5 py-4">
                <p className={`text-xs font-medium uppercase tracking-wide ${missing.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-400 dark:text-gray-500"}`}>
                  Missing evidence
                </p>
                <p className={`mt-1 text-2xl font-semibold tabular-nums ${missing.length > 0 ? "text-amber-700 dark:text-amber-400" : "text-gray-400 dark:text-gray-500"}`}>
                  {missing.length > 0
                    ? missingValue.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 })
                    : "—"}
                </p>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                  {missing.length > 0
                    ? `${missing.length} item${missing.length !== 1 ? "s" : ""} need a receipt or invoice`
                    : "all evidence attached"}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            {(() => {
              const pct = confirmed.length > 0 ? Math.round((ready.length / confirmed.length) * 100) : 0;
              return (
                <div className="px-5 pb-4">
                  <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-700">
                    <div
                      className={`h-1.5 rounded-full transition-all ${pct === 100 ? "bg-green-500" : "bg-green-400"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                    {pct === 100 ? "All items have evidence — ready to export." : `${ready.length} of ${confirmed.length} items have evidence`}
                  </p>
                </div>
              );
            })()}
          </div>

          {/* Next-step guidance */}
          {missing.length > 0 && (
            <div className="mt-3 flex items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                {missing.length} item{missing.length !== 1 ? "s" : ""} still need{missing.length === 1 ? "s" : ""} a receipt or invoice before they can be exported.
              </p>
              <a href="/review" className="shrink-0 text-sm font-medium text-amber-700 underline hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200">
                Add evidence →
              </a>
            </div>
          )}

          {/* Category totals */}
          <div className="mt-6">
            <h2 className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">By category</h2>
            <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 dark:border-gray-700 dark:divide-gray-700">
              {categoryEntries.map(([category, amount]) => (
                <div key={category} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{category}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">${amount.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Needs evidence — shown first so incomplete items are addressed before downloading */}
          {missing.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Needs evidence
                <span className="ml-2 text-xs font-normal text-amber-600 dark:text-amber-400">{missing.length} item{missing.length !== 1 ? "s" : ""} incomplete</span>
              </h2>
              <DeductionsTable items={missing} />
              <a
                href="/review"
                className="mt-3 inline-block rounded-md border border-amber-300 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20"
              >
                Go to Review to add evidence →
              </a>
            </div>
          )}

          {/* Ready for export */}
          {ready.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Evidence ready
                <span className="ml-2 text-xs font-normal text-blue-600 dark:text-blue-400">{ready.length} item{ready.length !== 1 ? "s" : ""} · ${readyTotal.toFixed(2)}</span>
              </h2>
              <DeductionsTable items={ready} />
            </div>
          )}

          {/* Download */}
          <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">Download</p>
            <div className="flex flex-wrap gap-3">
              <a
                href="/api/export"
                className={`inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold text-white transition-colors ${
                  missing.length === 0
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-gray-800 hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-100"
                }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M9 3v18M15 3v18" />
                </svg>
                Download Excel (.xlsx)
              </a>
            </div>
            <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
              Includes all {confirmed.length} confirmed deduction{confirmed.length !== 1 ? "s" : ""}.
              Rows missing evidence are highlighted in amber.
            </p>
          </div>
        </>
      )}
    </main>
  );
}
