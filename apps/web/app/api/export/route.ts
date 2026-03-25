import { NextResponse } from "next/server";
import { db } from "../../../lib/db";

export async function GET() {
  const candidates = await db.deductionCandidate.findMany({
    where:   { status: "CONFIRMED" },
    include: { transaction: true },
    orderBy: { transaction: { date: "asc" } },
  });

  if (candidates.length === 0) {
    return NextResponse.json({ error: "No confirmed candidates to export." }, { status: 404 });
  }

  const header = ["Date", "Merchant", "Amount", "Category"];
  const rows   = candidates.map((c) => [
    c.transaction.date,
    `"${c.transaction.normalizedMerchant.replace(/"/g, '""')}"`,
    Math.abs(c.transaction.amount).toFixed(2),
    `"${c.category.replace(/"/g, '""')}"`,
  ]);

  const csv  = [header, ...rows].map((r) => r.join(",")).join("\n");
  const year = new Date().getFullYear();

  return new Response(csv, {
    headers: {
      "Content-Type":        "text/csv",
      "Content-Disposition": `attachment; filename="kashio-deductions-${year}.csv"`,
    },
  });
}
