import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function makeStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const receipt = await db.receipt.findUnique({
    where:  { id },
    select: { userId: true, filePath: true },
  });

  if (!receipt)              return NextResponse.json({ error: "Not found"  }, { status: 404 });
  if (receipt.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Remove from storage first — if this fails we bail before touching the DB.
  const storage = makeStorageClient();
  const { error: storageErr } = await storage.storage.from("receipts").remove([receipt.filePath]);
  if (storageErr) {
    console.error("[receipts/delete] storage error:", storageErr.message);
    return NextResponse.json({ error: "Storage delete failed" }, { status: 500 });
  }

  // Delete DB row + safe decrement (updateMany ignores rows where count is already 0).
  await Promise.all([
    db.receipt.delete({ where: { id } }),
    db.userProfile.updateMany({
      where: { userId, receiptCount: { gt: 0 } },
      data:  { receiptCount: { decrement: 1 } },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
