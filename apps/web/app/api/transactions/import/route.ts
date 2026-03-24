import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { normalizeMerchant } from "../../../../lib/normalizeMerchant";
import { parseDate } from "../../../../lib/importRules";
import { detectDeduction } from "../../../../lib/rules";

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

  const raw = (body as { transactions: unknown[] }).transactions;
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

  let result: { count: number };
  try {
    result = await db.transaction.createMany({ data: rows, skipDuplicates: true });
  } catch (err) {
    console.error("DB write failed:", err);
    return NextResponse.json(
      { error: "Could not save transactions. The database may be unavailable." },
      { status: 500 },
    );
  }

  // Fetch the saved transactions (includes both new and pre-existing duplicates)
  // so we can run detection on everything that was submitted.
  const savedTransactions = await db.transaction.findMany({
    where: {
      OR: rows.map((r) => ({
        date: r.date,
        description: r.description,
        amount: r.amount,
      })),
    },
  });

  // Run each transaction through the rules engine.
  const candidates = savedTransactions
    .map((t) => {
      const match = detectDeduction({
        description: t.description,
        normalizedMerchant: t.normalizedMerchant,
        amount: t.amount,
      });
      if (!match) return null;
      return {
        transactionId: t.id,
        category: match.category,
        confidence: match.confidence,
        reason: match.reason,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  // Store candidates. skipDuplicates means transactions that already have
  // a candidate (transactionId is unique) are safely skipped.
  if (candidates.length > 0) {
    await db.deductionCandidate.createMany({ data: candidates, skipDuplicates: true });
  }

  return NextResponse.json({
    inserted: result.count,
    duplicates: rows.length - result.count,
  });
}
