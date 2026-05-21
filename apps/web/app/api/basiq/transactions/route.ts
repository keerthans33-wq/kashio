// POST /api/basiq/transactions
//
// Fetches the user's accounts and transactions from Basiq, normalises them,
// and saves them using the bank-specific import pipeline.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getTransactions, getAccounts, isAccessDeniedError } from "../../../../lib/basiq/client";
import { fromBasiq } from "../../../../lib/ingestion/fromBasiq";
import { runBasiqImportPipeline } from "../../../../lib/importPipeline";
import { getUserWithType } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getUserWithType();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: userId, userType } = user;

  const body = await req.json().catch(() => ({}));
  const from: string | undefined = typeof body.from === "string" ? body.from : undefined;

  const connection = await db.bankConnection.findUnique({
    where: { userId_provider: { userId, provider: "basiq" } },
  });
  if (!connection || connection.status !== "active") {
    return NextResponse.json(
      { error: "No bank connected. Go to Import and link your bank first." },
      { status: 400 },
    );
  }
  if (!connection.basiqUserId) {
    return NextResponse.json(
      { error: "Bank connection is missing a Basiq user ID." },
      { status: 500 },
    );
  }

  // Fetch transactions and accounts in parallel.
  let rawTransactions;
  let accounts;
  try {
    [rawTransactions, accounts] = await Promise.all([
      getTransactions(connection.basiqUserId, from),
      getAccounts(connection.basiqUserId),
    ]);
  } catch (err) {
    console.error("Basiq fetch error:", err);

    const accessDenied = isAccessDeniedError(err);
    const userMessage = accessDenied
      ? "Bank connections are currently unavailable. Please upload a CSV file instead."
      : err instanceof Error
        ? err.message
        : "Could not fetch transactions from Basiq.";

    await db.bankSyncLog.create({
      data: {
        userId,
        connectionId: connection.id,
        status:      "error",
        message:     err instanceof Error ? err.message : "Basiq API fetch failed",
        completedAt: new Date(),
      },
    }).catch(() => { /* non-fatal */ });

    return NextResponse.json(
      { error: userMessage },
      { status: accessDenied ? 503 : 500 },
    );
  }

  // Populate institutionName from the first account if not already set.
  if (accounts.length > 0 && !connection.institutionName) {
    const name =
      accounts[0].institution?.shortName ??
      accounts[0].institution?.name ??
      null;
    if (name) {
      await db.bankConnection.update({
        where: { id: connection.id },
        data:  { institutionName: name },
      }).catch(() => { /* non-fatal — missing label is not a blocker */ });
    }
  }

  // Normalise raw Basiq rows into our format, silently dropping unmappable ones.
  const rows = rawTransactions
    .map(fromBasiq)
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const today = new Date().toLocaleDateString("en-AU", {
    day: "numeric", month: "short", year: "numeric",
  });

  try {
    const result = await runBasiqImportPipeline(
      rows,
      `Basiq — bank connection (${today})`,
      connection.id,
      userId,
      userType,
    );
    return NextResponse.json({
      inserted:  result.inserted,
      duplicates: result.duplicates,
      invalid:   rawTransactions.length - rows.length,
      flagged:   result.flagged,
      totalValue: result.totalValue,
    });
  } catch (err) {
    console.error("DB error during Basiq import:", err);
    await db.bankSyncLog.create({
      data: {
        userId,
        connectionId: connection.id,
        status:      "error",
        message:     err instanceof Error ? err.message : "Import pipeline error",
        completedAt: new Date(),
      },
    }).catch(() => { /* non-fatal */ });
    return NextResponse.json(
      { error: "Could not save transactions. The database may be unavailable." },
      { status: 500 },
    );
  }
}
