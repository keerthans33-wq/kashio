import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { getUser } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const batches = await db.importBatch.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fileName: true,
      insertedCount: true,
      source: true,
      createdAt: true,
    },
  });
  return NextResponse.json(batches);
}

export async function DELETE() {
  const userId = await getUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.deductionCandidate.deleteMany({ where: { userId } });
  await db.transaction.deleteMany({ where: { userId } });
  await db.importBatch.deleteMany({ where: { userId } });
  return NextResponse.json({ ok: true });
}
