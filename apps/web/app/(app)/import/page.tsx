import { Suspense } from "react";
import CsvUploader from "../../components/import/CsvUploader";
import ImportedBatches from "../../components/import/ImportedBatches";
import ConnectBankSection from "../../components/import/ConnectBankSection";
import { MobileScreen } from "@/components/layout/mobile-screen";
import { SectionHeader } from "@/components/ui/section-header";
import { requireUserWithType } from "@/lib/auth";
import { fetchUserPlan, isProUser } from "@/lib/plan";

export const dynamic = "force-dynamic";

export default async function Import() {
  const { id: userId } = await requireUserWithType();
  const plan   = await fetchUserPlan(userId);
  const isPro  = isProUser(plan);

  return (
    <MobileScreen maxWidth="md">

      <SectionHeader
        title="Add your transactions"
        subtitle="Connect your bank or upload a CSV file."
        className="mb-8 text-center"
      />

      {/*
        Bank connection — primary path.
        isPro is fetched server-side so the paywall renders without a client round-trip.
        Suspense is required: ConnectBankSection reads useSearchParams on the client.
      */}
      <Suspense>
        <ConnectBankSection isPro={isPro} />
      </Suspense>

      {/*
        CSV upload — secondary path.
        Always accessible regardless of plan.
        To support a new bank format or swap the parser, see:
          lib/detectColumns.ts   — auto-mapping logic
          lib/validateCsv.ts     — per-row validation rules
          lib/importRules.ts     — shared parseDate / parseAmount
          app/components/import/CsvUploader.tsx → processFile()
      */}
      <div className="mt-10 pt-6" style={{ borderTop: "1px solid var(--bg-border)" }}>
        <p
          className="mb-4 text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-muted)" }}
        >
          Upload CSV instead
        </p>
        <CsvUploader />
      </div>

      {/* Previously imported batches */}
      <ImportedBatches />

    </MobileScreen>
  );
}
