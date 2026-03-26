import CsvUploader from "../../components/import/CsvUploader";

export default function Import() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-baseline gap-3">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Import</h1>
        <span className="text-sm text-gray-400 dark:text-gray-500">Step 1 of 3</span>
      </div>
      <p className="mt-2 text-gray-500 dark:text-gray-400">
        Upload a CSV exported from your bank. Kashio will scan it for transactions that look work-related, then add them to Review for you to confirm or reject.
      </p>

      <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">CSV format</p>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Your file needs three columns — the names must match exactly:
        </p>
        <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li><span className="font-mono font-medium text-gray-800 dark:text-gray-200">date</span> — DD/MM/YYYY or YYYY-MM-DD</li>
          <li><span className="font-mono font-medium text-gray-800 dark:text-gray-200">description</span> — the transaction description from your bank</li>
          <li><span className="font-mono font-medium text-gray-800 dark:text-gray-200">amount</span> — e.g. <span className="font-mono">-42.50</span> for a debit, <span className="font-mono">120.00</span> for a credit</li>
        </ul>
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
          If your column names are different, Kashio will ask you to map them after you preview the file.
        </p>
      </div>
      <CsvUploader />
    </main>
  );
}
