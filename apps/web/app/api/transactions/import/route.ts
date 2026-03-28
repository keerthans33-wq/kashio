import { NextRequest, NextResponse } from "next/server";
import { normalizeMerchant } from "../../../../lib/normalizeMerchant";
import { parseDate } from "../../../../lib/importRules";
import { runImportPipeline } from "../../../../lib/importPipeline";

export async function POST(req: NextRequest) {
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

  const rows: { date: string; description: string; normalizedMerchant: string; amount: number }[] =
    [];

  for (const t of raw) {
    if (typeof t !== "object" || t === null) {
      return NextResponse.json({ error: "Invalid transaction format." }, { status: 400 });
    }

    const { date, description, amount } = t as Record<string, unknown>;

    // Re-validate every field server-side. The client already validates,
    // but this ensures hand-crafted requests cannot bypass those checks.

    const parsedDate = parseDate(date);
    if (!parsedDate) {
      return NextResponse.json(
        { error: `Invalid date: "${date}". Expected YYYY-MM-DD.` },
        { status: 400 },
      );
    }

    if (typeof description !== "string" || !description.trim()) {
      return NextResponse.json({ error: "Missing or empty description." }, { status: 400 });
    }

    if (typeof amount !== "number" || !Number.isFinite(amount)) {
      return NextResponse.json(
        { error: `Invalid amount: "${amount}".` },
        { status: 400 },
      );
    }

    rows.push({
      date: parsedDate,
      description: description.trim(),
      normalizedMerchant: normalizeMerchant(description.trim()),
      amount,
    });
  }

  try {
    const result = await runImportPipeline(rows, fileName);
    return NextResponse.json({
      inserted: result.inserted,
      duplicates: result.duplicates,
      batchId: result.batchId,
    });
  } catch (err) {
    console.error("DB error during import:", err);
    return NextResponse.json(
      { error: "Could not save transactions. The database may be unavailable." },
      { status: 500 },
    );
  }
}
