import { Suspense } from "react";
import CsvUploader from "../../components/import/CsvUploader";
import ImportedBatches from "../../components/import/ImportedBatches";
import ConnectBankSection from "../../components/import/ConnectBankSection";

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

      {/*
        TODO (1/3 — CSV Parser): CsvUploader below handles the full CSV
        flow: file parsing → column detection → row validation → DB insert.
        To support a new bank format or swap the parser, see:
          lib/detectColumns.ts   — auto-mapping logic
          lib/validateCsv.ts     — per-row validation rules
          lib/importRules.ts     — shared parseDate / parseAmount
          app/components/import/CsvUploader.tsx → processFile()
      */}
      <CsvUploader />

      {/* Previously imported batches with per-batch clear */}
      <ImportedBatches />

      {/* ── Alternative: Connect your bank ───────────────────────────────────
          Clearly secondary to CSV upload. ConnectBankSection handles both
          the demo bank flow AND real Basiq OAuth — it is production-ready.

          TODO (3/3 — Open Banking): ConnectBankSection is the integration
          point for the live bank connection. When you're ready to make it
          public: remove the opacity wrapper below and decide whether to keep
          the demo bank option or replace it with the real Basiq-only UI.
          See: app/components/import/ConnectBankSection.tsx
      ────────────────────────────────────────────────────────────────────── */}
      <div className="mt-10 pt-6" style={{ borderTop: "1px solid var(--bg-border)" }}>

        <p className="mb-4 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          Or connect your bank
        </p>

        {/*
          ConnectBankSection uses useSearchParams, so it must be wrapped in
          Suspense to avoid a Next.js static-rendering error.
        */}
        <div style={{ opacity: 0.7, pointerEvents: "none" }} aria-hidden="true">
          <Suspense fallback={null}>
            <ConnectBankSection />
          </Suspense>
        </div>

        <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
          Automatic import via Open Banking — coming soon.
        </p>
      </div>

    </main>
  );
}
