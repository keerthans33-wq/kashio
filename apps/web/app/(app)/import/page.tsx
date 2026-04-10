import { Suspense } from "react";
import CsvUploader from "../../components/import/CsvUploader";
import ImportedBatches from "../../components/import/ImportedBatches";
import ConnectBankSection from "../../components/import/ConnectBankSection";

export default function Import() {
  return (
    <main className="mx-auto max-w-lg px-4 sm:px-6 py-12">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Import your transactions</h1>
      <p className="mt-2 text-gray-500 dark:text-gray-400">
        Connect your bank or upload a CSV — Kashio will scan for possible deductions.
      </p>

      {/* Option A: Demo Bank */}
      <div className="mt-8">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Connect your bank</p>
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
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Upload a CSV</p>
      </div>
      <CsvUploader />
      <ImportedBatches />
    </main>
  );
}
