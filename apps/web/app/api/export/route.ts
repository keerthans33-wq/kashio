import { db } from "../../../lib/db";
import { mapExportRow } from "../../../lib/export/mapExportRow";
import { calcWfhSummary } from "../../../lib/wfhSummary";
import { getUser } from "../../../lib/auth";

function csvRow(cells: string[]): string {
  return cells.map((c) => `"${c.replace(/"/g, '""')}"`).join(",");
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

  const year = new Date().getFullYear();
  const { ytdHours: wfhHours, ytdEst: wfhEst, fyLabel: wfhFyLabel } = calcWfhSummary(wfhEntries);

  const lines: string[] = [];

  // Deductions section
  lines.push(csvRow(["Date", "Merchant", "Description", "Category", "Amount (AUD)"]));
  for (const c of candidates) {
    const row = mapExportRow(c);
    lines.push(csvRow([row.date, row.merchant, row.description, row.category, row.amount.toFixed(2)]));
  }

  const total = candidates.reduce((s, c) => s + Math.abs(c.transaction.amount), 0);
  lines.push(csvRow(["", "", "", "Total", total.toFixed(2)]));

  // WFH section
  if (wfhHours > 0) {
    lines.push("");
    lines.push(csvRow(["Work From Home", wfhFyLabel, "67c/hr ATO fixed-rate method", "", ""]));
    lines.push(csvRow(["Hours logged", String(wfhHours), "", "", ""]));
    lines.push(csvRow(["Estimated deduction", "", "", "", wfhEst.toFixed(2)]));
  }

  const csv = lines.join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kashio-tax-summary-${year}.csv"`,
    },
  });
}
