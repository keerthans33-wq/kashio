import { getUser } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getUser();
  if (!userId) return NextResponse.json({ userId: null, message: "No session on server" });

  const candidates = await db.deductionCandidate.count({ where: { userId } });
  const transactions = await db.transaction.count({ where: { userId } });

  return NextResponse.json({ userId, candidates, transactions });
}
