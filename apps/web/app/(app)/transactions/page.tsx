import { db } from "../../../lib/db";

export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<string, { label: string; classes: string }> = {
  DEMO_BANK: { label: "Demo Bank", classes: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" },
  BASIQ:     { label: "Bank",      classes: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" },
  CSV:       { label: "CSV",       classes: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400" },
};

function formatAmount(amount: number) {
  const abs = Math.abs(amount).toFixed(2);
  return amount < 0 ? `−$${abs}` : `+$${abs}`;
}

export default async function Transactions() {
  const transactions = await db.transaction.findMany({
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  return (
    <main className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      <div className="flex items-baseline gap-3">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Transactions</h1>
        <span className="text-sm text-gray-400 dark:text-gray-500">{transactions.length} shown</span>
      </div>
      <p className="mt-2 text-gray-500 dark:text-gray-400">
        All imported transactions. Deduction candidates are reviewed separately.
      </p>

      {transactions.length === 0 ? (
        <div className="mt-10 rounded-lg border border-gray-200 bg-gray-50 px-6 py-10 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No transactions yet</p>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
            Import transactions from the{" "}
            <a href="/import" className="underline hover:text-gray-600 dark:hover:text-gray-300">Import page</a>{" "}
            to see them here.
          </p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
          {transactions.map((t) => {
            const src = SOURCE_LABEL[t.source] ?? SOURCE_LABEL.CSV;
            return (
              <li key={t.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm text-gray-800 dark:text-gray-200">{t.description}</p>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${src.classes}`}>
                      {src.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{t.date}</p>
                </div>
                <p className={`shrink-0 text-sm font-medium tabular-nums ${
                  t.amount < 0
                    ? "text-gray-700 dark:text-gray-300"
                    : "text-green-700 dark:text-green-400"
                }`}>
                  {formatAmount(t.amount)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
