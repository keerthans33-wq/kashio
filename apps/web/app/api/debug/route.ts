import { getUser } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getUser();
  if (!userId) return NextResponse.json({ userId: null, message: "No session on server" });

  const candidates  = await db.deductionCandidate.count({ where: { userId } });
  const transactions = await db.transaction.count({ where: { userId } });
  const allTransactions = await db.transaction.count();
  const allCandidates   = await db.deductionCandidate.count();

  // Show distinct userIds to spot orphaned empty-string userId data
  const distinctUserIds = await db.transaction.groupBy({
    by: ["userId"],
    _count: { userId: true },
  });

  return NextResponse.json({ userId, candidates, transactions, allTransactions, allCandidates, distinctUserIds });
}

export async function DELETE() {
  const userId = await getUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.deductionCandidate.deleteMany({ where: { userId } });
  await db.transaction.deleteMany({ where: { userId } });
  await db.importBatch.deleteMany({ where: { userId } });

  return NextResponse.json({ ok: true, message: "All data cleared" });
}
