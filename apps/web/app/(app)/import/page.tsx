import { Suspense } from "react";
import CsvUploader from "../../components/import/CsvUploader";
import ImportedBatches from "../../components/import/ImportedBatches";
import ConnectBankSection from "../../components/import/ConnectBankSection";

export default function Import() {
  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Import transactions</h1>
      <p className="mt-2 text-gray-500 dark:text-gray-400">
        Add your bank transactions and Kashio will find your possible deductions.
      </p>

      {/* How it works */}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:gap-6">
        {[
          { step: "1", text: "We analyse your transactions" },
          { step: "2", text: "We highlight possible deductions" },
          { step: "3", text: "You review and confirm" },
        ].map(({ step, text }) => (
          <div key={step} className="flex items-center gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
              {step}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">{text}</span>
          </div>
        ))}
      </div>

      {/* Option A: Demo Bank */}
      <div className="mt-8">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Try with sample data</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Load sample transactions to see how Kashio works — no bank login needed.
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
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Upload a CSV from your bank</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Download your transaction history from your bank and upload it here.
        </p>
      </div>
      <CsvUploader />
      <ImportedBatches />
    </main>
  );
}
