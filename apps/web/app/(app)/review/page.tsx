import { db } from "../../../lib/db";

export const dynamic = "force-dynamic";

export default async function Review() {
  const transactions = await db.transaction.findMany({
    orderBy: { date: "desc" },
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">Transactions</h1>
      <p className="mt-1 text-gray-500">{transactions.length} transactions saved</p>

      {transactions.length === 0 ? (
        <p className="mt-10 text-center text-gray-400">
          No transactions yet. Import a CSV to get started.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Description</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Merchant</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">{t.date}</td>
                  <td className="px-4 py-3 text-gray-900">{t.description}</td>
                  <td className="px-4 py-3 text-gray-600">{t.normalizedMerchant}</td>
                  <td
                    className={`whitespace-nowrap px-4 py-3 text-right font-medium ${
                      t.amount < 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {t.amount < 0 ? "-" : "+"}${Math.abs(t.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
