import { NextRequest, NextResponse } from "next/server";
import { fromCsvRow } from "../../../../lib/ingestion/fromCsvRow";
import { runImportPipeline } from "../../../../lib/importPipeline";
import { getUserWithType } from "../../../../lib/auth";

export async function POST(req: NextRequest) {
  const user = await getUserWithType();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: userId, userType } = user;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !Array.isArray((body as { transactions?: unknown }).transactions)
  ) {
    return NextResponse.json({ error: "No transactions provided." }, { status: 400 });
  }

  const raw = (body as { transactions: unknown[]; fileName?: unknown }).transactions;
  const fileName =
    typeof (body as { fileName?: unknown }).fileName === "string"
      ? ((body as { fileName: string }).fileName.trim() || "unknown.csv")
      : "unknown.csv";

  if (raw.length === 0) {
    return NextResponse.json({ error: "No transactions provided." }, { status: 400 });
  }

  // Map each raw row through the CSV adapter. Return the first validation error encountered.
  const rows = [];
  for (const t of raw) {
    const { row, error } = fromCsvRow(t);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    rows.push(row);
  }

  try {
    const result = await runImportPipeline(rows, fileName, "CSV", userId, userType);
    return NextResponse.json({
      inserted:   result.inserted,
      duplicates: result.duplicates,
      flagged:    result.flagged,
      totalValue: result.totalValue,
      batchId:    result.batchId,
    });
  } catch (err) {
    console.error("DB error during import:", err);
    return NextResponse.json(
      { error: "Could not save transactions. The database may be unavailable." },
      { status: 500 },
    );
  }
}
