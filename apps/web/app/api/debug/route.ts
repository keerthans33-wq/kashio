import { getUser } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getUser();
  if (!userId) return NextResponse.json({ userId: null, message: "No session on server" });

  const candidates   = await db.deductionCandidate.count({ where: { userId } });
  const transactions = await db.transaction.count({ where: { userId } });
  const allTransactions = await db.transaction.count();

  // Get ALL constraints AND indexes on Transaction table
  const allConstraints = await db.$queryRaw<{ conname: string; contype: string; def: string }[]>`
    SELECT conname, contype, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conrelid = '"Transaction"'::regclass
  `;

  const allIndexes = await db.$queryRaw<{ indexname: string; indexdef: string }[]>`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'Transaction'
  `;

  return NextResponse.json({ userId, candidates, transactions, allTransactions, allConstraints, allIndexes });
}

export async function DELETE() {
  const userId = await getUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.deductionCandidate.deleteMany({ where: { userId } });
  await db.transaction.deleteMany({ where: { userId } });
  await db.importBatch.deleteMany({ where: { userId } });

  return NextResponse.json({ ok: true, message: "All data cleared" });
}
