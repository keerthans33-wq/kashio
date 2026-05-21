import { db } from "../../../../lib/db";
import { requireUser } from "../../../../lib/auth";
import { mapExportRow } from "../../../../lib/export/mapExportRow";
import { calcWfhSummary } from "../../../../lib/wfhSummary";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

export default async function ExportReport() {
  const userId = await requireUser();

  const [claimedCandidates, wfhEntries] = await Promise.all([
    db.deductionCandidate.findMany({
      where:   { status: "CONFIRMED", userId },
      include: { transaction: true },
      orderBy: { transaction: { date: "asc" } },
    }),
    db.wfhLog.findMany({ where: { userId }, select: { date: true, hours: true } }),
  ]);

  const now       = new Date();
  const year      = now.getFullYear();
  const fy        = `${year - 1}–${String(year).slice(2)}`;
  const generated = now.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });

  const claimedRows = claimedCandidates.map((c) => ({
    ...mapExportRow(c),
    hasEvidence: c.hasEvidence,
    note:        c.evidenceNote,
    source:      (c.transaction.source === "BASIQ" || c.transaction.source === "DEMO_BANK") ? "Bank" : "CSV",
  }));

  const claimedTotal    = claimedRows.reduce((s, r) => s + r.amount, 0);
  const estimatedSaving = Math.round(claimedTotal * 0.325);

  const withEvidence = claimedRows.filter((r) => r.hasEvidence).length;
  const missing      = claimedRows.length - withEvidence;

  const { ytdHours: wfhHours, ytdEst: wfhEst, fyLabel: wfhFyLabel } = calcWfhSummary(wfhEntries);

  const categoryTotals = Object.entries(
    claimedRows.reduce<Record<string, number>>((acc, r) => {
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
        .report-wrap { width: 100%; padding: 16px 16px 32px; }
        @media (min-width: 640px) {
          .report-wrap { max-width: 860px; margin: 0 auto; padding: 32px 32px 48px; }
        }
        .report-header-table, .report-header-table tbody, .report-header-table tr { display: block !important; }
        .report-header-table td { display: block !important; text-align: left !important; }
        .report-header-table td:last-child { margin-top: 6px; }
        @media (min-width: 640px) {
          .report-header-table { display: table !important; }
          .report-header-table tbody { display: table-row-group !important; }
          .report-header-table tr { display: table-row !important; }
          .report-header-table td { display: table-cell !important; }
          .report-header-table td:last-child { text-align: right !important; margin-top: 0; }
        }
        .summary-table, .summary-table tbody, .summary-table tr { display: block !important; }
        .summary-cell { display: block !important; width: 100% !important; padding: 0 0 8px !important; vertical-align: top; }
        .summary-cell:last-child { padding-bottom: 0 !important; }
        @media (min-width: 640px) {
          .summary-table { display: table !important; width: 100%; border-collapse: separate !important; border-spacing: 0 !important; }
          .summary-table tbody { display: table-row-group !important; }
          .summary-table tr { display: table-row !important; }
          .summary-cell { display: table-cell !important; width: 33% !important; padding: 0 !important; }
          .summary-cell:nth-child(2) { padding: 0 6px !important; }
        }
        .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        /* Deductions table */
        .ded-table { width: 100%; border-collapse: collapse; font-size: 12px; min-width: 480px; }
        .ded-table th, .ded-table td { padding: 7px 10px; text-align: left; vertical-align: top; }
        .ded-table th { background: #1f2937; color: #fff; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
        .ded-table td { border-bottom: 1px solid #f3f4f6; color: #374151; }
        /* Columns that must never wrap */
        .ded-table td.nowrap { white-space: nowrap; }
        .ded-table td.amount { text-align: right; font-weight: 600; color: #111827; white-space: nowrap; }
        .ded-table td.merchant { font-weight: 600; color: #111827; word-break: break-word; }
        .ded-table td.category { color: #6b7280; word-break: break-word; }
        .ded-table td.evidence-ready   { color: #065f46; font-weight: 600; white-space: nowrap; }
        .ded-table td.evidence-missing { color: #b45309; font-weight: 600; white-space: nowrap; }
        .ded-table tr.missing-row { background: #fffbeb; }
        .ded-table tr.total-row td { background: #f9fafb; border-top: 2px solid #e5e7eb; font-weight: 700; color: #111827; }
        @media (min-width: 640px) {
          .ded-table { table-layout: fixed; font-size: 11px; min-width: 0; }
          .ded-table .col-date     { width: 10%; }
          .ded-table .col-merchant { width: 24%; }
          .ded-table .col-category { width: 19%; }
          .ded-table .col-source   { width: 7%; }
          .ded-table .col-amount   { width: 10%; }
          .ded-table .col-evidence { width: 13%; }
          .ded-table .col-reason   { width: 17%; }
        }
        .note-text { font-size: 10px; color: #9ca3af; margin-top: 2px; }
        .truncate-cell { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
        .cat-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .cat-table td { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; }
        .cat-table td:last-child { text-align: right; font-weight: 600; color: #111827; }
        .cat-table tr.total-row td { background: #f9fafb; font-weight: 700; color: #111827; border-top: 2px solid #e5e7eb; }
        .wfh-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .wfh-table td { padding: 8px 12px; color: #374151; }
        .wfh-table td:last-child { text-align: right; font-weight: 600; color: #111827; }
      `}</style>

      {/* Toolbar — screen only */}
      <div className="no-print" style={{ position: "sticky", top: 0, zIndex: 10, background: "var(--bg-card)", borderBottom: "1px solid var(--bg-border)", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/export" style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none", fontWeight: 500 }}>← Back to Export</a>
          <span style={{ color: "var(--bg-border)" }}>|</span>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Tax Deduction Report {fy}</span>
        </div>
        <PrintButton />
      </div>

      <div className="report-wrap">

        {/* ── Report header ──────────────────────────────────────── */}
        <table className="report-header-table" style={{ width: "100%", borderBottom: "3px solid #7c3aed", paddingBottom: 12, marginBottom: 20 }}>
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
        <table className="summary-table" style={{ marginBottom: 24 }}>
          <tbody>
            <tr>
              {[
                { label: "Claimed deductions",      value: `$${claimedTotal.toFixed(2)}`, sub: `${claimedRows.length} transaction${claimedRows.length !== 1 ? "s" : ""}`, accent: true },
                { label: "Est. tax saving (32.5%)", value: estimatedSaving > 0 ? `~$${estimatedSaving}` : "—", sub: "claimed deductions only", accent: true },
              ].map((s, i) => (
                <td key={i} className="summary-cell">
                  <div style={{ border: s.accent ? "1px solid #bbf7d0" : "1px solid #e5e7eb", borderRadius: 6, padding: "10px 14px", background: s.accent ? "#f0fdf4" : "#fff" }}>
                    <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: s.accent ? "#15803d" : "#9ca3af" }}>{s.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.accent ? "#166534" : "#111827", margin: "4px 0 2px" }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: s.accent ? "#4ade80" : "#9ca3af" }}>{s.sub}</div>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>

        {/* ── Category breakdown ─────────────────────────────────── */}
        {categoryTotals.length > 0 && (
          <div style={{ marginBottom: 24 }} className="page-break-inside-avoid">
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af", marginBottom: 6 }}>By Category (Claimed)</div>
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
                    <td>Total claimed</td>
                    <td>${claimedTotal.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Work from home ─────────────────────────────────────── */}
        {wfhHours > 0 && (
          <div style={{ marginBottom: 24 }} className="page-break-inside-avoid">
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af", marginBottom: 6 }}>Work From Home</div>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 6, overflow: "hidden" }}>
              <table className="wfh-table">
                <tbody>
                  <tr>
                    <td>Hours logged ({wfhFyLabel})</td>
                    <td>{wfhHours} hr{wfhHours !== 1 ? "s" : ""}</td>
                  </tr>
                  <tr style={{ background: "#f9fafb", borderTop: "2px solid #e5e7eb" }}>
                    <td style={{ fontWeight: 700, color: "#111827" }}>Estimated deduction (67c/hr ATO fixed-rate)</td>
                    <td style={{ fontWeight: 700, color: "#111827" }}>${wfhEst.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Section 1: User-claimed deductions ────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af" }}>User-Claimed Deductions</div>
            {missing > 0 && (
              <div style={{ fontSize: 10, color: "#b45309" }}>— amber rows missing evidence</div>
            )}
          </div>

          {claimedRows.length === 0 ? (
            <p style={{ fontSize: 13, color: "#9ca3af", padding: "12px 0" }}>No transactions claimed yet. Review transactions and click Claim on the ones that apply.</p>
          ) : (
            <DeductionTable rows={claimedRows} total={claimedTotal} headerBg="#14532d" headerColor="#fff" />
          )}
        </div>

        {/* ── Grand total (claimed only) ─────────────────────────── */}
        {claimedRows.length > 0 && (
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "baseline", gap: 12, padding: "6px 2px", borderTop: "2px solid #e5e7eb", marginTop: 4, marginBottom: 24 }}>
            <span style={{ fontSize: 11, color: "#374151" }}>Total claimed</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>${claimedTotal.toFixed(2)}</span>
          </div>
        )}

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 10, fontSize: 10, color: "#9ca3af" }}>
          <p style={{ margin: 0 }}>This report was generated by Kashio on {generated}.</p>
          <p style={{ margin: "3px 0 0" }}>
            Kashio does not provide tax advice. Suggestions are based on transaction descriptions only.
            You decide what to claim and should verify all deductions with a registered tax agent before lodging your return.
          </p>
        </div>

      </div>
    </>
  );
}

// ── Deduction table sub-component ──────────────────────────────────────────────

type ExportRowWithEvidence = {
  date:        string;
  merchant:    string;
  category:    string;
  amount:      number;
  reason:      string;
  hasEvidence: boolean;
  note:        string | null | undefined;
  source:      string;
};

function DeductionTable({
  rows, total, headerBg, headerColor, dimBg,
}: {
  rows:        ExportRowWithEvidence[];
  total:       number;
  headerBg:    string;
  headerColor: string;
  dimBg?:      string;
}) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 6, overflow: "hidden" }}>
      <div className="table-scroll">
        <table className="ded-table">
          <colgroup>
            <col className="col-date" />
            <col className="col-merchant" />
            <col className="col-category" />
            <col className="col-source" />
            <col className="col-amount" />
            <col className="col-evidence" />
            <col className="col-reason" />
          </colgroup>
          <thead>
            <tr style={{ background: headerBg }}>
              <th style={{ color: headerColor }}>Date</th>
              <th style={{ color: headerColor }}>Merchant</th>
              <th style={{ color: headerColor }}>Category</th>
              <th style={{ color: headerColor }}>Source</th>
              <th style={{ color: headerColor, textAlign: "right" }}>Amount</th>
              <th style={{ color: headerColor }}>Evidence</th>
              <th style={{ color: headerColor }}>Reason</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={i}
                className={!r.hasEvidence ? "missing-row" : ""}
                style={dimBg ? { background: dimBg } : undefined}
              >
                <td className="nowrap" style={{ color: "#6b7280" }}>{r.date}</td>
                <td className="merchant">{r.merchant}</td>
                <td className="category">{r.category}</td>
                <td className="nowrap" style={{ color: "#9ca3af", fontSize: 10 }}>{r.source}</td>
                <td className="amount">${r.amount.toFixed(2)}</td>
                <td className={r.hasEvidence ? "evidence-ready" : "evidence-missing"}>
                  {r.hasEvidence ? "✓ Ready" : "⚠ Missing"}
                </td>
                <td style={{ color: "#9ca3af", fontSize: 10 }}>
                  {r.reason ? r.reason.slice(0, 80) + (r.reason.length > 80 ? "…" : "") : (r.note ?? "")}
                </td>
              </tr>
            ))}
            <tr className="total-row">
              <td colSpan={4} style={{ textAlign: "right", color: "#374151" }}>
                {rows.length} item{rows.length !== 1 ? "s" : ""}
              </td>
              <td className="amount">${total.toFixed(2)}</td>
              <td colSpan={2} />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
