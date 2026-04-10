import { Suspense } from "react";
import CsvUploader from "../../components/import/CsvUploader";
import ImportedBatches from "../../components/import/ImportedBatches";
import ConnectBankSection from "../../components/import/ConnectBankSection";
import { InfoTip } from "../../components/InfoTip";

export default function Import() {
  return (
    <main className="mx-auto max-w-lg px-4 sm:px-6 py-12">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Import your transactions</h1>
        <InfoTip text="Connecting your bank uses open banking — Kashio gets read-only access to your transactions and can never move money. Uploading a CSV works too: just export your transaction history from your bank's app and upload the file here." />
      </div>
      <p className="mt-2 text-gray-500 dark:text-gray-400">
        Connect your bank or upload a CSV — Kashio will scan for possible deductions.
      </p>

      <div className="mt-8">
        <Suspense>
          <ConnectBankSection />
        </Suspense>
      </div>

      <div className="my-8 flex items-center gap-4">
        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        <span className="text-xs text-gray-400 dark:text-gray-500">or</span>
        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
      </div>

      <CsvUploader />
      <ImportedBatches />

      <p className="mt-10 text-xs text-gray-400 dark:text-gray-500">
        Your data is only used to find possible deductions — it's never shared or sold.
      </p>
    </main>
  );
}
