import { db } from "../../../../lib/db";
import { requireUser } from "../../../../lib/auth";
import { mapExportRow } from "../../../../lib/export/mapExportRow";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

export default async function ExportReport() {
  const userId = await requireUser();
  const candidates = await db.deductionCandidate.findMany({
    where:   { status: "CONFIRMED", userId },
    include: { transaction: true },
    orderBy: { transaction: { date: "asc" } },
  });

  const now       = new Date();
  const year      = now.getFullYear();
  const fy        = `${year - 1}–${String(year).slice(2)}`;
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
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        @media print {
          @page { size: A4 portrait; margin: 16mm 14mm 14mm 14mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .page-break-inside-avoid { break-inside: avoid; }
        }
        @media screen {
          .report-wrap { max-width: 860px; margin: 0 auto; padding: 32px 32px 48px; }
        }
        /* Table */
        .ded-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 11px; }
        .ded-table th, .ded-table td { padding: 7px 10px; text-align: left; vertical-align: top; overflow: hidden; }
        .ded-table th { background: #1f2937; color: #fff; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
        .ded-table td { border-bottom: 1px solid #f3f4f6; color: #374151; }
        .ded-table td.amount { text-align: right; font-weight: 600; color: #111827; white-space: nowrap; }
        .ded-table td.merchant { font-weight: 600; color: #111827; }
        .ded-table td.evidence-ready   { color: #065f46; font-weight: 600; white-space: nowrap; }
        .ded-table td.evidence-missing { color: #b45309; font-weight: 600; white-space: nowrap; }
        .ded-table tr.missing-row { background: #fffbeb; }
        .ded-table tr:last-child.total-row td { background: #f9fafb; border-top: 2px solid #e5e7eb; font-weight: 700; color: #111827; }
        .ded-table .col-date     { width: 11%; }
        .ded-table .col-merchant { width: 24%; }
        .ded-table .col-category { width: 22%; }
        .ded-table .col-amount   { width: 13%; }
        .ded-table .col-evidence { width: 13%; }
        .ded-table .col-note     { width: 17%; }
        .note-text { font-size: 10px; color: #9ca3af; margin-top: 2px; }
        .truncate-cell { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
        /* Category table */
        .cat-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .cat-table td { padding: 6px 12px; border-bottom: 1px solid #f3f4f6; }
        .cat-table td:last-child { text-align: right; font-weight: 600; color: #111827; }
        .cat-table tr.total-row td { background: #f9fafb; font-weight: 700; color: #111827; border-top: 2px solid #e5e7eb; }
      `}</style>

      {/* Toolbar — screen only */}
      <div className="no-print" style={{ position: "sticky", top: 0, zIndex: 10, background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/export" style={{ fontSize: 13, color: "#6b7280", textDecoration: "underline" }}>← Back</a>
          <span style={{ color: "#d1d5db" }}>|</span>
          <span style={{ fontSize: 13, color: "#9ca3af" }}>Tax Deduction Report {fy}</span>
        </div>
        <PrintButton />
      </div>

      <div className="report-wrap">

        {/* ── Report header ──────────────────────────────────────── */}
        <table style={{ width: "100%", borderBottom: "3px solid #7c3aed", paddingBottom: 12, marginBottom: 20 }}>
          <tbody>
            <tr>
              <td style={{ verticalAlign: "bottom" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#7c3aed", letterSpacing: -0.5 }}>Kashio</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Tax Deduction Report</div>
              </td>
              <td style={{ textAlign: "right", verticalAlign: "bottom" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>FY {fy}</div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Generated {generated}</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── Summary ────────────────────────────────────────────── */}
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 0", marginBottom: 24 }}>
          <tbody>
            <tr>
              {[
                { label: "Confirmed deductions", value: String(rows.length), sub: "items" },
                { label: "Evidence attached",    value: String(withEvidence), sub: missing > 0 ? `${missing} still missing` : "all ready" },
                { label: "Total claimed",        value: `$${total.toFixed(2)}`, sub: "AUD" },
              ].map((s, i) => (
                <td key={i} style={{ width: "33%", padding: i === 1 ? "0 6px" : 0, verticalAlign: "top" }}>
                  <div style={{ border: i === 2 ? "1px solid #ddd6fe" : "1px solid #e5e7eb", borderRadius: 6, padding: "10px 14px", background: i === 2 ? "#f5f3ff" : "#fff" }}>
                    <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: i === 2 ? "#7c3aed" : "#9ca3af" }}>{s.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: i === 2 ? "#6d28d9" : "#111827", margin: "4px 0 2px" }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: i === 2 ? "#a78bfa" : "#9ca3af" }}>{s.sub}</div>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>

        {/* ── Category breakdown ─────────────────────────────────── */}
        <div style={{ marginBottom: 24 }} className="page-break-inside-avoid">
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af", marginBottom: 6 }}>By Category</div>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 6, overflow: "hidden" }}>
            <table className="cat-table">
              <tbody>
                {categoryTotals.map(([cat, amt]) => (
                  <tr key={cat}>
                    <td style={{ color: "#374151" }}>{cat}</td>
                    <td>${amt.toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td>Total</td>
                  <td>${total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Deductions table ───────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af" }}>All Deductions</div>
            {missing > 0 && (
              <div style={{ fontSize: 10, color: "#b45309" }}>— amber rows are missing evidence</div>
            )}
          </div>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 6, overflow: "hidden" }}>
            <table className="ded-table">
              <colgroup>
                <col className="col-date" />
                <col className="col-merchant" />
                <col className="col-category" />
                <col className="col-amount" />
                <col className="col-evidence" />
                <col className="col-note" />
              </colgroup>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Merchant</th>
                  <th>Category</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th>Evidence</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={r.hasEvidence ? "" : "missing-row"}>
                    <td style={{ color: "#6b7280", whiteSpace: "nowrap" }}>{r.date}</td>
                    <td className="merchant"><span className="truncate-cell">{r.merchant}</span></td>
                    <td style={{ color: "#6b7280" }}><span className="truncate-cell">{r.category}</span></td>
                    <td className="amount">${r.amount.toFixed(2)}</td>
                    <td className={r.hasEvidence ? "evidence-ready" : "evidence-missing"}>
                      {r.hasEvidence ? "✓ Ready" : "⚠ Missing"}
                    </td>
                    <td style={{ color: "#9ca3af", fontSize: 10 }}>{r.note ?? ""}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td colSpan={3} style={{ textAlign: "right", color: "#374151" }}>Total</td>
                  <td className="amount">${total.toFixed(2)}</td>
                  <td colSpan={2} />
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 10, fontSize: 10, color: "#9ca3af" }}>
          <p style={{ margin: 0 }}>This report was generated by Kashio on {generated}.</p>
          <p style={{ margin: "3px 0 0" }}>Verify all deductions with your registered tax agent before lodging your return.</p>
        </div>

      </div>
    </>
  );
}
