import ExcelJS from "exceljs";
import { db } from "../../../lib/db";
import { mapExportRow } from "../../../lib/export/mapExportRow";
import { calcWfhSummary } from "../../../lib/wfhSummary";
import { getUser } from "../../../lib/auth";

const VIOLET = "7C3AED";
const VIOLET_LIGHT = "EDE9FE";
const GRAY_HEADER = "1F2937";
const GRAY_LIGHT = "F9FAFB";
const BORDER_COLOR = "E5E7EB";

function border(): Partial<ExcelJS.Borders> {
  const side = { style: "thin" as const, color: { argb: "FF" + BORDER_COLOR } };
  return { top: side, bottom: side, left: side, right: side };
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

  const now  = new Date();
  const year = now.getFullYear();
  const fy   = `${year - 1}–${String(year).slice(2)}`;
  const generated = now.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });

  const { ytdHours: wfhHours, ytdEst: wfhEst, fyLabel: wfhFyLabel } = calcWfhSummary(wfhEntries);
  const rows  = candidates.map((c) => mapExportRow(c));
  const total = rows.reduce((s, r) => s + r.amount, 0);

  // Category totals
  const catTotals = new Map<string, number>();
  for (const r of rows) {
    catTotals.set(r.category, (catTotals.get(r.category) ?? 0) + r.amount);
  }
  const catRows = [...catTotals.entries()].sort((a, b) => b[1] - a[1]);

  // ── Build workbook ───────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator = "Kashio";

  // ── Sheet 1: Summary ────────────────────────────────────────────────────
  const summary = wb.addWorksheet("Summary");
  summary.columns = [
    { key: "a", width: 28 },
    { key: "b", width: 18 },
  ];

  // Title block
  const titleRow = summary.addRow(["Kashio — Tax Summary", ""]);
  titleRow.height = 32;
  summary.mergeCells("A1:B1");
  const titleCell = summary.getCell("A1");
  titleCell.value = "Kashio — Tax Summary";
  titleCell.font  = { name: "Calibri", size: 16, bold: true, color: { argb: "FF" + VIOLET } };
  titleCell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + VIOLET_LIGHT } };
  titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };

  const fyRow = summary.addRow([`Financial year: FY ${fy}`, ""]);
  summary.mergeCells("A2:B2");
  fyRow.getCell(1).font = { name: "Calibri", size: 10, color: { argb: "FF6B7280" } };
  fyRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + VIOLET_LIGHT } };
  fyRow.getCell(1).alignment = { indent: 1 };

  summary.addRow([]);

  // Stats
  const statsHeader = summary.addRow(["", ""]);
  statsHeader.height = 20;

  function statRow(label: string, value: string) {
    const r = summary.addRow([label, value]);
    r.getCell(1).font      = { name: "Calibri", size: 11, color: { argb: "FF374151" } };
    r.getCell(2).font      = { name: "Calibri", size: 11, bold: true, color: { argb: "FF111827" } };
    r.getCell(2).alignment = { horizontal: "right" };
    r.eachCell((c) => { c.border = border(); });
    return r;
  }

  statRow("Confirmed deductions", String(rows.length) + " items");
  statRow("Total claimed", `$${total.toFixed(2)} AUD`);
  if (wfhHours > 0) {
    statRow("Work from home", `~$${wfhEst.toFixed(2)} AUD`);
    statRow("WFH hours logged", `${wfhHours} hrs (${wfhFyLabel})`);
  }
  statRow("Generated", generated);

  summary.addRow([]);

  // Category breakdown
  const catTitle = summary.addRow(["By Category", ""]);
  summary.mergeCells(`A${catTitle.number}:B${catTitle.number}`);
  catTitle.getCell(1).font  = { name: "Calibri", size: 10, bold: true, color: { argb: "FF" + VIOLET } };
  catTitle.getCell(1).alignment = { indent: 0 };

  for (const [cat, amt] of catRows) {
    const r = summary.addRow([cat, `$${amt.toFixed(2)}`]);
    r.getCell(1).font      = { name: "Calibri", size: 10, color: { argb: "FF374151" } };
    r.getCell(2).font      = { name: "Calibri", size: 10, bold: true, color: { argb: "FF111827" } };
    r.getCell(2).alignment = { horizontal: "right" };
    r.eachCell((c) => { c.border = border(); });
  }

  const catTotal = summary.addRow(["Total", `$${total.toFixed(2)}`]);
  catTotal.getCell(1).font      = { name: "Calibri", size: 10, bold: true, color: { argb: "FF111827" } };
  catTotal.getCell(2).font      = { name: "Calibri", size: 10, bold: true, color: { argb: "FF" + VIOLET } };
  catTotal.getCell(2).alignment = { horizontal: "right" };
  catTotal.eachCell((c) => {
    c.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + GRAY_LIGHT } };
    c.border = border();
  });

  // ── Sheet 2: Deductions ─────────────────────────────────────────────────
  const ded = wb.addWorksheet("Deductions");
  ded.columns = [
    { key: "date",        header: "Date",        width: 14 },
    { key: "merchant",    header: "Merchant",     width: 30 },
    { key: "description", header: "Description",  width: 38 },
    { key: "category",    header: "Category",     width: 22 },
    { key: "amount",      header: "Amount (AUD)", width: 16 },
  ];

  // Header row
  const dedHeader = ded.getRow(1);
  dedHeader.height = 22;
  dedHeader.eachCell((cell) => {
    cell.font      = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + GRAY_HEADER } };
    cell.alignment = { vertical: "middle", horizontal: cell.col === 5 ? "right" : "left" };
    cell.border    = border();
  });

  // Data rows
  for (const r of rows) {
    const dataRow = ded.addRow({
      date:        r.date,
      merchant:    r.merchant,
      description: r.description,
      category:    r.category,
      amount:      r.amount,
    });
    dataRow.getCell("amount").numFmt = '"$"#,##0.00';
    dataRow.getCell("amount").alignment = { horizontal: "right" };
    dataRow.eachCell((c) => {
      c.font   = { name: "Calibri", size: 10 };
      c.border = border();
    });
  }

  // Total row
  const totalRow = ded.addRow({ date: "", merchant: "", description: "", category: "Total", amount: total });
  totalRow.getCell("category").font   = { name: "Calibri", size: 10, bold: true };
  totalRow.getCell("category").alignment = { horizontal: "right" };
  totalRow.getCell("amount").numFmt   = '"$"#,##0.00';
  totalRow.getCell("amount").font     = { name: "Calibri", size: 10, bold: true, color: { argb: "FF" + VIOLET } };
  totalRow.getCell("amount").alignment = { horizontal: "right" };
  totalRow.eachCell((c) => {
    c.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + GRAY_LIGHT } };
    c.border = border();
  });

  // ── Sheet 3: Work From Home ─────────────────────────────────────────────
  if (wfhHours > 0) {
    const wfh = wb.addWorksheet("Work From Home");
    wfh.columns = [
      { key: "a", width: 34 },
      { key: "b", width: 20 },
    ];

    const wfhTitle = wfh.addRow(["Work From Home", ""]);
    wfhTitle.height = 28;
    wfh.mergeCells("A1:B1");
    wfhTitle.getCell(1).value = "Work From Home";
    wfhTitle.getCell(1).font  = { name: "Calibri", size: 14, bold: true, color: { argb: "FF" + VIOLET } };
    wfhTitle.getCell(1).fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + VIOLET_LIGHT } };
    wfhTitle.getCell(1).alignment = { vertical: "middle", indent: 1 };

    wfh.addRow([`${wfhFyLabel} · ATO 67c/hr fixed-rate method`, ""]).getCell(1).font = { name: "Calibri", size: 10, color: { argb: "FF6B7280" } };
    wfh.addRow([]);

    function wfhRow(label: string, value: string, highlight = false) {
      const r = wfh.addRow([label, value]);
      r.getCell(1).font      = { name: "Calibri", size: 11, bold: highlight, color: { argb: highlight ? "FF111827" : "FF374151" } };
      r.getCell(2).font      = { name: "Calibri", size: 11, bold: highlight, color: { argb: highlight ? "FF" + VIOLET : "FF111827" } };
      r.getCell(2).alignment = { horizontal: "right" };
      if (highlight) {
        r.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + GRAY_LIGHT } }; });
      }
      r.eachCell((c) => { c.border = border(); });
    }

    wfhRow("Hours logged this financial year", `${wfhHours} hrs`);
    wfhRow("Rate (ATO fixed-rate method)", "67c / hr");
    wfhRow("Estimated deduction", `~$${wfhEst.toFixed(2)} AUD`, true);

    wfh.addRow([]);
    const note = wfh.addRow(["Note: This is an estimate. Your actual deduction depends on your marginal tax rate.", ""]);
    wfh.mergeCells(`A${note.number}:B${note.number}`);
    note.getCell(1).font = { name: "Calibri", size: 9, italic: true, color: { argb: "FF9CA3AF" } };
  }

  // ── Serialize ────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="kashio-tax-summary-${year}.xlsx"`,
    },
  });
}
