import { db } from "../../../lib/db";

export const dynamic = "force-dynamic";

const CONFIDENCE_STYLES = {
  HIGH:   "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  LOW:    "bg-gray-100 text-gray-600",
};

export default async function Review() {
  const candidates = await db.deductionCandidate.findMany({
    include: { transaction: true },
    orderBy: { transaction: { date: "desc" } },
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">Review</h1>
      <p className="mt-1 text-gray-500">
        {candidates.length} deduction candidate{candidates.length !== 1 ? "s" : ""} found
      </p>

      {candidates.length === 0 ? (
        <p className="mt-10 text-center text-gray-400">
          No candidates yet. Import a CSV to detect deductions.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Merchant</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Category</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Confidence</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {candidates.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {c.transaction.normalizedMerchant}
                  </td>
                  <td className={`whitespace-nowrap px-4 py-3 text-right font-medium ${
                    c.transaction.amount < 0 ? "text-red-600" : "text-green-600"
                  }`}>
                    {c.transaction.amount < 0 ? "-" : "+"}${Math.abs(c.transaction.amount).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{c.category}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CONFIDENCE_STYLES[c.confidence]}`}>
                      {c.confidence}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{c.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
