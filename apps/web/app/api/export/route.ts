import { db } from "../../../lib/db";
import { mapExportRow } from "../../../lib/export/mapExportRow";
import { getUser } from "../../../lib/auth";

export async function GET() {
  const userId = await getUser();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const candidates = await db.deductionCandidate.findMany({
    where:   { status: "CONFIRMED", userId },
    include: { transaction: true },
    orderBy: { transaction: { date: "asc" } },
  });

  if (candidates.length === 0) {
    return Response.json({ error: "No confirmed deductions to export." }, { status: 404 });
  }

  const year = new Date().getFullYear();

  const headers = ["Date", "Merchant", "Description", "Category", "Amount (AUD)"];

  const rows = candidates.map((c) => {
    const row = mapExportRow(c);
    return [row.date, row.merchant, row.description, row.category, row.amount.toFixed(2)];
  });

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kashio-deductions-${year}.csv"`,
    },
  });
}
