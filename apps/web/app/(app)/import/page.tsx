import { Suspense } from "react";
import CsvUploader from "../../components/import/CsvUploader";
import { TesterHint } from "../../components/import/TesterHint";
import ImportedBatches from "../../components/import/ImportedBatches";
import ConnectBankSection from "../../components/import/ConnectBankSection";

export default function Import() {
  return (
    <main className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      <div className="flex items-baseline gap-3">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Import</h1>
        <span className="text-sm text-gray-400 dark:text-gray-500">Step 1 of 3</span>
      </div>
      <p className="mt-2 text-gray-500 dark:text-gray-400">
        Bring in your transactions so Kashio can find your tax deductions. Once imported, everything is reviewed in one place.
      </p>

      {/* Option A: Demo Bank */}
      <div className="mt-6">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Demo Bank</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Loads a realistic set of sample transactions so you can try the full deduction review flow without uploading anything.
        </p>
        <div className="mt-3">
          <Suspense>
            <ConnectBankSection />
          </Suspense>
        </div>
      </div>

      {/* Divider */}
      <div className="my-8 flex items-center gap-4">
        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">or</span>
        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
      </div>

      {/* Option B: CSV */}
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">CSV file</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Export a transaction history from your bank's website and upload it here. Kashio accepts any CSV with the three columns below.
        </p>
        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Required columns</p>
          <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <li><span className="font-mono font-medium text-gray-800 dark:text-gray-200">date</span> — DD/MM/YYYY or YYYY-MM-DD</li>
            <li><span className="font-mono font-medium text-gray-800 dark:text-gray-200">description</span> — the transaction description from your bank</li>
            <li><span className="font-mono font-medium text-gray-800 dark:text-gray-200">amount</span> — e.g. <span className="font-mono">-42.50</span> for a debit, <span className="font-mono">120.00</span> for a credit</li>
          </ul>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            Column names don't have to match exactly — Kashio will ask you to map them if needed.
          </p>
        </div>
      </div>
      <TesterHint />
      <CsvUploader />
      <ImportedBatches />
    </main>
  );
}
