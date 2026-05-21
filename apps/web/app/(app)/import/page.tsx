import CsvUploader from "../../components/import/CsvUploader";
import ImportedBatches from "../../components/import/ImportedBatches";
import { MobileScreen } from "@/components/layout/mobile-screen";
import { SectionHeader } from "@/components/ui/section-header";
import { requireUserWithType } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Import() {
  await requireUserWithType();

  return (
    <MobileScreen maxWidth="md">

      <SectionHeader
        title="Add your transactions"
        subtitle="Upload a CSV export from your bank."
        className="mb-8 text-center"
      />

      <CsvUploader />

      {/* Open Banking teaser */}
      <div
        className="mt-6 flex items-center gap-3 rounded-2xl px-4 py-3.5"
        style={{
          backgroundColor: "rgba(255,255,255,0.03)",
          border:          "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: "rgba(34,197,94,0.08)" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true"
            style={{ color: "#22C55E" }}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3 6l9-3 9 3v2a9 9 0 01-9 9 9 9 0 01-9-9V6z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Open Banking
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Direct bank connection — coming soon
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{
            backgroundColor: "rgba(34,197,94,0.10)",
            border:          "1px solid rgba(34,197,94,0.20)",
            color:           "#22C55E",
          }}
        >
          Soon
        </span>
      </div>

      <ImportedBatches />

    </MobileScreen>
  );
}
