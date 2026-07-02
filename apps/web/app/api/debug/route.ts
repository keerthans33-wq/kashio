import { getUser } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getUser();
  if (!userId) return NextResponse.json({ userId: null, message: "No session on server" });

  const myTransactions  = await db.transaction.count({ where: { userId } });
  const myCandidates    = await db.deductionCandidate.count({ where: { userId } });
  const allTransactions = await db.transaction.count();

  const userBreakdown = await db.transaction.groupBy({
    by: ["userId"],
    _count: { userId: true },
  });

  // Health check: any trigger on auth.users can block sign-up if it throws.
  // This query surfaces them so we know immediately if something dangerous is wired up.
  let dangerousTriggers: { trigger_name: string; event_manipulation: string; action_statement: string }[] = [];
  try {
    const rows = await db.$queryRaw<{ trigger_name: string; event_manipulation: string; action_statement: string }[]>`
      SELECT trigger_name, event_manipulation, action_statement
      FROM information_schema.triggers
      WHERE event_object_schema = 'auth'
        AND event_object_table  = 'users'
    `;
    dangerousTriggers = rows;
  } catch {
    // Non-fatal — user may not have SELECT on information_schema.triggers
  }

  return NextResponse.json({
    userId,
    myTransactions,
    myCandidates,
    allTransactions,
    userBreakdown,
    dangerousTriggers,
    ...(dangerousTriggers.length > 0 && {
      WARNING: `${dangerousTriggers.length} trigger(s) on auth.users detected — these can block sign-up if they throw. Check dangerousTriggers.`,
    }),
  });
}

export async function DELETE() {
  const userId = await getUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.deductionCandidate.deleteMany({ where: { userId } });
  await db.transaction.deleteMany({ where: { userId } });
  await db.importBatch.deleteMany({ where: { userId } });

  return NextResponse.json({ ok: true });
}
