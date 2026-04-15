import ExcelJS from "exceljs";
import { db } from "../../../lib/db";
import { mapExportRow } from "../../../lib/export/mapExportRow";
import { calcWfhSummary } from "../../../lib/wfhSummary";
import { getUser } from "../../../lib/auth";

// ── Palette ───────────────────────────────────────────────────────────────────
// All ARGB. A=FF (fully opaque).
const BLACK = "FF111827"; // document title, totals, important values
const DARK  = "FF1F2937"; // body text, merchants
const MID   = "FF4B5563"; // labels, secondary text
const DIM   = "FF9CA3AF"; // dates, metadata, footnotes
const RULE  = "FFE5E7EB"; // thin dividers

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

  // ── Workbook ──────────────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator = "Kashio";

  const s = wb.addWorksheet("Tax Summary");

  // Columns: label/merchant · date · amount
  s.columns = [
    { key: "a", width: 38 },
    { key: "b", width: 14 },
    { key: "c", width: 16 },
  ];

  // No gridlines — document feel, not spreadsheet
  s.views = [{ showGridLines: false }];

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Empty row for vertical breathing room */
  function gap(height = 8) {
    const r = s.addRow([]);
    r.height = height;
  }

  /** Full-width thin rule */
  function divider() {
    gap(4);
    const r = s.addRow([]);
    s.mergeCells(`A${r.number}:C${r.number}`);
    r.getCell(1).border = { bottom: { style: "thin", color: { argb: RULE } } };
    r.height = 2;
    gap(4);
  }

  /**
   * Section heading — large enough to read as a document heading (not size 8).
   * Uses a bottom border to anchor the section.
   */
  function sectionHead(text: string) {
    gap(14);
    const r = s.addRow([text]);
    s.mergeCells(`A${r.number}:C${r.number}`);
    r.getCell(1).font   = { name: "Calibri", size: 11, bold: true, color: { argb: BLACK } };
    r.getCell(1).border = { bottom: { style: "thin", color: { argb: RULE } } };
    r.height = 22;
    gap(6);
  }

  /**
   * Label (A:B merged) + right-aligned value (C).
   * Used for summary key-value pairs and WFH stats.
   */
  function kv(
    label: string,
    value: string,
    opts: { bold?: boolean; large?: boolean; labelColor?: string; valueColor?: string } = {},
  ) {
    const r = s.addRow([label, "", value]);
    s.mergeCells(`A${r.number}:B${r.number}`);
    r.height = opts.large ? 24 : 18;
    const sz = opts.large ? 12 : 10;
    r.getCell(1).font      = { name: "Calibri", size: sz, bold: opts.bold, color: { argb: opts.labelColor ?? MID } };
    r.getCell(3).font      = { name: "Calibri", size: sz, bold: opts.bold, color: { argb: opts.valueColor ?? BLACK } };
    r.getCell(3).alignment = { horizontal: "right" };
  }

  /**
   * Category heading inside the Deductions section.
   * Needs to read as a sub-section label — bigger than metadata, smaller than section head.
   */
  function catHead(name: string) {
    gap(8);
    const r = s.addRow([name]);
    s.mergeCells(`A${r.number}:C${r.number}`);
    r.getCell(1).font = { name: "Calibri", size: 10, bold: true, color: { argb: DARK } };
    r.height = 20;
  }

  /** Single transaction row: merchant (A) · date (B, right-aligned) · amount (C) */
  function txRow(merchant: string, date: string, amount: number) {
    const r = s.addRow(["    " + merchant, date, amount]);
    r.height = 18;
    r.getCell(1).font      = { name: "Calibri", size: 10, color: { argb: DARK } };
    r.getCell(2).font      = { name: "Calibri", size: 9,  color: { argb: DIM  } };
    r.getCell(2).alignment = { horizontal: "right" };
    r.getCell(3).font      = { name: "Calibri", size: 10, color: { argb: DARK } };
    r.getCell(3).numFmt    = '"$"#,##0.00';
    r.getCell(3).alignment = { horizontal: "right" };
  }

  /** Category subtotal row — right-aligned, indented label */
  function catTotal(amount: number) {
    gap(2);
    const r = s.addRow(["", "", amount]);
    r.height = 16;
    r.getCell(2).font      = { name: "Calibri", size: 9, italic: true, color: { argb: DIM } };
    r.getCell(2).alignment = { horizontal: "right" };
    r.getCell(3).font      = { name: "Calibri", size: 9, color: { argb: MID } };
    r.getCell(3).numFmt    = '"$"#,##0.00';
    r.getCell(3).alignment = { horizontal: "right" };
    r.getCell(3).border    = { top: { style: "thin", color: { argb: RULE } } };
  }

  // ── Document header ────────────────────────────────────────────────────────
  gap(14);

  const titleRow = s.addRow(["Kashio"]);
  s.mergeCells(`A${titleRow.number}:C${titleRow.number}`);
  titleRow.getCell(1).font = { name: "Calibri", size: 18, bold: true, color: { argb: BLACK } };
  titleRow.height = 30;

  const subRow = s.addRow([`Tax Summary — FY ${fy}`]);
  s.mergeCells(`A${subRow.number}:C${subRow.number}`);
  subRow.getCell(1).font = { name: "Calibri", size: 12, color: { argb: MID } };
  subRow.height = 22;

  gap(4);

  const metaRow = s.addRow([`Generated ${generated}`]);
  s.mergeCells(`A${metaRow.number}:C${metaRow.number}`);
  metaRow.getCell(1).font = { name: "Calibri", size: 9, color: { argb: DIM } };
  metaRow.height = 16;

  divider();

  // ── Section 1: Summary ────────────────────────────────────────────────────
  sectionHead("Summary");

  kv("Total deductions",                  `$${total.toFixed(2)}`,               { bold: true, large: true });
  kv("Estimated tax saving (32.5% rate)", `~$${Math.round(total * 0.325)}`,     { valueColor: MID });
  if (wfhHours > 0) {
    kv("Work from home",                  `~$${wfhEst.toFixed(2)}`,             { valueColor: MID });
  }
  kv("Confirmed items",                   `${rows.length}`,                     { valueColor: DIM  });

  gap(10);

  // Category breakdown within summary
  for (const [cat, amt] of catRows) {
    const r = s.addRow([cat, "", `$${amt.toFixed(2)}`]);
    s.mergeCells(`A${r.number}:B${r.number}`);
    r.height = 17;
    r.getCell(1).font      = { name: "Calibri", size: 9, color: { argb: DIM } };
    r.getCell(3).font      = { name: "Calibri", size: 9, color: { argb: DIM } };
    r.getCell(3).alignment = { horizontal: "right" };
  }

  // ── Section 2: Deductions ─────────────────────────────────────────────────
  sectionHead("Deductions");

  const byCategory = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!byCategory.has(r.category)) byCategory.set(r.category, []);
    byCategory.get(r.category)!.push(r);
  }
  const sortedCats = [...byCategory.entries()].sort(
    (a, b) => b[1].reduce((s, r) => s + r.amount, 0) - a[1].reduce((s, r) => s + r.amount, 0),
  );

  for (const [cat, items] of sortedCats) {
    catHead(cat);
    for (const r of items) {
      txRow(r.merchant, r.date, r.amount);
    }
    catTotal(items.reduce((s, r) => s + r.amount, 0));
  }

  gap(10);

  // Grand total
  const totRow = s.addRow(["Total", "", total]);
  s.mergeCells(`A${totRow.number}:B${totRow.number}`);
  totRow.height = 22;
  totRow.getCell(1).font      = { name: "Calibri", size: 11, bold: true, color: { argb: DARK } };
  totRow.getCell(3).font      = { name: "Calibri", size: 11, bold: true, color: { argb: BLACK } };
  totRow.getCell(3).numFmt    = '"$"#,##0.00';
  totRow.getCell(3).alignment = { horizontal: "right" };
  totRow.getCell(3).border    = { top: { style: "medium", color: { argb: DARK } } };

  // ── Section 3: Work From Home ─────────────────────────────────────────────
  if (wfhHours > 0) {
    sectionHead("Work From Home");

    kv(`Hours logged (${wfhFyLabel})`, `${wfhHours} hrs`);
    kv("Calculation method",           "ATO fixed rate — 67¢/hr");
    gap(4);
    kv("Estimated deduction",          `~$${wfhEst.toFixed(2)}`, { bold: true });
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  divider();

  const note1 = s.addRow(["Estimated tax saving assumes a 32.5% marginal rate. Actual saving depends on individual circumstances — verify with a registered tax adviser."]);
  s.mergeCells(`A${note1.number}:C${note1.number}`);
  note1.getCell(1).font = { name: "Calibri", size: 8, italic: true, color: { argb: DIM } };
  note1.height = 16;

  gap(2);

  const note2 = s.addRow(["Generated by Kashio. The ATO recommends keeping receipts for all claimed deductions over $300."]);
  s.mergeCells(`A${note2.number}:C${note2.number}`);
  note2.getCell(1).font = { name: "Calibri", size: 8, italic: true, color: { argb: DIM } };
  note2.height = 16;

  gap(10);

  // ── Serialize ──────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="kashio-tax-summary-${year}.xlsx"`,
    },
  });
}
