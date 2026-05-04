import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const receipts = await db.receipt.findMany({
    where:   { userId },
    select:  { id: true, fileName: true, mimeType: true, comment: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ receipts });
}
