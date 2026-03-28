// POST /api/basiq/transactions
//
// Fetches the user's transactions from Basiq, maps them into our format,
// and saves them to the database exactly like the CSV import does.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getTransactions } from "../../../../lib/basiq/client";
import { mapBasiqTransaction } from "../../../../lib/basiq/mapTransaction";
import { detectDeduction } from "../../../../lib/rules";

export const dynamic = "force-dynamic";

export async function POST() {
  // Look up the stored Basiq user ID.
  const connection = await db.basiqConnection.findFirst();
  if (!connection) {
    return NextResponse.json(
      { error: "No bank connected. Go to Connect and link your bank first." },
      { status: 400 },
    );
  }

  let rawTransactions;
  try {
    rawTransactions = await getTransactions(connection.basiqUserId);
  } catch (err) {
    console.error("Basiq fetch error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not fetch transactions from Basiq." },
      { status: 500 },
    );
  }

  // Map Basiq transactions into our format, dropping any that can't be parsed.
  const rows = rawTransactions
    .map(mapBasiqTransaction)
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length === 0) {
    return NextResponse.json({ inserted: 0, duplicates: 0, invalid: rawTransactions.length });
  }

  try {
    // Create a batch record so this import appears in "Previously imported"
    // and can be cleared like any CSV import.
    const today = new Date().toLocaleDateString("en-AU", {
      day: "numeric", month: "short", year: "numeric",
    });
    const batch = await db.importBatch.create({
      data: { fileName: `Basiq — bank connection (${today})`, insertedCount: 0 },
    });

    const result = await db.transaction.createMany({
      data: rows.map((r) => ({ ...r, importBatchId: batch.id })),
      skipDuplicates: true,
    });
    const inserted = result.count;

    await db.importBatch.update({
      where: { id: batch.id },
      data: { insertedCount: inserted },
    });

    // Run the saved transactions through the deduction rules engine.
    const savedTransactions = await db.transaction.findMany({
      where: {
        OR: rows.map((r) => ({
          date: r.date,
          description: r.description,
          amount: r.amount,
        })),
      },
    });

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

    if (candidates.length > 0) {
      await db.deductionCandidate.createMany({ data: candidates, skipDuplicates: true });
    }

    return NextResponse.json({
      inserted,
      duplicates: rows.length - inserted,
      invalid: rawTransactions.length - rows.length,
      flagged: candidates.length,
    });
  } catch (err) {
    console.error("DB error during Basiq import:", err);
    return NextResponse.json(
      { error: "Could not save transactions. The database may be unavailable." },
      { status: 500 },
    );
  }
}
