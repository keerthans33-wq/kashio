import { Suspense } from "react";
import CsvUploader from "../../components/import/CsvUploader";
import ImportedBatches from "../../components/import/ImportedBatches";
import ConnectBankSection from "../../components/import/ConnectBankSection";

export default function Import() {
  return (
    <main
      className="mx-auto max-w-[400px] px-5 py-10 sm:py-14"
      style={{ backgroundColor: "var(--bg-app)" }}
    >
      <h1 className="text-[28px] font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
        Import transactions
      </h1>
      <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
        Add your transactions to find possible tax deductions.
      </p>

      <div className="mt-8">
        <Suspense>
          <ConnectBankSection />
        </Suspense>
      </div>

      <div className="mt-4">
        <CsvUploader />
      </div>

      <ImportedBatches />

      <p className="mt-10 text-xs" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
        Your data is only used to find possible deductions. It&apos;s never shared or sold.
      </p>
    </main>
  );
}
