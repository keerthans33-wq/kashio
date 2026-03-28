import { db } from "../../../../lib/db";
import { mapExportRow } from "../../../../lib/export/mapExportRow";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

export default async function ExportReport() {
  const candidates = await db.deductionCandidate.findMany({
    where:   { status: "CONFIRMED" },
    include: { transaction: true },
    orderBy: { transaction: { date: "asc" } },
  });

  const now       = new Date();
  const year      = now.getFullYear();
  const generated = now.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });

  const rows = candidates.map((c) => ({
    ...mapExportRow(c),
    hasEvidence: c.hasEvidence,
    note:        c.evidenceNote,
  }));

  const total        = rows.reduce((s, r) => s + r.amount, 0);
  const withEvidence = rows.filter((r) => r.hasEvidence).length;
  const missing      = rows.length - withEvidence;

  const categoryTotals = Object.entries(
    rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.category] = (acc[r.category] ?? 0) + r.amount;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  return (
    <>
      {/* Print styles injected into <head> via a style tag */}
      <style>{`
        @media print {
          @page { size: A4; margin: 18mm 14mm; }
          body   { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="min-h-screen bg-white text-gray-900 font-sans">

        {/* ── Toolbar (hidden when printing) ───────────────────────── */}
        <div className="print:hidden sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-6 py-3">
          <div className="flex items-center gap-3">
            <a href="/export" className="text-sm text-gray-500 hover:text-gray-700 underline">
              ← Back to Export
            </a>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-400">Tax Deduction Report {year}</span>
          </div>
          <PrintButton />
        </div>

        {/* ── Report body ──────────────────────────────────────────── */}
        <div className="mx-auto max-w-4xl px-8 py-10 print:px-0 print:py-0">

          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-violet-600 pb-4 mb-6">
            <div>
              <p className="text-2xl font-bold tracking-tight text-violet-700">Kashio</p>
              <p className="text-sm text-gray-500 mt-0.5">Tax Deduction Report</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-gray-900">Financial Year {year - 1}–{String(year).slice(2)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Generated: {generated}</p>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="rounded-lg border border-gray-200 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Confirmed</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{rows.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">deductions</p>
            </div>
            <div className="rounded-lg border border-gray-200 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Evidence</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{withEvidence}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {missing > 0 ? `${missing} still missing` : "all attached"}
              </p>
            </div>
            <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-violet-500">Total Claimed</p>
              <p className="mt-1 text-2xl font-bold text-violet-700">${total.toFixed(2)}</p>
              <p className="text-xs text-violet-400 mt-0.5">AUD</p>
            </div>
          </div>

          {/* Category breakdown */}
          <div className="mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">By Category</h2>
            <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 text-sm">
              {categoryTotals.map(([category, amount]) => (
                <div key={category} className="flex justify-between px-4 py-2.5">
                  <span className="text-gray-700">{category}</span>
                  <span className="font-medium text-gray-900">${amount.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between px-4 py-2.5 bg-gray-50">
                <span className="font-semibold text-gray-800">Total</span>
                <span className="font-bold text-gray-900">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Deductions table */}
          <div className="mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              All Deductions
              {missing > 0 && (
                <span className="ml-2 normal-case font-normal text-amber-600">
                  — rows highlighted in amber are missing evidence
                </span>
              )}
            </h2>
            <div className="rounded-lg border border-gray-200 overflow-hidden text-sm">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-800 text-white">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">Date</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">Merchant</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">Description</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">Category</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide">Amount</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">Evidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r, i) => (
                    <tr key={i} className={r.hasEvidence ? "bg-white" : "bg-amber-50"}>
                      <td className="whitespace-nowrap px-3 py-2 text-gray-500">{r.date}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-900">{r.merchant}</td>
                      <td className="px-3 py-2 text-gray-500 max-w-[200px]">
                        <p className="truncate">{r.description}</p>
                        {r.note && <p className="text-xs text-gray-400 mt-0.5">{r.note}</p>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-gray-500">{r.category}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-medium text-gray-900">
                        ${r.amount.toFixed(2)}
                      </td>
                      <td className={`whitespace-nowrap px-3 py-2 text-xs font-medium ${r.hasEvidence ? "text-green-700" : "text-amber-700"}`}>
                        {r.hasEvidence ? "✓ Ready" : "⚠ Missing"}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 border-t border-gray-200">
                    <td colSpan={4} className="px-3 py-2.5 text-right font-semibold text-gray-700 text-sm">Total</td>
                    <td className="px-3 py-2.5 text-right font-bold text-gray-900">${total.toFixed(2)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 pt-4 text-xs text-gray-400">
            <p>This report was generated by Kashio on {generated}.</p>
            <p className="mt-0.5">Verify all deductions with your tax agent before lodging your return.</p>
          </div>

        </div>
      </div>
    </>
  );
}
