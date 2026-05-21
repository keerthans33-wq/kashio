// POST /api/basiq/disconnect
//
// Marks the user's bank connection as disconnected.
// The BankConnection record is kept (preserves basiqUserId for reconnect),
// but status is set to "disconnected" so sync is blocked until they reconnect.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getUser } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const userId = await getUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const connection = await db.bankConnection.findUnique({
    where: { userId_provider: { userId, provider: "basiq" } },
  });

  if (!connection) {
    return NextResponse.json({ error: "No bank connection found." }, { status: 404 });
  }

  await db.bankConnection.update({
    where: { id: connection.id },
    data:  { status: "disconnected" },
  });

  return NextResponse.json({ disconnected: true });
}
