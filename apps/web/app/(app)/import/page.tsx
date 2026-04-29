import { Suspense } from "react";
import CsvUploader from "../../components/import/CsvUploader";
import ImportedBatches from "../../components/import/ImportedBatches";
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

      {/* ── Alternative: Connect your bank (coming soon) ─────────────────
          TODO: Replace this card with <ConnectBankSection /> when the
          live Basiq Open Banking integration is ready.
      ──────────────────────────────────────────────────────────────────── */}
      <div className="mt-10 pt-6" style={{ borderTop: "1px solid var(--bg-border)" }}>
        <div
          className="flex items-center justify-between rounded-2xl px-4 py-4"
          style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-border)" }}
        >
          <div className="flex items-center gap-3">
            {/* Bank icon */}
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid var(--bg-border)" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} style={{ color: "var(--text-muted)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l9-3 9 3M3 6v14a1 1 0 001 1h16a1 1 0 001-1V6M3 6h18M9 10h.01M15 10h.01M9 14h.01M15 14h.01" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Connect your bank
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Automatic import via Open Banking
              </p>
            </div>
          </div>
          {/* Coming soon badge */}
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ backgroundColor: "rgba(34,197,94,0.10)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.20)" }}
          >
            Coming soon
          </span>
        </div>
      </div>

    </MobileScreen>
  );
}
