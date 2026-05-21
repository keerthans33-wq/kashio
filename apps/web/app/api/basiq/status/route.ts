// GET /api/basiq/status
// Returns whether the current user has a linked bank connection.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getUser } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const connection = await db.bankConnection.findUnique({
    where:  { userId_provider: { userId, provider: "basiq" } },
    select: { status: true, institutionName: true },
  });
  const connected = connection?.status === "active";
  return NextResponse.json({
    connected,
    institutionName: connected ? (connection?.institutionName ?? null) : null,
  });
}
