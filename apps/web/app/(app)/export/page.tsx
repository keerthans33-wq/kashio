import { db } from "../../../lib/db";
import { mapExportRow } from "../../../lib/export/mapExportRow";

export const dynamic = "force-dynamic";

const COLS = ["Date", "Merchant", "Description", "Category", "Amount"];

function DeductionsTable({ items }: { items: { id: string; row: ReturnType<typeof mapExportRow>; note: string | null }[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-100 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {COLS.map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {items.map(({ id, row, note }) => (
            <tr key={id}>
              <td className="whitespace-nowrap px-4 py-3 text-gray-500">{row.date}</td>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">{row.merchant}</td>
              <td className="px-4 py-3 text-gray-500 max-w-xs">
                <p className="truncate">{row.description}</p>
                {note && <p className="mt-0.5 text-xs text-gray-400">{note}</p>}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-500">{row.category}</td>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">${row.amount.toFixed(2)}</td>
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

  const categoryTotals = allItems.reduce<Record<string, number>>((acc, c) => {
    acc[c.row.category] = (acc[c.row.category] ?? 0) + c.row.amount;
    return acc;
  }, {});
  const categoryEntries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">Export</h1>
      <p className="mt-1 text-gray-500">
        Confirmed deductions are listed here, but confirming alone is not enough — each one should have a receipt or invoice to back it up. Use the readiness status to see what still needs attention before you export.
      </p>

      {confirmed.length === 0 ? (
        <p className="mt-10 text-center text-gray-400">
          No confirmed deductions yet.{" "}
          <a href="/review" className="underline hover:text-gray-600">Go to Review</a>{" "}
          to confirm candidates.
        </p>
      ) : (
        <>
          {/* Summary */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Confirmed</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{confirmed.length}</p>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Evidence ready</p>
              <p className="mt-1 text-2xl font-semibold text-blue-700">{ready.length}</p>
            </div>
            <div className={`rounded-lg border px-4 py-3 ${missing.length > 0 ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-white"}`}>
              <p className={`text-xs font-medium uppercase tracking-wide ${missing.length > 0 ? "text-amber-600" : "text-gray-400"}`}>Missing evidence</p>
              <p className={`mt-1 text-2xl font-semibold ${missing.length > 0 ? "text-amber-700" : "text-gray-900"}`}>{missing.length}</p>
            </div>
          </div>

          {/* Next-step message */}
          <p className="mt-3 text-sm">
            {missing.length === 0 ? (
              <span className="text-green-700">All confirmed deductions have evidence — your export is ready.</span>
            ) : (
              <span className="text-amber-700">
                {missing.length} deduction{missing.length !== 1 ? "s" : ""} still {missing.length !== 1 ? "need" : "needs"} evidence.{" "}
                Add a receipt or invoice in <a href="/review" className="underline hover:text-amber-900">Review</a> before relying on this export.
              </span>
            )}
          </p>

          {/* Category totals */}
          <div className="mt-6">
            <h2 className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-2">By category</h2>
            <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
              {categoryEntries.map(([category, amount]) => (
                <div key={category} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-700">{category}</span>
                  <span className="text-sm font-medium text-gray-900">${amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ready for export */}
          {ready.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-medium text-gray-900 mb-2">
                Ready for export
                <span className="ml-2 text-xs font-normal text-blue-600">{ready.length} item{ready.length !== 1 ? "s" : ""} with evidence</span>
              </h2>
              <DeductionsTable items={ready} />
            </div>
          )}

          {/* Missing evidence */}
          {missing.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-medium text-gray-900 mb-2">
                Needs evidence
                <span className="ml-2 text-xs font-normal text-amber-600">{missing.length} item{missing.length !== 1 ? "s" : ""} — go to <a href="/review" className="underline">Review</a> to add</span>
              </h2>
              <DeductionsTable items={missing} />
            </div>
          )}

          {/* Download */}
          <div className="mt-8">
            <a
              href="/api/export"
              className="inline-block rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
            >
              Download CSV
            </a>
            <p className="mt-2 text-xs text-gray-400">
              {confirmed.length} confirmed deduction{confirmed.length !== 1 ? "s" : ""} · includes all confirmed items, ready or not · CSV format
            </p>
          </div>
        </>
      )}
    </main>
  );
}
