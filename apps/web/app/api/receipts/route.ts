import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function makeStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  const userId = await getUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const receipts = await db.receipt.findMany({
    where:   { userId },
    select:  { id: true, fileName: true, mimeType: true, comment: true, createdAt: true, filePath: true },
    orderBy: { createdAt: "desc" },
  });

  // Generate signed URLs for all receipts in one batch (1-hour TTL).
  // Bucket is private — direct storage paths cannot be displayed without a signed URL.
  let signedUrls: (string | null)[] = receipts.map(() => null);
  if (receipts.length > 0) {
    try {
      const storage = makeStorageClient();
      const { data } = await storage.storage
        .from("receipts")
        .createSignedUrls(receipts.map((r) => r.filePath), 3600);
      if (data) {
        signedUrls = data.map((item) => item.signedUrl ?? null);
      }
    } catch (err) {
      console.error("[receipts/list] signed URL generation failed:", err);
      // Return receipts without signed URLs rather than failing the whole request.
    }
  }

  return NextResponse.json({
    receipts: receipts.map((r, i) => ({
      id:        r.id,
      fileName:  r.fileName,
      mimeType:  r.mimeType,
      comment:   r.comment,
      createdAt: r.createdAt,
      signedUrl: signedUrls[i] ?? null,
    })),
  });
}
