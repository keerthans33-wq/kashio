import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getUser } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const batch = await db.importBatch.findUnique({ where: { id, userId } });
  if (!batch) {
    return NextResponse.json({ error: "Batch not found." }, { status: 404 });
  }

  // Delete candidates first (no cascade set on that relation), then transactions, then the batch.
  const transactions = await db.transaction.findMany({
    where: { importBatchId: id },
    select: { id: true },
  });
  const txIds = transactions.map((t) => t.id);

  await db.deductionCandidate.deleteMany({ where: { transactionId: { in: txIds } } });
  await db.transaction.deleteMany({ where: { id: { in: txIds } } });
  await db.importBatch.delete({ where: { id } });

  return NextResponse.json({ deleted: txIds.length });
}
