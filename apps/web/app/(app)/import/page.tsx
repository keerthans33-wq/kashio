import { Suspense } from "react";
import CsvUploader from "../../components/import/CsvUploader";
import ImportedBatches from "../../components/import/ImportedBatches";
import ConnectBankSection from "../../components/import/ConnectBankSection";
import { MobileScreen } from "@/components/layout/mobile-screen";
import { SectionHeader } from "@/components/ui/section-header";

export default function Import() {
  return (
    <MobileScreen maxWidth="md">

      {/* Page header */}
      <SectionHeader
        title="Import transactions"
        subtitle="Upload your bank's CSV — takes less than a minute."
        className="mb-8 text-center"
      />

      {/*
        CSV upload flow: file parsing → column detection → row validation → DB insert.
        To support a new bank format or swap the parser, see:
          lib/detectColumns.ts   — auto-mapping logic
          lib/validateCsv.ts     — per-row validation rules
          lib/importRules.ts     — shared parseDate / parseAmount
          app/components/import/CsvUploader.tsx → processFile()
      */}
      <CsvUploader />

      {/* Previously imported batches */}
      <ImportedBatches />

      {/* ── Connect your bank ─────────────────────────────────────────────── */}
      <div className="mt-10 pt-6" style={{ borderTop: "1px solid var(--bg-border)" }}>
        <p className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Connect your bank
        </p>
        {/* Suspense required: ConnectBankSection reads searchParams on the client */}
        <Suspense>
          <ConnectBankSection />
        </Suspense>
      </div>

    </MobileScreen>
  );
}
