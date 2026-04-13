import ExcelJS from "exceljs";
import { db } from "../../../lib/db";
import { mapExportRow } from "../../../lib/export/mapExportRow";
import { calcWfhSummary } from "../../../lib/wfhSummary";
import { getUser } from "../../../lib/auth";

// ── Palette ──────────────────────────────────────────────────────────────────
const TEXT_DARK    = "FF111827";
const TEXT_MID     = "FF374151";
const TEXT_LIGHT   = "FF9CA3AF";
const RULE         = "FFE5E7EB";

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

  // ── Workbook ─────────────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator = "Kashio";

  const s = wb.addWorksheet("Tax Summary");

  // Three columns: label/merchant · date · amount
  s.columns = [
    { key: "a", width: 40 },
    { key: "b", width: 15 },
    { key: "c", width: 14 },
  ];

  // No gridlines — makes it feel like a document, not a spreadsheet
  s.views = [{ showGridLines: false }];

  // ── Helpers ───────────────────────────────────────────────────────────────

  function gap(n = 1) {
    for (let i = 0; i < n; i++) {
      const r = s.addRow([]);
      r.height = 6;
    }
  }

  // Underlined section heading (only border in the whole doc)
  function sectionHeader(text: string) {
    gap();
    const r = s.addRow([text]);
    s.mergeCells(`A${r.number}:C${r.number}`);
    r.getCell(1).font      = { name: "Calibri", size: 8, bold: true, color: { argb: TEXT_LIGHT } };
    r.getCell(1).border    = { bottom: { style: "thin", color: { argb: RULE } } };
    r.height = 20;
  }

  // Label (A:B merged) + right-aligned value in C
  function keyValue(label: string, value: string, opts: { bold?: boolean; large?: boolean } = {}) {
    const r = s.addRow([label, "", value]);
    s.mergeCells(`A${r.number}:B${r.number}`);
    r.height = opts.large ? 22 : 17;
    r.getCell(1).font      = { name: "Calibri", size: opts.large ? 11 : 10, bold: opts.bold, color: { argb: opts.bold ? TEXT_DARK : TEXT_MID } };
    r.getCell(3).font      = { name: "Calibri", size: opts.large ? 11 : 10, bold: opts.bold, color: { argb: TEXT_DARK } };
    r.getCell(3).alignment = { horizontal: "right" };
  }

  // Category sub-heading inside deductions section
  function catHeader(name: string) {
    const r = s.addRow([name]);
    s.mergeCells(`A${r.number}:C${r.number}`);
    r.height = 18;
    r.getCell(1).font = { name: "Calibri", size: 9, bold: true, color: { argb: TEXT_MID } };
  }

  // Single deduction item: merchant · date · amount
  function deductionRow(merchant: string, date: string, amount: number) {
    const r  = s.addRow([merchant, date, amount]);
    r.height = 17;
    r.getCell(1).font      = { name: "Calibri", size: 10, color: { argb: TEXT_DARK } };
    r.getCell(2).font      = { name: "Calibri", size: 9,  color: { argb: TEXT_LIGHT } };
    r.getCell(3).font      = { name: "Calibri", size: 10, color: { argb: TEXT_DARK } };
    r.getCell(3).numFmt    = '"$"#,##0.00';
    r.getCell(3).alignment = { horizontal: "right" };
  }

  // ── Document header ───────────────────────────────────────────────────────
  gap(2);

  const titleRow = s.addRow(["Kashio"]);
  s.mergeCells(`A${titleRow.number}:C${titleRow.number}`);
  titleRow.getCell(1).font   = { name: "Calibri", size: 16, bold: true, color: { argb: TEXT_DARK } };
  titleRow.height = 26;

  const subRow = s.addRow([`Tax Summary — FY ${fy}`]);
  s.mergeCells(`A${subRow.number}:C${subRow.number}`);
  subRow.getCell(1).font = { name: "Calibri", size: 11, color: { argb: TEXT_MID } };
  subRow.height = 20;

  const metaRow = s.addRow([`Generated ${generated}`]);
  s.mergeCells(`A${metaRow.number}:C${metaRow.number}`);
  metaRow.getCell(1).font = { name: "Calibri", size: 9, color: { argb: TEXT_LIGHT } };
  metaRow.height = 16;

  // ── Section 1: Summary ────────────────────────────────────────────────────
  sectionHeader("SUMMARY");

  keyValue("Total deductions",                    `$${total.toFixed(2)}`,                 { bold: true, large: true });
  keyValue("Confirmed transactions",              `${rows.length}`);
  keyValue("Estimated tax saving (32.5c rate)",   `~$${Math.round(total * 0.325)}`);
  if (wfhHours > 0) {
    keyValue("Work from home estimate",           `~$${wfhEst.toFixed(2)}`);
  }

  gap();

  // Category summary
  for (const [cat, amt] of catRows) {
    const r = s.addRow([cat, "", `$${amt.toFixed(2)}`]);
    s.mergeCells(`A${r.number}:B${r.number}`);
    r.height = 16;
    r.getCell(1).font      = { name: "Calibri", size: 9, color: { argb: TEXT_LIGHT } };
    r.getCell(3).font      = { name: "Calibri", size: 9, color: { argb: TEXT_LIGHT } };
    r.getCell(3).alignment = { horizontal: "right" };
  }

  // ── Section 2: Deductions ─────────────────────────────────────────────────
  sectionHeader("DEDUCTIONS");

  // Group by category
  const byCategory = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!byCategory.has(r.category)) byCategory.set(r.category, []);
    byCategory.get(r.category)!.push(r);
  }
  const sortedCats = [...byCategory.entries()].sort(
    (a, b) => b[1].reduce((s, r) => s + r.amount, 0) - a[1].reduce((s, r) => s + r.amount, 0)
  );

  for (const [cat, items] of sortedCats) {
    gap();
    catHeader(cat);
    for (const r of items) {
      deductionRow(r.merchant, r.date, r.amount);
    }
  }

  gap();
  const totRow = s.addRow(["Total", "", total]);
  s.mergeCells(`A${totRow.number}:B${totRow.number}`);
  totRow.height = 20;
  totRow.getCell(1).font      = { name: "Calibri", size: 10, bold: true, color: { argb: TEXT_MID } };
  totRow.getCell(3).font      = { name: "Calibri", size: 11, bold: true, color: { argb: TEXT_DARK } };
  totRow.getCell(3).numFmt    = '"$"#,##0.00';
  totRow.getCell(3).alignment = { horizontal: "right" };

  // ── Section 3: Work From Home ─────────────────────────────────────────────
  if (wfhHours > 0) {
    sectionHeader("WORK FROM HOME");

    keyValue(`Hours logged (${wfhFyLabel})`, `${wfhHours} hrs`);
    keyValue("ATO fixed-rate method",        "67c / hr");
    keyValue("Estimated deduction",          `~$${wfhEst.toFixed(2)}`, { bold: true });
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  gap(2);

  const note1 = s.addRow(["Estimated tax saving assumes a 32.5c marginal rate. Actual saving may vary. Always verify with a registered tax adviser."]);
  s.mergeCells(`A${note1.number}:C${note1.number}`);
  note1.getCell(1).font = { name: "Calibri", size: 8, italic: true, color: { argb: TEXT_LIGHT } };

  const note2 = s.addRow(["Generated by Kashio. The ATO recommends keeping receipts for all claimed deductions."]);
  s.mergeCells(`A${note2.number}:C${note2.number}`);
  note2.getCell(1).font = { name: "Calibri", size: 8, italic: true, color: { argb: TEXT_LIGHT } };

  // ── Serialize ─────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="kashio-tax-summary-${year}.xlsx"`,
    },
  });
}
