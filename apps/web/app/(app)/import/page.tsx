import { Suspense } from "react";
import CsvUploader from "../../components/import/CsvUploader";
import ImportedBatches from "../../components/import/ImportedBatches";
import ConnectBankSection from "../../components/import/ConnectBankSection";
import { MobileScreen } from "@/components/layout/mobile-screen";
import { SectionHeader } from "@/components/ui/section-header";
import { GlassCard } from "@/components/ui/glass-card";

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

      {/* ── Alternative: Connect your bank ───────────────────────────────
          TODO (3/3 — Open Banking): Remove the opacity wrapper below when
          the live Basiq integration is ready.
      ──────────────────────────────────────────────────────────────────── */}
      <div className="mt-10 pt-6" style={{ borderTop: "1px solid var(--bg-border)" }}>

        <p className="mb-4 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          Or connect your bank
        </p>

        <div style={{ opacity: 0.5, pointerEvents: "none" }} aria-hidden="true">
          <Suspense fallback={null}>
            <ConnectBankSection />
          </Suspense>
        </div>

        <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
          Automatic import via Open Banking — coming soon.
        </p>
      </div>

    </MobileScreen>
  );
}
