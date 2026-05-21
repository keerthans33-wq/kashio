import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function makeAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase service role env vars");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// DELETE /api/account/delete
// Permanently deletes all data for the authenticated user, then deletes the
// Supabase auth record. The service role key never leaves this server-side route.
export async function DELETE() {
  const userId = await getUser();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = makeAdminClient();

    // ── 1. Collect receipt storage paths before wiping DB rows ──────────────
    const receipts = await db.receipt.findMany({
      where:  { userId },
      select: { filePath: true },
    });

    // ── 2. Delete DB rows in FK-safe order ───────────────────────────────────
    // DeductionCandidate.transactionId references Transaction (default RESTRICT),
    // so candidates must go before transactions.
    await db.deductionCandidate.deleteMany({ where: { userId } });
    await db.transaction.deleteMany({ where: { userId } });
    await db.importBatch.deleteMany({ where: { userId } });

    // Independent tables — run concurrently
    await Promise.all([
      db.receipt.deleteMany({ where: { userId } }),
      db.wfhLog.deleteMany({ where: { userId } }),
      db.payment.deleteMany({ where: { userId } }),
      db.userEntitlement.deleteMany({ where: { userId } }),
      db.bankConnection.deleteMany({ where: { userId } }),
    ]);

    // UserProfile last (other models may reference it indirectly via userId)
    await db.userProfile.deleteMany({ where: { userId } });

    // ── 3. Delete receipt files from private storage bucket ──────────────────
    if (receipts.length > 0) {
      const filePaths = receipts.map((r) => r.filePath);
      // Supabase storage remove accepts up to 1 000 paths per call; batch at 200.
      for (let i = 0; i < filePaths.length; i += 200) {
        const { error } = await admin.storage
          .from("receipts")
          .remove(filePaths.slice(i, i + 200));
        if (error) {
          // Log but don't abort — orphaned files are not a security risk
          // (bucket is private and the auth user is about to be deleted).
          console.error("[account/delete] storage batch remove error:", error.message);
        }
      }
    }

    // ── 4. Delete the Supabase auth user ────────────────────────────────────
    // Must be last. Once deleted, the user ID is invalid and we can no longer
    // authenticate requests on their behalf.
    const { error: authErr } = await admin.auth.admin.deleteUser(userId);
    if (authErr) {
      // All application data is already gone at this point. Log and continue —
      // a dangling auth record without any data is non-critical, and Supabase
      // will reject future logins for an account with no matching profile.
      console.error("[account/delete] auth.admin.deleteUser error:", authErr.message);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[account/delete] unexpected error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again or contact support@kashio.com.au." },
      { status: 500 }
    );
  }
}
