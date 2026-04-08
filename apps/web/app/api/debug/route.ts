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

  const distinctUserIds = await db.transaction.groupBy({
    by: ["userId"],
    _count: { userId: true },
  });

  // Check the actual unique constraints on the Transaction table in production
  const constraints = await db.$queryRaw<{ conname: string; def: string }[]>`
    SELECT conname, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conrelid = '"Transaction"'::regclass
    AND contype = 'u'
  `;

  // Check pending migrations
  const migrations = await db.$queryRaw<{ migration_name: string; finished_at: Date | null }[]>`
    SELECT migration_name, finished_at
    FROM "_prisma_migrations"
    ORDER BY finished_at DESC
    LIMIT 10
  `;

  return NextResponse.json({ userId, candidates, transactions, allTransactions, distinctUserIds, constraints, migrations });
}

export async function DELETE() {
  const userId = await getUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.deductionCandidate.deleteMany({ where: { userId } });
  await db.transaction.deleteMany({ where: { userId } });
  await db.importBatch.deleteMany({ where: { userId } });

  return NextResponse.json({ ok: true, message: "All data cleared" });
}
