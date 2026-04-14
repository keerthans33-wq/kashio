import CsvUploader from "../../components/import/CsvUploader";
import ImportedBatches from "../../components/import/ImportedBatches";

export default function Import() {
  return (
    <main className="mx-auto max-w-[480px] px-5 py-10 sm:py-16" style={{ backgroundColor: "var(--bg-app)" }}>

      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-[26px] font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
          Import transactions
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
          Upload your bank&apos;s CSV — takes less than a minute.
        </p>
      </div>

      <CsvUploader />
      <ImportedBatches />

      {/* Connect your bank — clearly secondary */}
      <div className="mt-10 pt-6" style={{ borderTop: "1px solid var(--bg-border)" }}>
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Connect your bank
          </p>
          <span
            className="text-[10px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded"
            style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-muted)" }}
          >
            Soon
          </span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Automatic import via Open Banking — no CSV needed.
        </p>
      </div>

    </main>
  );
}
