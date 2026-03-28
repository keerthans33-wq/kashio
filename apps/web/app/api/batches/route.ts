import { NextResponse } from "next/server";
import { db } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const batches = await db.importBatch.findMany({
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
  await db.deductionCandidate.deleteMany({});
  await db.transaction.deleteMany({});
  await db.importBatch.deleteMany({});
  return NextResponse.json({ ok: true });
}
