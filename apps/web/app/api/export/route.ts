import ExcelJS from "exceljs";
import { db } from "../../../lib/db";
import { mapExportRow } from "../../../lib/export/mapExportRow";
import { calcWfhSummary } from "../../../lib/wfhSummary";
import { getUser } from "../../../lib/auth";

// ── Palette ──────────────────────────────────────────────────────────────────
const TEXT_DARK    = "FF111827";
const TEXT_MID     = "FF374151";
const TEXT_LIGHT   = "FF9CA3AF";
const BORDER_RULE  = "FFE5E7EB";

function thin(argb = BORDER_RULE): ExcelJS.Border {
  return { style: "thin", color: { argb } };
}

export async function GET() {
  const userId = await getUser();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [candidates, wfhEntries] = await Promise.all([
    db.deductionCandidate.findMany({
      where:   { status: "CONFIRMED", userId },
      include: { transaction: true },
      orderBy: { transaction: { date: "asc" } },
    }),
    db.wfhLog.findMany({ where: { userId }, select: { date: true, hours: true } }),
  ]);

  if (candidates.length === 0) {
    return Response.json({ error: "No confirmed deductions to export." }, { status: 404 });
  }

  const now       = new Date();
  const year      = now.getFullYear();
  const fy        = `${year - 1}–${String(year).slice(2)}`;
  const generated = now.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });

  const { ytdHours: wfhHours, ytdEst: wfhEst, fyLabel: wfhFyLabel } = calcWfhSummary(wfhEntries);
  const rows  = candidates.map((c) => mapExportRow(c));
  const total = rows.reduce((s, r) => s + r.amount, 0);

  const catTotals = new Map<string, number>();
  for (const r of rows) catTotals.set(r.category, (catTotals.get(r.category) ?? 0) + r.amount);
  const catRows = [...catTotals.entries()].sort((a, b) => b[1] - a[1]);

  // ── Workbook setup ───────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator = "Kashio";

  const s = wb.addWorksheet("Tax Report");
  s.columns = [
    { key: "a", width: 34 },
    { key: "b", width: 14 },
    { key: "c", width: 22 },
    { key: "d", width: 16 },
  ];

  // ── Helpers ──────────────────────────────────────────────────────────────

  function gap(n = 1) {
    for (let i = 0; i < n; i++) s.addRow([]);
  }

  function sectionLabel(text: string) {
    gap();
    const r = s.addRow([text]);
    s.mergeCells(`A${r.number}:D${r.number}`);
    r.getCell(1).font      = { name: "Calibri", size: 8, bold: true, color: { argb: TEXT_LIGHT } };
    r.getCell(1).border    = { bottom: thin() };
    r.height = 16;
  }

  // Two-column summary line (label in A–C merged, value in D right-aligned)
  function summaryLine(label: string, value: string, bold = false) {
    const r = s.addRow([label, "", "", value]);
    r.height = 18;
    s.mergeCells(`A${r.number}:C${r.number}`);
    r.getCell(1).font      = { name: "Calibri", size: 10, bold, color: { argb: bold ? TEXT_DARK : TEXT_MID } };
    r.getCell(4).font      = { name: "Calibri", size: 10, bold, color: { argb: TEXT_DARK } };
    r.getCell(4).alignment = { horizontal: "right" };
  }

  // ── Title ────────────────────────────────────────────────────────────────
  const titleRow = s.addRow(["Kashio — Tax Summary"]);
  s.mergeCells("A1:D1");
  titleRow.getCell(1).value     = "Kashio — Tax Summary";
  titleRow.getCell(1).font      = { name: "Calibri", size: 14, bold: true, color: { argb: TEXT_DARK } };
  titleRow.getCell(1).alignment = { vertical: "middle" };
  titleRow.height = 28;

  const metaRow = s.addRow([`Financial year: FY ${fy}  ·  Generated ${generated}`]);
  s.mergeCells("A2:D2");
  metaRow.getCell(1).font  = { name: "Calibri", size: 9, color: { argb: TEXT_LIGHT } };
  metaRow.height = 14;

  // ── Section 1: Summary ───────────────────────────────────────────────────
  sectionLabel("SUMMARY");

  summaryLine("Total deductions", `$${total.toFixed(2)}`, true);
  summaryLine("Confirmed items",  `${rows.length}`);
  summaryLine("Estimated tax saving (32.5c rate)", `~$${Math.round(total * 0.325)}`);
  if (wfhHours > 0) {
    summaryLine("Work from home estimate", `~$${wfhEst.toFixed(2)}`);
  }

  // Category breakdown within summary
  gap();
  for (const [cat, amt] of catRows) {
    const r = s.addRow([cat, "", "", `$${amt.toFixed(2)}`]);
    r.height = 16;
    s.mergeCells(`A${r.number}:C${r.number}`);
    r.getCell(1).font      = { name: "Calibri", size: 9, color: { argb: TEXT_MID } };
    r.getCell(4).font      = { name: "Calibri", size: 9, color: { argb: TEXT_MID } };
    r.getCell(4).alignment = { horizontal: "right" };
  }

  // ── Section 2: Deductions ─────────────────────────────────────────────────
  sectionLabel("DEDUCTIONS");

  // Column headers
  const dedHead = s.addRow(["Merchant", "Date", "Category", "Amount"]);
  dedHead.height = 16;
  dedHead.eachCell((cell, col) => {
    cell.font      = { name: "Calibri", size: 9, bold: true, color: { argb: TEXT_LIGHT } };
    cell.alignment = { horizontal: col === 4 ? "right" : "left" };
    cell.border    = { bottom: thin() };
  });

  // Data rows
  for (const r of rows) {
    const dr = s.addRow([r.merchant, r.date, r.category, r.amount]);
    dr.height = 16;
    dr.getCell(1).font      = { name: "Calibri", size: 10, color: { argb: TEXT_DARK } };
    dr.getCell(2).font      = { name: "Calibri", size: 10, color: { argb: TEXT_LIGHT } };
    dr.getCell(3).font      = { name: "Calibri", size: 10, color: { argb: TEXT_MID } };
    dr.getCell(4).font      = { name: "Calibri", size: 10, color: { argb: TEXT_DARK } };
    dr.getCell(4).numFmt    = '"$"#,##0.00';
    dr.getCell(4).alignment = { horizontal: "right" };
  }

  // Total row
  const totRow = s.addRow(["", "", "Total", total]);
  totRow.height = 18;
  totRow.getCell(3).font      = { name: "Calibri", size: 10, bold: true, color: { argb: TEXT_MID } };
  totRow.getCell(3).alignment = { horizontal: "right" };
  totRow.getCell(4).font      = { name: "Calibri", size: 10, bold: true, color: { argb: TEXT_DARK } };
  totRow.getCell(4).numFmt    = '"$"#,##0.00';
  totRow.getCell(4).alignment = { horizontal: "right" };
  totRow.eachCell((c) => { c.border = { top: thin() }; });

  // ── Section 3: Work From Home ─────────────────────────────────────────────
  if (wfhHours > 0) {
    sectionLabel("WORK FROM HOME");

    summaryLine(`Hours logged (${wfhFyLabel})`, `${wfhHours} hrs`);
    summaryLine("Rate (ATO fixed-rate method)",  "67c / hr");
    summaryLine("Estimated deduction",           `~$${wfhEst.toFixed(2)}`, true);

    gap();
    const noteRow = s.addRow(["This is an estimate. Actual deduction depends on your marginal tax rate."]);
    s.mergeCells(`A${noteRow.number}:D${noteRow.number}`);
    noteRow.getCell(1).font = { name: "Calibri", size: 8, italic: true, color: { argb: TEXT_LIGHT } };
  }

  // ── Serialize ─────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="kashio-tax-summary-${year}.xlsx"`,
    },
  });
}
