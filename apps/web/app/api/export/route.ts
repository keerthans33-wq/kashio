import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { mapExportRow } from "../../../lib/export/mapExportRow";

export async function GET() {
  const candidates = await db.deductionCandidate.findMany({
    where:   { status: "CONFIRMED" },
    include: { transaction: true },
    orderBy: { transaction: { date: "asc" } },
  });

  if (candidates.length === 0) {
    return NextResponse.json({ error: "No confirmed candidates to export." }, { status: 404 });
  }

  const header = ["Date", "Merchant", "Description", "Category", "Amount"];
  const rows   = candidates.map((c) => {
    const row = mapExportRow(c);
    return [
      row.date,
      `"${row.merchant.replace(/"/g, '""')}"`,
      `"${row.description.replace(/"/g, '""')}"`,
      `"${row.category.replace(/"/g, '""')}"`,
      row.amount.toFixed(2),
    ];
  });

  const total = candidates.reduce((sum, c) => sum + Math.abs(c.transaction.amount), 0);
  const totalRow = ["", "", "", "Total", total.toFixed(2)];

  const csv  = [header, ...rows, totalRow].map((r) => r.join(",")).join("\n");
  const year = new Date().getFullYear();

  return new Response(csv, {
    headers: {
      "Content-Type":        "text/csv",
      "Content-Disposition": `attachment; filename="kashio-deductions-${year}.csv"`,
    },
  });
}
