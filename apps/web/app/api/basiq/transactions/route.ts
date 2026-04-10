// POST /api/basiq/transactions
//
// Fetches the user's transactions from Basiq, maps them into our format,
// and saves them to the database exactly like the CSV import does.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getTransactions } from "../../../../lib/basiq/client";
import { fromBasiq } from "../../../../lib/ingestion/fromBasiq";
import { runImportPipeline } from "../../../../lib/importPipeline";
import { getUserWithType } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getUserWithType();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: userId, userType } = user;

  // Look up the stored Basiq user ID.
  const connection = await db.basiqConnection.findUnique({ where: { userId } });
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
    .map(fromBasiq)
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length === 0) {
    return NextResponse.json({ inserted: 0, duplicates: 0, invalid: rawTransactions.length, flagged: 0 });
  }

  const today = new Date().toLocaleDateString("en-AU", {
    day: "numeric", month: "short", year: "numeric",
  });

  try {
    const result = await runImportPipeline(rows, `Basiq — bank connection (${today})`, "BASIQ", userId, userType);
    return NextResponse.json({
      inserted: result.inserted,
      duplicates: result.duplicates,
      invalid: rawTransactions.length - rows.length,
      flagged: result.flagged,
    });
  } catch (err) {
    console.error("DB error during Basiq import:", err);
    return NextResponse.json(
      { error: "Could not save transactions. The database may be unavailable." },
      { status: 500 },
    );
  }
}
