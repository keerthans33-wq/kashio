import { db } from "../../../lib/db";

export const dynamic = "force-dynamic";

export default async function Export() {
  const confirmed = await db.deductionCandidate.findMany({
    where:   { status: "CONFIRMED" },
    include: { transaction: true },
    orderBy: { transaction: { date: "asc" } },
  });

  const total = confirmed.reduce((sum, c) => sum + Math.abs(c.transaction.amount), 0);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">Export</h1>
      <p className="mt-1 text-gray-500">
        Download your confirmed deductions as a CSV for EOFY.
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
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Confirmed deductions</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{confirmed.length}</p>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-green-600">Total amount</p>
              <p className="mt-1 text-2xl font-semibold text-green-700">${total.toFixed(2)}</p>
            </div>
          </div>

          {/* Preview table */}
          <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {["Date", "Merchant", "Amount", "Category"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {confirmed.map((c) => (
                  <tr key={c.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">{c.transaction.date}</td>
                    <td className="px-4 py-3 text-gray-900">{c.transaction.normalizedMerchant}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">${Math.abs(c.transaction.amount).toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-500">{c.category}</td>
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
              Includes {confirmed.length} confirmed deduction{confirmed.length !== 1 ? "s" : ""} · CSV format
            </p>
          </div>
        </>
      )}
    </main>
  );
}
