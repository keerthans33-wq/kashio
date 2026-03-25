import { db } from "../../../lib/db";
import { mapExportRow } from "../../../lib/export/mapExportRow";

export const dynamic = "force-dynamic";

export default async function Export() {
  const confirmed = await db.deductionCandidate.findMany({
    where:   { status: "CONFIRMED" },
    include: { transaction: true },
    orderBy: { transaction: { date: "asc" } },
  });

  const rows  = confirmed.map(mapExportRow);
  const total = rows.reduce((sum, r) => sum + r.amount, 0);

  const categoryTotals = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] ?? 0) + r.amount;
    return acc;
  }, {});
  const categoryEntries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">Export</h1>
      <p className="mt-1 text-gray-500">
        These are the deductions you confirmed during review. The CSV download contains the same items — nothing unreviewed is included.
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
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-green-600">Confirmed deductions</p>
              <p className="mt-1 text-2xl font-semibold text-green-700">{confirmed.length}</p>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-green-600">Total amount</p>
              <p className="mt-1 text-2xl font-semibold text-green-700">${total.toFixed(2)}</p>
            </div>
          </div>

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

          {/* Deductions table */}
          <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {["Date", "Merchant", "Description", "Category", "Amount"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {rows.map((r, i) => (
                  <tr key={confirmed[i].id}>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">{r.date}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">{r.merchant}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{r.description}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">{r.category}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">${r.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Download */}
          <div className="mt-6">
            <a
              href="/api/export"
              className="inline-block rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
            >
              Download CSV
            </a>
            <p className="mt-2 text-xs text-gray-400">
              {confirmed.length} confirmed deduction{confirmed.length !== 1 ? "s" : ""} · CSV format
            </p>
          </div>
        </>
      )}
    </main>
  );
}
