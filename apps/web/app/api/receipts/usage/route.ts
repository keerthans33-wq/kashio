import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { fetchUserPlan, isProUser, FREE_RECEIPT_LIMIT, PRO_RECEIPT_LIMIT } from "@/lib/plan";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [plan, count] = await Promise.all([
    fetchUserPlan(userId),
    db.receipt.count({ where: { userId } }),
  ]);

  const isPro  = isProUser(plan);
  const limit  = isPro ? PRO_RECEIPT_LIMIT : FREE_RECEIPT_LIMIT;

  return NextResponse.json({ count, limit, isPro });
}
