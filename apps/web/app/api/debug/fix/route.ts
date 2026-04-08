import { getUser } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// One-time fix: drop the old unique index that doesn't include userId.
// This index was created without userId, blocking imports for multiple users.
export async function POST() {
  const userId = await getUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await db.$executeRaw`DROP INDEX IF EXISTS "Transaction_date_description_amount_key"`;
    return NextResponse.json({ ok: true, message: "Old index dropped successfully" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
