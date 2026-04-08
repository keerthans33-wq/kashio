import { getUser } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getUser();
  if (!userId) return NextResponse.json({ userId: null, message: "No session on server" });

  const candidates = await db.deductionCandidate.count({ where: { userId } });
  const transactions = await db.transaction.count({ where: { userId } });

  // Also show total records in DB (all users) to spot orphaned data
  const allTransactions = await db.transaction.count();
  const allCandidates   = await db.deductionCandidate.count();

  return NextResponse.json({ userId, candidates, transactions, allTransactions, allCandidates });
}

// DELETE /api/debug — wipes ALL transactions and candidates from the DB
// Use this to clear orphaned data from before auth was fixed
export async function DELETE() {
  const userId = await getUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.deductionCandidate.deleteMany({});
  await db.transaction.deleteMany({});
  await db.importBatch.deleteMany({});

  return NextResponse.json({ ok: true, message: "All data cleared" });
}
